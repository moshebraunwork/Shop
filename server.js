'use strict';
/*
 * Shopping List — self-hosted server
 * Zero dependencies. Node 18+.
 *
 * Env vars:
 *   PORT            (default 3000)
 *   HOST            (default 0.0.0.0)
 *   DATA_DIR        (default ./data)   where db.json lives
 *   APP_PASSWORD    (optional)         require a password to use the app
 *   TRUST_PROXY     (optional, "1")    trust X-Forwarded-For / -Proto from a reverse proxy
 *   COOKIE_SECURE   (optional, "1")    force the Secure flag on the session cookie
 */

const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const DB_FILE = path.join(DATA_DIR, 'db.json');
const SECRET_FILE = path.join(DATA_DIR, '.secret');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PASSWORD = process.env.APP_PASSWORD || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const COOKIE_SECURE = process.env.COOKIE_SECURE === '1';
const COOKIE = 'sl_session';
const SESSION_DAYS = 180;
const MAX_BODY = 64 * 1024;

const LIMITS = { name: 120, qty: 40, note: 300, listName: 60, lists: 50, items: 1000, history: 2000 };
const CATEGORIES = new Set([
  'produce', 'bakery', 'dairy', 'meat', 'frozen', 'pantry', 'snacks',
  'drinks', 'household', 'personal', 'baby', 'pets', 'other',
]);
const ID_RE = /^[A-Za-z0-9_-]{6,40}$/;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------------------------------------------------------------- storage */

let db;

function newId() { return crypto.randomBytes(9).toString('base64url'); }

function newList(name, id) {
  return { id: id || newId(), name, createdAt: Date.now(), items: [] };
}

function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  let data = null;
  if (fs.existsSync(DB_FILE)) {
    try {
      data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      fs.copyFileSync(DB_FILE, DB_FILE + '.bak'); // last known-good copy at every start
    } catch (err) {
      const bad = `${DB_FILE}.corrupt-${Date.now()}`;
      fs.copyFileSync(DB_FILE, bad);
      console.error(`db.json could not be read (${err.message}). Saved it as ${bad}.`);
      if (fs.existsSync(DB_FILE + '.bak')) {
        try { data = JSON.parse(fs.readFileSync(DB_FILE + '.bak', 'utf8')); console.error('Restored from db.json.bak'); }
        catch { data = null; }
      }
    }
  }
  db = data && typeof data === 'object' ? data : {};
  db.instance = db.instance || newId();
  db.version = Number.isInteger(db.version) ? db.version : 0;
  db.lists = Array.isArray(db.lists) ? db.lists : [];
  db.history = db.history && typeof db.history === 'object' ? db.history : {};
  if (!db.lists.length) db.lists.push(newList('Groceries'));
  for (const l of db.lists) if (!Array.isArray(l.items)) l.items = [];
  writeSync();
}

let saveTimer = null;
let saving = false;
let dirty = false;

function scheduleSave(delay = 150) {
  dirty = true;
  if (!saveTimer) saveTimer = setTimeout(flush, delay);
}

async function flush() {
  saveTimer = null;
  if (saving) { scheduleSave(); return; }
  if (!dirty) return;
  saving = true;
  dirty = false;
  const tmp = DB_FILE + '.tmp';
  try {
    await fsp.writeFile(tmp, JSON.stringify(db));
    await fsp.rename(tmp, DB_FILE); // atomic replace
  } catch (err) {
    console.error('Saving failed, retrying in 2s:', err.message);
    scheduleSave(2000);
  } finally {
    saving = false;
  }
}

function writeSync() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
  dirty = false;
}

function commit() {
  db.version += 1;
  scheduleSave();
  broadcast();
}

/* ------------------------------------------------------------ live events */

const streams = new Set();

function broadcast() {
  const msg = `event: version\ndata: ${db.version}\n\n`;
  for (const res of streams) res.write(msg);
}

setInterval(() => { for (const res of streams) res.write(': ping\n\n'); }, 25000).unref();

function openEvents(req, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // tell nginx not to buffer
  });
  res.write(`retry: 3000\nevent: version\ndata: ${db.version}\n\n`);
  streams.add(res);
  req.on('close', () => streams.delete(res));
}

/* ------------------------------------------------------------------- auth */

function loadSecret() {
  try {
    const s = fs.readFileSync(SECRET_FILE, 'utf8').trim();
    if (s.length >= 32) return s;
  } catch { /* create below */ }
  const s = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, s, { mode: 0o600 });
  return s;
}

let SECRET = '';

function sign(value) {
  // Password is part of the key, so changing APP_PASSWORD signs everyone out.
  return crypto.createHmac('sha256', SECRET + '\0' + PASSWORD).update(value).digest('base64url');
}

function makeToken() {
  const expires = String(Date.now() + SESSION_DAYS * 86400e3);
  return `${expires}.${sign(expires)}`;
}

function tokenValid(token) {
  if (!token || typeof token !== 'string') return false;
  const [expires, mac] = token.split('.');
  if (!expires || !mac || Number(expires) < Date.now()) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(expires));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function parseCookies(req) {
  const out = {};
  for (const part of (req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isAuthed(req) {
  return !PASSWORD || tokenValid(parseCookies(req)[COOKIE]);
}

function isHttps(req) {
  return COOKIE_SECURE || req.socket.encrypted || (TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https');
}

function clientIp(req) {
  if (TRUST_PROXY && req.headers['x-forwarded-for']) return req.headers['x-forwarded-for'].split(',')[0].trim();
  return req.socket.remoteAddress || '?';
}

const failures = new Map(); // ip -> { count, resetAt }

function checkRateLimit(ip) {
  const f = failures.get(ip);
  if (f && f.resetAt < Date.now()) failures.delete(ip);
  const cur = failures.get(ip);
  if (cur && cur.count >= 10) throw new HttpError(429, 'Too many wrong passwords. Try again in 15 minutes.');
}

function recordFailure(ip) {
  const f = failures.get(ip) || { count: 0, resetAt: Date.now() + 15 * 60e3 };
  f.count += 1;
  failures.set(ip, f);
}

function passwordMatches(given) {
  const a = crypto.createHash('sha256').update(String(given || '')).digest();
  const b = crypto.createHash('sha256').update(PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

function sessionCookie(req, value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isHttps(req) ? '; Secure' : ''}`;
}

/* ------------------------------------------------------------- validation */

function text(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

function category(v) { return CATEGORIES.has(v) ? v : 'other'; }

function pickId(v) { return typeof v === 'string' && ID_RE.test(v) ? v : newId(); }

function timestamp(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 && n < Date.now() + 86400e3 ? n : fallback;
}

/* ---------------------------------------------------------------- domain */

function findList(id) {
  const list = db.lists.find((l) => l.id === id);
  if (!list) throw new HttpError(404, 'That list no longer exists.');
  return list;
}

function remember(name, cat, bump) {
  const key = name.toLowerCase();
  const h = db.history[key] || { name, category: cat, count: 0, lastUsed: 0 };
  h.name = name;
  h.category = cat;
  if (bump) { h.count += 1; h.lastUsed = Date.now(); }
  db.history[key] = h;
  const keys = Object.keys(db.history);
  if (keys.length > LIMITS.history) {
    keys.sort((a, b) => db.history[a].lastUsed - db.history[b].lastUsed)
      .slice(0, keys.length - LIMITS.history)
      .forEach((k) => delete db.history[k]);
  }
}

function publicState() {
  const history = Object.entries(db.history)
    .map(([key, h]) => ({ key, ...h }))
    .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
    .slice(0, 500);
  return { instance: db.instance, version: db.version, lists: db.lists, history };
}

const handlers = {
  createList(_p, body) {
    const id = pickId(body.id);
    if (db.lists.some((l) => l.id === id)) return; // replayed request
    if (db.lists.length >= LIMITS.lists) throw new HttpError(400, `You can have up to ${LIMITS.lists} lists.`);
    const name = text(body.name, LIMITS.listName);
    if (!name) throw new HttpError(400, 'Give the list a name.');
    db.lists.push(newList(name, id));
    commit();
  },

  renameList([listId], body) {
    const list = findList(listId);
    const name = text(body.name, LIMITS.listName);
    if (!name) throw new HttpError(400, 'Give the list a name.');
    list.name = name;
    commit();
  },

  deleteList([listId]) {
    if (!db.lists.some((l) => l.id === listId)) return;
    if (db.lists.length === 1) throw new HttpError(400, 'Keep at least one list.');
    db.lists = db.lists.filter((l) => l.id !== listId);
    commit();
  },

  addItem([listId], body) {
    const list = findList(listId);
    const id = pickId(body.id);
    if (list.items.some((i) => i.id === id)) return; // replayed request
    if (list.items.length >= LIMITS.items) throw new HttpError(400, `A list can hold up to ${LIMITS.items} items.`);
    const name = text(body.name, LIMITS.name);
    if (!name) throw new HttpError(400, 'Type an item name.');
    const now = Date.now();
    const checked = body.checked === true;
    const item = {
      id,
      name,
      qty: text(body.qty, LIMITS.qty),
      note: text(body.note, LIMITS.note),
      category: category(body.category),
      checked,
      createdAt: timestamp(body.createdAt, now),
      updatedAt: now,
      checkedAt: checked ? timestamp(body.checkedAt, now) : null,
    };
    list.items.push(item);
    remember(item.name, item.category, true);
    commit();
  },

  updateItem([listId, itemId], body) {
    const list = findList(listId);
    const item = list.items.find((i) => i.id === itemId);
    if (!item) throw new HttpError(404, 'That item was removed on another device.');
    let learn = false;
    if ('name' in body) {
      const name = text(body.name, LIMITS.name);
      if (!name) throw new HttpError(400, 'Type an item name.');
      if (name !== item.name) { item.name = name; learn = true; }
    }
    if ('qty' in body) item.qty = text(body.qty, LIMITS.qty);
    if ('note' in body) item.note = text(body.note, LIMITS.note);
    if ('category' in body) {
      const c = category(body.category);
      if (c !== item.category) { item.category = c; learn = true; }
    }
    if ('checked' in body) {
      const checked = body.checked === true;
      if (checked !== item.checked) { item.checked = checked; item.checkedAt = checked ? Date.now() : null; }
    }
    item.updatedAt = Date.now();
    if (learn) remember(item.name, item.category, false);
    commit();
  },

  deleteItem([listId, itemId]) {
    const list = db.lists.find((l) => l.id === listId);
    if (!list || !list.items.some((i) => i.id === itemId)) return; // already gone
    list.items = list.items.filter((i) => i.id !== itemId);
    commit();
  },

  bulk([listId, action]) {
    const list = findList(listId);
    if (action === 'clear-checked') list.items = list.items.filter((i) => !i.checked);
    else if (action === 'clear-all') list.items = [];
    else if (action === 'uncheck-all') list.items.forEach((i) => { i.checked = false; i.checkedAt = null; });
    commit();
  },

  forget([key]) {
    if (!(key in db.history)) return;
    delete db.history[key];
    commit();
  },
};

const routes = [
  ['POST', /^\/api\/lists$/, handlers.createList],
  ['PATCH', /^\/api\/lists\/([^/]+)$/, handlers.renameList],
  ['DELETE', /^\/api\/lists\/([^/]+)$/, handlers.deleteList],
  ['POST', /^\/api\/lists\/([^/]+)\/items$/, handlers.addItem],
  ['PATCH', /^\/api\/lists\/([^/]+)\/items\/([^/]+)$/, handlers.updateItem],
  ['DELETE', /^\/api\/lists\/([^/]+)\/items\/([^/]+)$/, handlers.deleteItem],
  ['POST', /^\/api\/lists\/([^/]+)\/(clear-checked|uncheck-all|clear-all)$/, handlers.bulk],
  ['DELETE', /^\/api\/history\/([^/]+)$/, handlers.forget],
];

/* ------------------------------------------------------------------- http */

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy':
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; connect-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
};

function sendJson(res, status, obj, headers = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(body),
    ...headers,
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) tooBig = true;
      else chunks.push(c);
    });
    req.on('end', () => {
      if (tooBig) return reject(new HttpError(413, 'Request is too large.'));
      if (!chunks.length) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        resolve(v && typeof v === 'object' && !Array.isArray(v) ? v : {});
      } catch {
        reject(new HttpError(400, 'Request body is not valid JSON.'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
};

async function serveStatic(req, res, pathname) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return sendJson(res, 405, { error: 'Method not allowed' });
  let rel;
  try { rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname); }
  catch { return sendJson(res, 400, { error: 'Bad path' }); }
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) return sendJson(res, 404, { error: 'Not found' });
  let stat;
  try { stat = await fsp.stat(file); } catch { stat = null; }
  if (!stat || !stat.isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('Not found');
  }
  const ext = path.extname(file);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
    'Cache-Control': ext === '.woff2' || ext === '.png' ? 'public, max-age=604800' : 'no-cache',
  });
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}

async function handle(req, res) {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://local');
  const p = url.pathname;

  if (p === '/healthz') return sendJson(res, 200, { ok: true });
  if (!p.startsWith('/api/')) return serveStatic(req, res, p);

  try {
    if (p === '/api/session' && req.method === 'GET') {
      return sendJson(res, 200, { authRequired: !!PASSWORD, authenticated: isAuthed(req) });
    }
    if (p === '/api/login' && req.method === 'POST') {
      const ip = clientIp(req);
      checkRateLimit(ip);
      const body = await readBody(req);
      if (!PASSWORD || passwordMatches(body.password)) {
        failures.delete(ip);
        return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, makeToken(), SESSION_DAYS * 86400) });
      }
      recordFailure(ip);
      throw new HttpError(401, 'That password is wrong.');
    }
    if (p === '/api/logout' && req.method === 'POST') {
      return sendJson(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
    }

    if (!isAuthed(req)) throw new HttpError(401, 'Sign in to continue.');

    if (p === '/api/state' && req.method === 'GET') return sendJson(res, 200, publicState());
    if (p === '/api/events' && req.method === 'GET') return openEvents(req, res);

    for (const [method, re, fn] of routes) {
      if (req.method !== method) continue;
      const m = p.match(re);
      if (!m) continue;
      if (method !== 'DELETE' && !/^application\/json/i.test(req.headers['content-type'] || '')) {
        throw new HttpError(415, 'Send JSON.');
      }
      const params = m.slice(1).map((s) => { try { return decodeURIComponent(s); } catch { return s; } });
      const body = method === 'DELETE' ? {} : await readBody(req);
      fn(params, body);
      return sendJson(res, 200, publicState());
    }
    throw new HttpError(404, 'Unknown API route.');
  } catch (err) {
    const status = err instanceof HttpError ? err.status : 500;
    if (status === 500) console.error(err);
    if (!res.headersSent) sendJson(res, status, { error: status === 500 ? 'Server error. Check the server log.' : err.message });
    else res.end();
  }
}

/* ------------------------------------------------------------------ start */

load();
SECRET = loadSecret();

const server = http.createServer((req, res) => {
  handle(req, res).catch((err) => {
    console.error(err);
    if (!res.headersSent) sendJson(res, 500, { error: 'Server error.' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`Shopping list running on http://${HOST}:${PORT}`);
  console.log(`Data: ${DB_FILE}`);
  console.log(PASSWORD ? 'Password protection: on' : 'Password protection: off (set APP_PASSWORD to turn it on)');
});

function shutdown(signal) {
  console.log(`${signal} received, saving and exiting.`);
  try { if (dirty || saveTimer) writeSync(); } catch (err) { console.error('Final save failed:', err.message); }
  for (const res of streams) res.end();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
