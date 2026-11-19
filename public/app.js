'use strict';
(() => {
  /* ============================================================ constants */

  const CATS = [
    { id: 'produce', label: 'Produce', color: '#3F8F4F' },
    { id: 'bakery', label: 'Bakery', color: '#C28A2B' },
    { id: 'dairy', label: 'Dairy & eggs', color: '#3B7DD8' },
    { id: 'meat', label: 'Meat & fish', color: '#C2413B' },
    { id: 'frozen', label: 'Frozen', color: '#2AA3B8' },
    { id: 'pantry', label: 'Pantry', color: '#9A6331' },
    { id: 'snacks', label: 'Snacks & sweets', color: '#D0518A' },
    { id: 'drinks', label: 'Drinks', color: '#7A56C9' },
    { id: 'household', label: 'Household', color: '#5F6B73' },
    { id: 'personal', label: 'Health & beauty', color: '#B565B5' },
    { id: 'baby', label: 'Baby', color: '#E08A2C' },
    { id: 'pets', label: 'Pets', color: '#8A6D4E' },
    { id: 'other', label: 'Other', color: '#8A8F87' },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));

  // Comma-separated keywords. A keyword matches the start of a word, so "strawberr" catches strawberries.
  const KEYWORDS = {
    produce: 'apple,banana,orange,lemon,lime,grape,strawberr,blueberr,raspberr,blackberr,berries,melon,watermelon,cantaloupe,peach,nectarine,pear,plum,cherr,mango,pineapple,kiwi,avocado,tomato,potato,sweet potato,yam,onion,shallot,garlic,ginger,carrot,celery,cucumber,lettuce,romaine,spinach,kale,cabbage,broccoli,cauliflower,bell pepper,pepper,jalapeno,zucchini,squash,pumpkin,mushroom,corn,cilantro,parsley,basil,dill,mint,scallion,green onion,leek,beet,radish,asparagus,eggplant,salad,arugula,greens,fruit,vegetable,veggie,peas,green beans,sprouts,clementine,grapefruit,pomegranate,herbs',
    bakery: 'bread,bagel,baguette,bun,roll,croissant,muffin,english muffin,pita,tortilla,wrap,challah,rye,sourdough,cake,donut,doughnut,pastry,pie,naan,brioche,rugelach',
    dairy: 'milk,cheese,cheddar,mozzarella,parmesan,feta,yogurt,yoghurt,butter,cream,cream cheese,sour cream,half and half,egg,cottage cheese,ricotta,kefir,whipped cream,creamer,margarine,hummus',
    meat: 'chicken,beef,steak,ground beef,ground turkey,turkey,pork,bacon,ham,sausage,salami,hot dog,lamb,veal,brisket,salmon,tuna steak,fish,shrimp,cod,tilapia,catfish,deli,meatball,ribs,schnitzel,pastrami,gefilte',
    frozen: 'ice cream,ice pop,popsicle,frozen,pizza,fries,french fries,sorbet,waffles,tater tots,latkes,ice',
    pantry: 'rice,pasta,spaghetti,noodle,flour,sugar,salt,black pepper,oil,olive oil,vinegar,sauce,tomato sauce,tomato paste,soy sauce,ketchup,mustard,mayo,mayonnaise,cereal,cornflakes,oats,oatmeal,beans,lentils,chickpeas,canned,soup,broth,stock,tuna,peanut butter,jam,jelly,honey,syrup,maple syrup,spice,cinnamon,paprika,cumin,baking soda,baking powder,yeast,vanilla,cocoa,breadcrumbs,salsa,matzah,matzo,quinoa,couscous,tahini,icing,sprinkles',
    snacks: 'chips,crisps,cookie,cracker,pretzel,popcorn,candy,chocolate,gum,granola bar,nuts,almonds,cashews,peanuts,trail mix,dried fruit,raisins,snack,marshmallow,gummies',
    drinks: 'water,sparkling water,seltzer,soda,cola,coke,sprite,juice,orange juice,apple juice,lemonade,iced tea,coffee,tea,beer,wine,vodka,whiskey,whisky,scotch,bourbon,rum,gin,tequila,liquor,schnapps,arak,kombucha,energy drink,gatorade,almond milk,oat milk,soy milk',
    household: 'paper towel,toilet paper,tissues,napkins,trash bags,garbage bags,foil,aluminum foil,plastic wrap,ziploc,sandwich bags,dish soap,dishwasher,detergent,laundry,bleach,cleaner,sponge,batteries,light bulb,lightbulb,candles,wipes,dryer sheets,fabric softener,air freshener,matches,paper plates,cups',
    personal: 'shampoo,conditioner,soap,body wash,toothpaste,toothbrush,floss,mouthwash,deodorant,razor,shaving,lotion,sunscreen,vitamin,medicine,tylenol,advil,ibuprofen,band-aid,bandages,cotton,tampons,pads,makeup,lip balm,contact lens',
    baby: 'diaper,baby,formula,baby wipes,baby food,pacifier',
    pets: 'dog food,cat food,cat litter,litter,pet food,dog treats,cat treats',
  };
  const GUESS = [];
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    for (const w of words.split(',')) GUESS.push([w.trim(), cat]);
  }

  const UNITS = 'kg|kgs|kilo|kilos|g|grams?|lb|lbs|pounds?|oz|ounces?|l|liters?|litres?|ml|gal|gallons?|qt|quarts?|pack|packs|packets?|pk|bag|bags|box|boxes|can|cans|bottle|bottles|dozen|doz|bunch|bunches|jar|jars|ct|loaf|loaves|carton|cartons|heads?|cases?|rolls?|tubs?|containers?|sticks?|pints?|slices?';
  const LEAD_QTY = new RegExp(`^(\\d+(?:[.,/]\\d+)?|½|¼|¾)\\s*(?:x|×)?\\s*(?:(${UNITS})\\.?\\s+(?:of\\s+)?)?(.+)$`, 'i');
  const NUM_WORDS = {
    a: '1', an: '1', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8',
    nine: '9', ten: '10', eleven: '11', twelve: '12', 'a couple of': '2', 'a couple': '2', couple: '2', 'a few': '3',
    'a half': '½', 'half a': '½',
  };
  const NUM_WORD_RE = new RegExp(`^(${Object.keys(NUM_WORDS).sort((a, b) => b.length - a.length).join('|')})\\s+(?=\\S)`, 'i');

  // Words that make up "Hi!", "Thanks love you", "That's all" lines in a text message. A line made only of these is skipped.
  const CHATTER = new Set(('hi hey hello hiya yo ok okay k thanks thank you thx ty tysm love u ily luv xo xox xoxo xx bye ' +
    'please pls plz yes yeah yep no nope sure cool great perfect awesome lol haha babe hon honey dear sweetie mom dad ' +
    'that thats that\'s it all is everything for now me today tonight just the list here heres here\'s shopping grocery groceries ' +
    'and also too oh sent from my iphone android').split(' '));
  // "Can you pick up", "We need", "Don't forget" at the start of a line.
  const ASK_PREFIX = /^(?:(?:hi|hey|hello|ok|okay|also|and|oh|so|plus)\b[\s,!.]*)*(?:(?:can|could|would|will)\s+(?:you|u)\s+(?:please\s+|pls\s+|plz\s+)?(?:also\s+)?(?:get|grab|pick\s+up|buy|bring(?:\s+home)?)(?:\s+(?:me|us))?|(?:please|pls|plz)\s+(?:also\s+)?(?:get|grab|pick\s+up|buy|bring)(?:\s+(?:me|us))?|(?:we|i)\s+(?:also\s+)?(?:need|want|are\s+out\s+of|ran\s+out\s+of|'re\s+out\s+of)|we're\s+out\s+of|(?:also\s+)?need|don'?t\s+forget(?:\s+(?:to\s+get|the))?|remember(?:\s+to\s+get)?|(?:also\s+)?(?:grab|pick\s+up|buy)|out\s+of|get\s+(?:me|us))\b[\s:,-]*/i;
  const TRAILING_CHATTER = /[\s,.!?]*(?:\b(?:please|pls|plz|thanks|thank\s+you|thx|ty|too|also|as\s+well|if\s+you\s+can|for\s+me|for\s+us)\b[\s,.!?]*)*$/i;
  // WhatsApp / Telegram copy: "[11/19/26, 3:42:10 PM] Mom: milk" or "11/19/26, 3:42 PM - Mom: milk"
  const CHAT_STAMP = /^\[?\d{1,4}[/.-]\d{1,2}[/.-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?\s?m\.?)?\]?\s*(?:-\s*)?(?:[^:]{1,40}:\s*)?/i;
  const BULLET = /^(?:[\s\-–—*•·▪◦‣○●□■☐☑✓✔✗>~=+]|\[[ xX✓]?\]|#?\d{1,2}\s*[.):]\s+|#\d{1,2}\s+)+/;

  /* ============================================================== helpers */

  const $ = (s, el = document) => el.querySelector(s);

  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'cat') el.style.setProperty('--cat', v);
      else if (k === 'text') el.textContent = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  function svg(markup) {
    const t = document.createElement('template');
    t.innerHTML = markup.trim();
    return t.content.firstChild;
  }
  const CHECK_SVG = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function uid() {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes); // works on plain http too, unlike randomUUID
    return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or blocked */ } },
    del(k) { try { localStorage.removeItem(k); } catch { /* ignore */ } },
  };

  const keyOf = (name) => name.trim().toLowerCase();
  const catOf = (id) => CAT[id] || CAT.other;

  function guessCategory(name) {
    const n = ` ${name.toLowerCase().replace(/[^a-z0-9\u00c0-\u024f'-]+/g, ' ').trim()} `;
    if (/ frozen /.test(n)) return 'frozen';
    let best = 'other';
    let bestEnd = -1;
    let bestLen = 0;
    for (const [w, cat] of GUESS) {
      let i = n.indexOf(` ${w}`);
      while (i >= 0) {
        // Prefer the match that ends last (the head noun: "apple juice" is a drink), then the longest keyword.
        const end = n.indexOf(' ', i + 1 + w.length);
        if (end > bestEnd || (end === bestEnd && w.length > bestLen)) { best = cat; bestEnd = end; bestLen = w.length; }
        i = n.indexOf(` ${w}`, i + 1);
      }
    }
    return best;
  }

  function parseEntry(raw) {
    let s = raw.trim().replace(BULLET, '').trim();
    let qty = '';
    let m;
    // "two avocados", "a dozen eggs", "a couple of lemons", "an onion"
    if ((m = s.match(NUM_WORD_RE))) {
      const rest = s.slice(m[0].length);
      const n = NUM_WORDS[m[1].toLowerCase()];
      // A bare "a"/"an" is just an article: "an onion" is one onion, no quantity needed.
      s = /^an?$/i.test(m[1]) && !new RegExp(`^(?:${UNITS})\\b`, 'i').test(rest) ? rest : `${n} ${rest}`;
    }
    s = s.replace(/^(?:some|more|extra|another)\s+(?=\S)/i, '');
    m = s.match(LEAD_QTY);
    if (m && m[3] && /[a-zÀ-ɏ]/i.test(m[3][0])) {
      qty = m[2] ? `${m[1]} ${m[2].toLowerCase()}` : m[1];
      s = m[3];
    } else if ((m = s.match(/^(.+?)\s*(?:[x×]\s*|[-–:]\s+|\*\s*)(\d+(?:[.,]\d+)?(?:\s*(?:[a-z]+))?)$/i))
      || (m = s.match(/^(.+?)\s*\((\d+[^)]*)\)$/))) {
      s = m[1];
      qty = m[2];
    }
    if (qty === '1') qty = '';
    s = s.replace(/^(?:of)\s+/i, '').replace(/[\s.,;:!?-]+$/, '').replace(/\s+/g, ' ').trim();
    if (s) s = s[0].toLocaleUpperCase() + s.slice(1);
    return { name: s.slice(0, 120), qty: qty.slice(0, 40) };
  }

  function isChatter(line) {
    const words = line.toLowerCase().replace(/[^a-z'\s]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    return !words.length || words.every((w) => CHATTER.has(w));
  }

  const AND_QTY = new RegExp(`\\s+(?:and|&|plus)\\s+(?=(?:\\d|½|¼|¾|(?:${Object.keys(NUM_WORDS).filter((w) => !/^an?$/.test(w)).join('|')})\\s))`, 'i');

  // Phrases about the trip rather than things to buy: "a few things on the way home?"
  const NOT_AN_ITEM = /\b(?:things|stuff|a few items|on (?:the|your) way|when you(?:'re| are)?|if you(?:'re| are)? (?:going|at|near)|while you(?:'re| are)|at the store|to the store|from the store|shopping list|list for|here(?:'s| is) the list)\b/i;
  // Pairs that are one product, so "and" is not a separator inside them.
  const COMPOUNDS = /\b(mac|macaroni|salt|bread|fish|ham|peanut butter|pb|half|sweet|oil|cookies|black|rock|surf|cheese|pork|rice|chips|spaghetti|franks|biscuits|gravy|eggs|bacon|chicken|beans)\s+(and|&|n|'n'?)\s+(cheese|pepper|butter|chips|jelly|jam|half|sour|vinegar|cream|white|roll|turf|onion|crackers|beans|salsa|meatballs|gravy|waffles|biscuits|rice|dumplings|franks)\b/gi;

  function cleanPiece(piece) {
    let s = piece.trim().replace(BULLET, '').trim();
    let asked = false;
    for (let i = 0; i < 3; i += 1) { // "Hey! Can you also pick up" peels in a few passes
      const before = s;
      s = s.replace(ASK_PREFIX, (m) => { if (m) asked = true; return ''; })
        .replace(/^(?:and|or|also|plus|then)\s+/i, '').trim();
      if (s === before) break;
    }
    s = s.replace(TRAILING_CHATTER, '').replace(/[?!.]+$/, '').trim();
    if (isChatter(s) || NOT_AN_ITEM.test(s)) s = '';
    return { text: s, asked };
  }

  /**
   * Turn pasted text, a typed line or a voice transcript into separate entries.
   * Handles one-per-line lists, "milk, eggs and bread", bullets, numbering, emoji,
   * chat timestamps, "Costco:" headings and the chit-chat around a texted list.
   */
  function splitList(text, { voice = false } = {}) {
    const out = [];
    const seen = new Set();
    const lines = String(text || '')
      .replace(/[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\uFE0F\u200D\u20E3]/gu, ' ')
      .split(/\r?\n|\u2028|\u2029/);
    for (let line of lines) {
      line = line.replace(CHAT_STAMP, '').replace(/\s+/g, ' ').trim();
      if (!line) continue;
      // Sentences: "Hi! Can you get milk." -> handle each sentence on its own
      const sentences = line.split(/(?<=[a-z)][!?.])\s+(?=[A-Z])/);
      for (let sentence of sentences) {
        // "Costco: milk, eggs" keeps what follows; a bare "Produce:" heading is skipped
        const head = sentence.match(/^([^:,\d]{1,40}):\s*(.*)$/);
        if (head) {
          if (!head[2].trim()) continue;
          sentence = head[2];
        }
        const { text: body, asked } = cleanPiece(sentence);
        if (!body) continue;
        const protectedBody = body.replace(COMPOUNDS, '$1\u0001$2\u0001$3');
        let parts = protectedBody.split(/\s*;\s*|,(?!\d)\s*|\s+\|\s+/);
        // "milk, eggs and bread" or "we're out of coffee and sugar" -> split the "and" too.
        // A plain line like "mac and cheese" or "chips and dip" stays whole, except for voice,
        // where there is no punctuation to go by.
        if (parts.length > 1 || asked || voice) {
          parts = parts.flatMap((p) => p.split(/\s+(?:and|plus|then|also|comma)\s+|\s+&\s+(?=\S+\s*$)/i));
        }
        // "2 onion rolls and 2 rugelach": an "and" followed by a quantity always starts a new item.
        parts = parts.flatMap((p) => p.split(AND_QTY));
        for (const part of parts) {
          const cleaned = cleanPiece(part.replace(/\u0001/g, ' ')).text;
          if (!cleaned) continue;
          const { name } = parseEntry(cleaned);
          if (!name || !/[\p{L}\p{N}]/u.test(name)) continue;
          const key = keyOf(name);
          if (seen.has(key)) continue;
          seen.add(key);
          out.push(cleaned);
        }
      }
    }
    return out;
  }

  function bumpQty(qty, delta) {
    const m = String(qty || '').match(/^(\d+)(.*)$/);
    if (!m) {
      if (!qty) return delta > 0 ? '2' : '';
      return qty;
    }
    const n = Math.max(0, parseInt(m[1], 10) + delta);
    if (n <= 1 && !m[2].trim()) return '';
    return `${Math.max(1, n)}${m[2]}`;
  }

  /* ================================================================ state */

  // server: last state the server confirmed. outbox: changes not yet confirmed.
  // What you see = server state with the outbox replayed on top, so offline edits show immediately.
  let server = store.get('sl.server', null);
  let outbox = store.get('sl.outbox', []);
  let view = null;
  let currentId = store.get('sl.list', null);
  let cartOpen = false; // completed items start hidden; tap "Completed" to see or clear them
  let shopping = store.get('sl.shopping', false);
  let reachable = true;
  let syncing = false;
  let retryDelay = 1000;
  let retryTimer = null;
  let authRequired = false;
  let events = null;
  let flashId = null;

  function apply(s, op) {
    const list = (id) => s.lists.find((l) => l.id === id);
    const now = Date.now();
    switch (op.type) {
      case 'addItem': {
        const l = list(op.listId);
        if (!l || l.items.some((i) => i.id === op.item.id)) break;
        l.items.push({ qty: '', note: '', checked: false, checkedAt: null, createdAt: now, updatedAt: now, ...op.item });
        remember(s, op.item.name, op.item.category, true);
        break;
      }
      case 'updateItem': {
        const l = list(op.listId);
        const it = l && l.items.find((i) => i.id === op.itemId);
        if (!it) break;
        if ('checked' in op.patch && op.patch.checked !== it.checked) it.checkedAt = op.patch.checked ? now : null;
        Object.assign(it, op.patch, { updatedAt: now });
        if ('name' in op.patch || 'category' in op.patch) remember(s, it.name, it.category, false);
        break;
      }
      case 'deleteItem': {
        const l = list(op.listId);
        if (l) l.items = l.items.filter((i) => i.id !== op.itemId);
        break;
      }
      case 'addList':
        if (!list(op.list.id)) s.lists.push({ id: op.list.id, name: op.list.name, createdAt: now, items: [] });
        break;
      case 'renameList': {
        const l = list(op.listId);
        if (l) l.name = op.name;
        break;
      }
      case 'deleteList':
        if (s.lists.length > 1) s.lists = s.lists.filter((l) => l.id !== op.listId);
        break;
      case 'clearChecked': {
        const l = list(op.listId);
        if (l) l.items = l.items.filter((i) => !i.checked);
        break;
      }
      case 'uncheckAll': {
        const l = list(op.listId);
        if (l) l.items.forEach((i) => { i.checked = false; i.checkedAt = null; });
        break;
      }
      case 'clearAll': {
        const l = list(op.listId);
        if (l) l.items = [];
        break;
      }
      case 'forget':
        s.history = s.history.filter((x) => x.key !== op.key);
        break;
      default:
        break;
    }
    return s;
  }

  function remember(s, name, category, bump) {
    const key = keyOf(name);
    let x = s.history.find((e) => e.key === key);
    if (!x) { x = { key, name, category, count: 0, lastUsed: 0 }; s.history.push(x); }
    x.name = name;
    x.category = category;
    if (bump) { x.count += 1; x.lastUsed = Date.now(); }
  }

  function toRequest(op) {
    const L = (id) => `api/lists/${encodeURIComponent(id)}`;
    const I = (id) => encodeURIComponent(id);
    switch (op.type) {
      case 'addItem': return ['POST', `${L(op.listId)}/items`, op.item];
      case 'updateItem': return ['PATCH', `${L(op.listId)}/items/${I(op.itemId)}`, op.patch];
      case 'deleteItem': return ['DELETE', `${L(op.listId)}/items/${I(op.itemId)}`];
      case 'addList': return ['POST', 'api/lists', op.list];
      case 'renameList': return ['PATCH', L(op.listId), { name: op.name }];
      case 'deleteList': return ['DELETE', L(op.listId)];
      case 'clearChecked': return ['POST', `${L(op.listId)}/clear-checked`, {}];
      case 'uncheckAll': return ['POST', `${L(op.listId)}/uncheck-all`, {}];
      case 'clearAll': return ['POST', `${L(op.listId)}/clear-all`, {}];
      case 'forget': return ['DELETE', `api/history/${I(op.key)}`];
      default: throw new Error(`Unknown change ${op.type}`);
    }
  }

  function recompute() {
    if (!server) { view = null; return; }
    view = outbox.reduce((s, op) => apply(s, op), structuredClone(server));
    if (!view.lists.some((l) => l.id === currentId)) {
      currentId = view.lists[0] && view.lists[0].id;
      store.set('sl.list', currentId);
    }
  }

  function setServer(st) {
    if (!st || !Array.isArray(st.lists)) return;
    if (!server || st.instance !== server.instance || st.version >= server.version) {
      server = st;
      store.set('sl.server', server);
    }
  }

  const currentList = () => view && view.lists.find((l) => l.id === currentId);

  /* ============================================================ networking */

  class ApiError extends Error {
    constructor(status, message) { super(message); this.status = status; }
  }

  async function api(method, url, body) {
    let res;
    try {
      res = await fetch(url, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError(0, 'Can’t reach the server.');
    }
    let data = null;
    try { data = await res.json(); } catch { /* not JSON */ }
    if (!res.ok) throw new ApiError(res.status, (data && data.error) || `The server answered ${res.status}.`);
    return data;
  }

  function dispatch(op) {
    outbox.push(op);
    store.set('sl.outbox', outbox);
    recompute();
    render();
    flushOutbox();
  }

  async function flushOutbox() {
    if (syncing || !outbox.length) { renderSync(); return; }
    syncing = true;
    clearTimeout(retryTimer);
    renderSync();
    try {
      while (outbox.length) {
        const op = outbox[0];
        try {
          setServer(await api(...toRequest(op)));
          outbox.shift();
          setReachable(true);
          retryDelay = 1000;
        } catch (err) {
          if (err.status === 0 || err.status >= 500 || err.status === 429) {
            setReachable(err.status !== 0);
            retryTimer = setTimeout(flushOutbox, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 30000);
            break;
          }
          if (err.status === 401) { showLogin(); break; }
          // The server refused this change (e.g. the item was deleted elsewhere). Drop it and resync.
          outbox.shift();
          toast(err.message);
        }
        store.set('sl.outbox', outbox);
      }
    } finally {
      syncing = false;
      store.set('sl.outbox', outbox);
      recompute();
      render();
    }
  }

  async function refresh() {
    try {
      setServer(await api('GET', 'api/state'));
      setReachable(true);
      recompute();
      render();
      if (outbox.length) flushOutbox();
      return true;
    } catch (err) {
      if (err.status === 401) showLogin();
      else setReachable(false);
      return false;
    }
  }

  function connectEvents() {
    if (events) events.close();
    if (!window.EventSource) return;
    events = new EventSource('api/events');
    events.addEventListener('version', (e) => {
      setReachable(true);
      const v = Number(e.data);
      if (!server || v !== server.version) refresh();
    });
    events.onerror = () => {
      if (events.readyState === EventSource.CLOSED) setTimeout(connectEvents, 5000);
      else setReachable(false);
    };
  }

  function setReachable(ok) {
    if (reachable === ok) return;
    reachable = ok;
    renderSync();
    if (ok && outbox.length) flushOutbox();
  }

  /* ============================================================ rendering */

  const els = {};

  function render() {
    renderSync();
    const list = currentList();
    if (!list) return;

    els.listName.textContent = list.name;
    document.title = `${list.name} – Shopping list`;

    const todo = list.items.filter((i) => !i.checked).sort((a, b) => a.createdAt - b.createdAt);
    const done = list.items.filter((i) => i.checked).sort((a, b) => (b.checkedAt || 0) - (a.checkedAt || 0));
    const total = list.items.length;

    // Aisle strip
    const ordered = [...list.items].sort((a, b) =>
      CATS.indexOf(catOf(a.category)) - CATS.indexOf(catOf(b.category)) || a.createdAt - b.createdAt);
    els.strip.replaceChildren(...ordered.map((i) =>
      h('span', { class: `tick${i.checked ? ' on' : ''}`, cat: catOf(i.category).color })));

    if (!total) els.progressText.textContent = 'Nothing on this list yet';
    else if (!todo.length) els.progressText.textContent = `All ${total} done`;
    else els.progressText.textContent = `${done.length} of ${total} done`;

    // To get, grouped by aisle
    const groups = CATS
      .map((c) => ({ c, items: todo.filter((i) => catOf(i.category).id === c.id) }))
      .filter((g) => g.items.length);
    els.toGet.replaceChildren(...groups.map(({ c, items }) =>
      h('section', { class: 'aisle', cat: c.color, 'aria-label': c.label },
        h('h2', { class: 'aisle-head' }, c.label, h('span', { class: 'aisle-count', text: String(items.length) })),
        h('ul', { class: 'rows', cat: c.color }, items.map(itemRow)))));

    // Empty states
    if (!total) {
      els.empty.replaceChildren(
        h('strong', { text: 'This list is empty' }),
        'Type or paste what you need below, one item per line or separated by commas, then tap send. Items sort themselves into aisles.');
      els.empty.hidden = false;
    } else if (!todo.length) {
      els.empty.replaceChildren(
        h('strong', { text: 'Everything’s done' }),
        'Clear the completed items to start fresh, or put them back to reuse this list.',
        h('br'),
        h('button', { class: 'btn btn-primary', type: 'button', 'data-cmd': 'clearChecked' }, 'Clear completed'));
      els.empty.hidden = false;
    } else {
      els.empty.hidden = true;
    }

    // In the cart
    if (!done.length) cartOpen = false;
    els.cart.hidden = !done.length;
    els.cartTitle.textContent = `Completed (${done.length})`;
    els.cartToggle.setAttribute('aria-expanded', String(cartOpen));
    els.cartItems.hidden = !cartOpen;
    els.cartClear.hidden = !cartOpen;
    els.cartItems.replaceChildren(...(cartOpen ? done.map(itemRow) : []));
    if (shopping) renderShopClock(todo.length);

    if (flashId) {
      const row = document.querySelector(`[data-id="${CSS.escape(flashId)}"]`);
      if (row) {
        row.classList.remove('flash');
        void row.offsetWidth;
        row.classList.add('flash');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
      flashId = null;
    }
  }

  function itemRow(it) {
    const c = catOf(it.category);
    const box = h('span', { class: 'box' });
    box.append(svg(CHECK_SVG));
    return h('li', { class: `item${it.checked ? ' is-checked' : ''}`, 'data-id': it.id, cat: c.color },
      h('button', {
        class: 'check', type: 'button', 'data-action': 'toggle',
        role: 'checkbox', 'aria-checked': String(it.checked), 'aria-label': it.name,
      }, box),
      h('button', { class: 'item-body', type: 'button', 'data-action': 'edit', 'aria-label': `Edit ${it.name}` },
        h('span', { class: 'item-name', text: it.name }),
        it.note ? h('span', { class: 'item-note', text: it.note }) : null),
      it.qty ? h('span', { class: 'qty', text: it.qty }) : null);
  }

  function renderSync() {
    if (!els.sync) return;
    const pending = outbox.length;
    let state = 'ok';
    let label = 'Synced';
    if (!reachable) { state = 'offline'; label = 'Offline'; }
    else if (pending) { state = 'pending'; label = 'Saving'; }
    els.sync.dataset.state = state;
    els.sync.textContent = label;
    if (!reachable) {
      els.offline.textContent = pending
        ? `Offline. ${pending} change${pending === 1 ? '' : 's'} saved on this device will sync when the connection is back.`
        : 'Offline. You can keep checking things off; changes sync when the connection is back.';
      els.offline.hidden = false;
    } else {
      els.offline.hidden = true;
    }
  }

  /* =============================================================== toasts */

  let toastTimer = null;
  function toast(message, action, onAction) {
    els.toastText.textContent = message;
    els.toastAction.hidden = !action;
    els.toastAction.textContent = action || '';
    els.toastAction.onclick = () => { hideToast(); if (onAction) onAction(); };
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, action ? 6000 : 3000);
  }
  function hideToast() { els.toast.hidden = true; }

  /* =========================================================== add items */

  function addByName(raw, opts = {}) {
    const list = currentList();
    if (!list) return null;
    const { name, qty } = opts.parsed ? { name: raw, qty: '' } : parseEntry(raw);
    if (!name) return null;
    const key = keyOf(name);
    const existing = list.items.find((i) => keyOf(i.name) === key);
    if (existing) {
      if (existing.checked) {
        const patch = { checked: false };
        if (qty) patch.qty = qty;
        dispatch({ type: 'updateItem', listId: list.id, itemId: existing.id, patch });
        if (!opts.quiet) toast(`${existing.name} is back on the list`);
        flashId = existing.id;
        render();
        return { id: existing.id, status: 'restored', prevQty: existing.qty };
      }
      const changed = qty && qty !== existing.qty;
      if (changed) dispatch({ type: 'updateItem', listId: list.id, itemId: existing.id, patch: { qty } });
      if (!opts.quiet) toast(changed ? `Updated ${existing.name} to ${qty}` : `${existing.name} is already on the list`);
      flashId = existing.id;
      render();
      return { id: existing.id, status: changed ? 'updated' : 'exists', prevQty: existing.qty };
    }
    const known = view.history.find((x) => x.key === key);
    const item = {
      id: uid(),
      name: known && known.name.toLowerCase() === name.toLowerCase() ? known.name : name,
      qty,
      note: '',
      category: (known && known.category) || guessCategory(name),
      createdAt: Date.now(),
    };
    dispatch({ type: 'addItem', listId: list.id, item });
    flashId = item.id;
    render();
    return { id: item.id, status: 'added' };
  }

  // Add several entries at once (a pasted text, "milk, eggs, bread", a voice note) with one Undo.
  function addMany(entries) {
    const list = currentList();
    if (!list || !entries.length) return 0;
    const results = entries.map((e) => addByName(e, { quiet: true })).filter(Boolean);
    summarizeAdds(list, results);
    return results.length;
  }

  function summarizeAdds(list, results, how = '') {
    const added = results.filter((r) => r.status === 'added').length;
    const back = results.filter((r) => r.status === 'restored').length;
    const already = results.filter((r) => r.status === 'exists' || r.status === 'updated').length;
    const bits = [];
    if (added) bits.push(`Added ${added} item${added === 1 ? '' : 's'}${how}`);
    if (back) bits.push(`${back} back on the list`);
    if (already) bits.push(`${already} already there`);
    const changed = results.filter((r) => r.status !== 'exists');
    if (!changed.length) { toast(bits.join(', ') || 'Nothing to add'); return; }
    toast(bits.join(', '), 'Undo', () => {
      for (const r of changed) {
        if (r.status === 'added') dispatch({ type: 'deleteItem', listId: list.id, itemId: r.id });
        else if (r.status === 'restored') dispatch({ type: 'updateItem', listId: list.id, itemId: r.id, patch: { checked: true, qty: r.prevQty || '' } });
        else dispatch({ type: 'updateItem', listId: list.id, itemId: r.id, patch: { qty: r.prevQty || '' } });
      }
    });
  }

  // One entry point for the add box: a single item, or several when the text holds a list.
  function addText(text, opts) {
    const entries = splitList(text, opts);
    if (entries.length > 1) return addMany(entries);
    if (entries.length === 1) return addByName(entries[0]) ? 1 : 0;
    return addByName(text) ? 1 : 0;
  }

  /* ======================================================== paste a list */

  function openBulk(prefill = '') {
    const ta = $('#bulkText');
    ta.value = prefill;
    renderBulkPreview();
    openSheet(els.bulkSheet);
    if (!prefill) ta.focus();
  }

  function renderBulkPreview() {
    const entries = splitList($('#bulkText').value);
    const list = currentList();
    const onList = new Set(list ? list.items.filter((i) => !i.checked).map((i) => keyOf(i.name)) : []);
    const preview = $('#bulkPreview');
    preview.replaceChildren(...entries.map((e, i) => {
      const { name, qty } = parseEntry(e);
      const known = view && view.history.find((x) => x.key === keyOf(name));
      const c = catOf((known && known.category) || guessCategory(name));
      const dup = onList.has(keyOf(name));
      return h('li', { class: 'bulk-row', cat: c.color },
        h('label', {},
          h('input', { type: 'checkbox', 'data-i': String(i), checked: !dup }),
          h('span', { class: 'bulk-name', text: name }),
          qty ? h('span', { class: 'qty', text: qty }) : null,
          h('span', { class: 'bulk-meta', text: dup ? 'Already on list' : c.label })));
    }));
    preview.hidden = !entries.length;
    bulkEntries = entries;
    updateBulkCount();
  }
  let bulkEntries = [];

  function updateBulkCount() {
    const n = $('#bulkPreview').querySelectorAll('input:checked').length;
    const btn = $('#bulkAdd');
    btn.textContent = n ? `Add ${n} item${n === 1 ? '' : 's'}` : 'Add items';
    btn.disabled = !n;
    $('#bulkHint').textContent = bulkEntries.length
      ? 'Untick anything you don’t want. Tap Add when it looks right.'
      : 'Paste a text message or type one item per line. Commas work too.';
  }

  /* =============================================================== voice */

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recog = null;

  // Say items with a short pause between them: "milk … two pounds of chicken … eggs and bread".
  function toggleVoice() {
    if (recog) { recog.stop(); return; }
    const list = currentList();
    if (!SpeechRec || !list) return;
    const results = [];
    let failed = '';
    recog = new SpeechRec();
    recog.lang = navigator.language || 'en-US';
    recog.continuous = true;
    recog.interimResults = true;
    recog.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const r = e.results[i];
        if (r.isFinal) {
          for (const entry of splitList(r[0].transcript, { voice: true })) {
            const res = addByName(entry, { quiet: true });
            if (res) results.push(res);
          }
        } else {
          interim += r[0].transcript;
        }
      }
      els.addInput.value = interim;
    };
    recog.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') failed = 'Microphone access is blocked. Allow it in the browser’s site settings.';
      else if (e.error === 'no-speech') failed = 'Didn’t hear anything. Tap the mic and try again.';
      else if (e.error === 'network') failed = 'Voice input needs an internet connection.';
      else if (e.error !== 'aborted') failed = 'Voice input stopped. Try again.';
    };
    recog.onend = () => {
      recog = null;
      els.micBtn.setAttribute('aria-pressed', 'false');
      els.addInput.value = '';
      sizeAddBox();
      els.addInput.placeholder = els.addInput.dataset.placeholder;
      if (results.length) summarizeAdds(list, results, ' by voice');
      else if (failed) toast(failed);
    };
    try {
      recog.start();
    } catch {
      recog = null;
      toast('Voice input isn’t available right now');
      return;
    }
    els.micBtn.setAttribute('aria-pressed', 'true');
    els.addInput.placeholder = 'Listening… pause between items';
  }

  // Shared from another app (Android: Share → Shopping list), or opened with ?text=…
  function takeSharedText() {
    const params = new URLSearchParams(location.search);
    const text = [params.get('title'), params.get('text'), params.get('url')].filter(Boolean).join('\n').trim();
    if (!params.has('text') && !params.has('title')) return;
    history.replaceState(null, '', location.pathname);
    if (text) openBulk(text);
  }

  /* ============================================================ add box */

  // The add box is a textarea so pasted line breaks survive however the text arrives
  // (keyboard clipboard buttons don't always send a paste event). It grows with its content.
  function sizeAddBox() {
    const el = els.addInput;
    el.style.height = '';
    if (el.value.includes('\n') || el.scrollHeight > el.clientHeight + 2) el.style.height = `${el.scrollHeight + 4}px`;
  }

  // Phones: Enter starts a new line, so you can type a list one item per line; the send button adds.
  // Computers: Enter adds, Shift+Enter starts a new line.
  const enterSends = () => window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ========================================================== edit sheet */

  let editing = null;

  function openEdit(itemId) {
    const list = currentList();
    const it = list && list.items.find((i) => i.id === itemId);
    if (!it) return;
    editing = { listId: list.id, item: { ...it } };
    $('#fName').value = it.name;
    $('#fQty').value = it.qty || '';
    $('#fNote').value = it.note || '';
    const cats = $('#fCats');
    cats.replaceChildren(...CATS.map((c) =>
      h('label', { class: 'cat-chip', cat: c.color },
        h('input', { type: 'radio', name: 'fCat', value: c.id, checked: catOf(it.category).id === c.id }),
        h('span', { text: c.label }))));
    const sel = $('#fList');
    sel.replaceChildren(...view.lists.map((l) => h('option', { value: l.id, selected: l.id === list.id }, l.name)));
    $('#fListWrap').hidden = view.lists.length < 2;
    openSheet(els.itemSheet);
  }

  function saveEdit() {
    if (!editing) return;
    const { listId, item } = editing;
    const name = parseEntry($('#fName').value).name || item.name;
    const qty = $('#fQty').value.trim();
    const note = $('#fNote').value.replace(/\s+/g, ' ').trim();
    const chosen = document.querySelector('input[name="fCat"]:checked');
    const category = chosen ? chosen.value : item.category;
    const targetList = $('#fList').value || listId;

    if (targetList !== listId) {
      const dest = view.lists.find((l) => l.id === targetList);
      const clash = dest && dest.items.find((i) => keyOf(i.name) === keyOf(name) && !i.checked);
      if (!clash) {
        dispatch({ type: 'addItem', listId: targetList, item: { id: uid(), name, qty, note, category, createdAt: Date.now() } });
      }
      dispatch({ type: 'deleteItem', listId, itemId: item.id });
      toast(`Moved ${name} to ${dest ? dest.name : 'the other list'}`);
    } else {
      const patch = {};
      if (name !== item.name) patch.name = name;
      if (qty !== (item.qty || '')) patch.qty = qty;
      if (note !== (item.note || '')) patch.note = note;
      if (category !== item.category) patch.category = category;
      if (Object.keys(patch).length) dispatch({ type: 'updateItem', listId, itemId: item.id, patch });
    }
    editing = null;
  }

  function deleteItem(listId, item) {
    dispatch({ type: 'deleteItem', listId, itemId: item.id });
    toast(`Deleted ${item.name}`, 'Undo', () => {
      dispatch({ type: 'addItem', listId, item: { ...item } });
    });
  }

  /* ============================================================== sheets */

  function openSheet(dlg) {
    if (typeof dlg.showModal === 'function') dlg.showModal();
    else dlg.setAttribute('open', '');
  }
  function closeSheet(dlg) {
    if (typeof dlg.close === 'function') dlg.close();
    else dlg.removeAttribute('open');
  }

  function ask({ title, body = '', ok = 'OK', danger = false, input = null }) {
    return new Promise((resolve) => {
      const dlg = els.askSheet;
      $('#askTitle').textContent = title;
      $('#askBody').textContent = body;
      const okBtn = $('#askOk');
      okBtn.textContent = ok;
      okBtn.className = danger ? 'btn btn-primary btn-danger-fill' : 'btn btn-primary';
      if (danger) { okBtn.style.background = 'var(--danger)'; okBtn.style.color = '#fff'; }
      else { okBtn.style.background = ''; okBtn.style.color = ''; }
      const field = $('#askInput');
      field.hidden = input === null;
      field.value = input || '';
      dlg.returnValue = '';
      const done = () => {
        dlg.removeEventListener('close', done);
        if (dlg.returnValue !== 'ok') return resolve(null);
        resolve(input === null ? true : field.value.trim());
      };
      dlg.addEventListener('close', done);
      openSheet(dlg);
      if (input !== null) { field.focus(); field.select(); }
    });
  }

  function renderLists() {
    const items = view.lists.map((l) => {
      const left = l.items.filter((i) => !i.checked).length;
      return h('li', {},
        h('button', { class: 'choice', type: 'button', 'data-list': l.id, 'aria-current': String(l.id === currentId) },
          l.name, h('span', { class: 'choice-meta', text: left ? `${left} to get` : 'Done' })));
    });
    els.listsList.replaceChildren(...items);
  }

  function switchList(id) {
    currentId = id;
    store.set('sl.list', id);
    recompute();
    render();
    window.scrollTo({ top: 0 });
  }

  /* =========================================================== commands */

  let wakeLock = null;

  async function runCommand(cmd) {
    const list = currentList();
    if (!list) return;
    closeSheet(els.menuSheet);
    switch (cmd) {
      case 'bulk': return openBulk();
      case 'share': return shareList(list);
      case 'uncheck':
        if (!list.items.some((i) => i.checked)) return toast('Nothing completed yet');
        dispatch({ type: 'uncheckAll', listId: list.id });
        return toast('Everything is back on the list');
      case 'clearChecked': {
        const n = list.items.filter((i) => i.checked).length;
        if (!n) return toast('Nothing completed yet');
        const removed = list.items.filter((i) => i.checked).map((i) => ({ ...i }));
        dispatch({ type: 'clearChecked', listId: list.id });
        return toast(`Cleared ${n} item${n === 1 ? '' : 's'}`, 'Undo', () => {
          removed.forEach((item) => dispatch({ type: 'addItem', listId: list.id, item }));
        });
      }
      case 'rename': {
        const name = await ask({ title: 'Rename list', ok: 'Rename', input: list.name });
        if (name && name !== list.name) dispatch({ type: 'renameList', listId: list.id, name: name.slice(0, 60) });
        return undefined;
      }
      case 'clearAll': {
        if (!list.items.length) return toast('This list is already empty');
        const okay = await ask({ title: `Remove all ${list.items.length} items?`, body: `Everything on “${list.name}” will be removed.`, ok: 'Remove all', danger: true });
        if (okay) dispatch({ type: 'clearAll', listId: list.id });
        return undefined;
      }
      case 'deleteList': {
        if (view.lists.length === 1) return toast('Keep at least one list');
        const okay = await ask({ title: `Delete “${list.name}”?`, body: 'The list and its items will be removed on every device.', ok: 'Delete list', danger: true });
        if (okay) { dispatch({ type: 'deleteList', listId: list.id }); toast(`Deleted ${list.name}`); }
        return undefined;
      }
      case 'logout':
        await api('POST', 'api/logout', {}).catch(() => {});
        store.del('sl.server');
        location.reload();
        return undefined;
      default:
        return undefined;
    }
  }

  async function shareList(list) {
    const todo = list.items.filter((i) => !i.checked);
    if (!todo.length) return toast('Nothing left to get on this list');
    const lines = [list.name];
    for (const c of CATS) {
      const items = todo.filter((i) => catOf(i.category).id === c.id);
      if (!items.length) continue;
      lines.push('', c.label);
      for (const i of items) lines.push(`• ${i.name}${i.qty ? ` (${i.qty})` : ''}${i.note ? ` – ${i.note}` : ''}`);
    }
    const text = lines.join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: list.name, text }); return undefined; }
      catch (err) { if (err && err.name === 'AbortError') return undefined; }
    }
    try {
      await navigator.clipboard.writeText(text);
      return toast('List copied');
    } catch {
      const ta = h('textarea', {});
      ta.value = text;
      document.body.append(ta);
      ta.select();
      const ok = document.execCommand && document.execCommand('copy');
      ta.remove();
      return toast(ok ? 'List copied' : 'Copying isn’t available here');
    }
  }

  /* ======================================================= shopping mode */

  // Shopping mode: black screen with white outlines (like an always-on display), the screen stays
  // awake, the whole row checks an item off, and nothing animates, until "Done shopping".
  let clockTimer = null;

  async function keepAwake() {
    if (!shopping || document.hidden || wakeLock) return;
    if (!('wakeLock' in navigator)) {
      if (!window.isSecureContext) toast('Keeping the screen on needs the app opened over https://');
      return;
    }
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } catch { /* battery saver or not visible; tried again when the app is shown */ }
  }

  function setShopping(on) {
    shopping = on;
    store.set('sl.shopping', on);
    document.documentElement.classList.toggle('shopping', on);
    els.shopBtn.hidden = on;
    els.shopExit.hidden = !on;
    els.shopClock.hidden = !on;
    els.menuBtn.hidden = on;
    els.sync.hidden = on;
    els.addForm.hidden = on;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (!m.dataset.normal) m.dataset.normal = m.content;
      m.content = on ? '#000000' : m.dataset.normal;
    });
    clearInterval(clockTimer);
    if (on) {
      cartOpen = false;
      clockTimer = setInterval(() => renderShopClock(), 15000);
      keepAwake();
    } else if (wakeLock) {
      wakeLock.release().catch(() => {});
      wakeLock = null;
    }
    render();
  }

  function enterShopping() {
    if (document.activeElement) document.activeElement.blur();
    setShopping(true);
    window.scrollTo({ top: 0 });
    // Full screen hides the status and navigation bars, like the always-on display.
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }

  function exitShopping() {
    setShopping(false);
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  }

  function renderShopClock(left) {
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, '');
    if (left === undefined) {
      const list = currentList();
      left = list ? list.items.filter((i) => !i.checked).length : 0;
    }
    els.shopClock.dateTime = now.toISOString();
    els.shopClock.replaceChildren(h('span', { class: 'clock-time', text: time }),
      h('span', { class: 'clock-left', text: left ? `${left} left` : 'All done' }));
  }


  /* ============================================================== events */

  function bind() {
    // Item rows (toggle + edit)
    const onRowClick = (e) => {
      const btn = e.target.closest('[data-action]');
      const row = e.target.closest('[data-id]');
      if (!btn || !row) return;
      const list = currentList();
      const it = list.items.find((i) => i.id === row.dataset.id);
      if (!it) return;
      if (btn.dataset.action === 'toggle' || shopping) {
        if (navigator.vibrate) navigator.vibrate(8);
        dispatch({ type: 'updateItem', listId: list.id, itemId: it.id, patch: { checked: !it.checked } });
      } else {
        openEdit(it.id);
      }
    };
    els.main.addEventListener('click', onRowClick);
    els.main.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cmd]');
      if (c) runCommand(c.dataset.cmd);
    });

    els.cartToggle.addEventListener('click', () => {
      cartOpen = !cartOpen;
      render();
    });
    els.cartClear.addEventListener('click', () => { cartOpen = false; runCommand('clearChecked'); });
    els.shopBtn.addEventListener('click', enterShopping);
    els.shopExit.addEventListener('click', exitShopping);

    // Add bar: nothing is added until you tap send.
    els.addForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const v = els.addInput.value;
      if (!v.trim()) { els.addInput.focus(); return; }
      addText(v);
      els.addInput.value = '';
      sizeAddBox();
      els.addInput.focus();
    });
    els.addInput.addEventListener('input', sizeAddBox);
    els.addInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      if ((enterSends() && !e.shiftKey) || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        els.addForm.requestSubmit();
      }
    });
    // Keep the keyboard open when tapping send or the mic.
    els.addForm.querySelectorAll('button').forEach((b) => b.addEventListener('pointerdown', (e) => {
      if (document.activeElement === els.addInput) e.preventDefault();
    }));

    // Voice
    els.addInput.dataset.placeholder = els.addInput.placeholder;
    els.micBtn.hidden = !SpeechRec;
    els.micBtn.addEventListener('click', toggleVoice);

    // Paste-a-list sheet
    $('#bulkText').addEventListener('input', renderBulkPreview);
    $('#bulkPreview').addEventListener('change', updateBulkCount);
    $('#bulkPaste').hidden = !(navigator.clipboard && navigator.clipboard.readText);
    $('#bulkPaste').addEventListener('click', async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text.trim()) return toast('The clipboard is empty');
        const ta = $('#bulkText');
        ta.value = ta.value.trim() ? `${ta.value.trim()}\n${text}` : text;
        renderBulkPreview();
      } catch {
        toast('Long-press the box and choose Paste');
      }
      return undefined;
    });
    $('#bulkForm').addEventListener('submit', (e) => {
      if (!e.submitter || e.submitter.value !== 'add') return;
      const picked = [...$('#bulkPreview').querySelectorAll('input:checked')].map((b) => bulkEntries[Number(b.dataset.i)]);
      addMany(picked.filter(Boolean));
      $('#bulkText').value = '';
    });

    // Sheets: close buttons and backdrop taps
    document.querySelectorAll('dialog').forEach((dlg) => {
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg || e.target.closest('[data-close]')) closeSheet(dlg);
      });
    });

    // Edit sheet
    $('#itemForm').addEventListener('submit', (e) => {
      if (e.submitter && e.submitter.value === 'save') saveEdit();
    });
    els.itemSheet.addEventListener('close', () => { editing = null; });
    $('#fDelete').addEventListener('click', () => {
      if (!editing) return;
      const { listId, item } = editing;
      editing = null;
      closeSheet(els.itemSheet);
      deleteItem(listId, item);
    });
    document.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
      const f = $('#fQty');
      f.value = bumpQty(f.value, Number(b.dataset.step));
    }));

    // Lists sheet
    els.listSwitch.addEventListener('click', () => { renderLists(); openSheet(els.listsSheet); });
    els.listsList.addEventListener('click', (e) => {
      const b = e.target.closest('[data-list]');
      if (!b) return;
      switchList(b.dataset.list);
      closeSheet(els.listsSheet);
    });
    $('#newListForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = $('#newListName');
      const name = input.value.trim().slice(0, 60);
      if (!name) { input.focus(); return; }
      const id = uid();
      dispatch({ type: 'addList', list: { id, name } });
      input.value = '';
      switchList(id);
      closeSheet(els.listsSheet);
      toast(`Created ${name}`);
    });

    // Menu sheet
    els.menuBtn.addEventListener('click', () => {
      $('#menuTitle').textContent = currentList().name;
      openSheet(els.menuSheet);
    });
    els.menuSheet.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (b) runCommand(b.dataset.cmd);
    });

    // Keyboard shortcut on desktop
    document.addEventListener('keydown', (e) => {
      if (e.key === '/' && !e.target.closest('input, textarea, select') && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        els.addInput.focus();
      }
    });

    // Resync when the app comes back to the foreground
    document.addEventListener('visibilitychange', async () => {
      if (document.hidden) return;
      refresh();
      if (shopping) { renderShopClock(); keepAwake(); }
    });
    window.addEventListener('online', () => { refresh(); flushOutbox(); });
    window.addEventListener('offline', () => setReachable(false));
  }

  /* =============================================================== login */

  function showLogin() {
    if (events) { events.close(); events = null; }
    els.app.hidden = true;
    els.boot.hidden = true;
    els.login.hidden = false;
    $('#password').focus();
  }

  function bindLogin() {
    $('#loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('#loginError');
      err.textContent = '';
      try {
        await api('POST', 'api/login', { password: $('#password').value });
        $('#password').value = '';
        els.login.hidden = true;
        start();
      } catch (ex) {
        err.textContent = ex.status === 0 ? 'Can’t reach the server. Check your connection.' : ex.message;
      }
    });
  }

  /* =============================================================== start */

  function showApp() {
    els.boot.hidden = true;
    els.login.hidden = true;
    els.app.hidden = false;
  }

  async function start() {
    let session = null;
    try { session = await api('GET', 'api/session'); }
    catch { /* offline: fall back to the cached copy */ }

    if (session) {
      authRequired = session.authRequired;
      els.logoutBtn.hidden = !authRequired;
      if (authRequired && !session.authenticated) return showLogin();
    }

    if (server) { recompute(); showApp(); render(); }

    const ok = await refresh();
    if (ok) {
      showApp();
      connectEvents();
      takeSharedText();
    } else if (!server) {
      els.boot.textContent = 'Can’t reach the server. Check that it’s running, then reload this page.';
      return undefined;
    } else {
      setReachable(false);
      setTimeout(start, 10000);
    }
    return undefined;
  }

  document.addEventListener('DOMContentLoaded', () => {
    for (const id of ['app', 'boot', 'login', 'main', 'toGet', 'empty', 'cart', 'cartToggle', 'cartTitle', 'cartClear',
      'cartItems', 'strip', 'progressText', 'listName', 'listSwitch', 'menuBtn', 'offline', 'addForm', 'addInput',
      'itemSheet', 'listsSheet', 'listsList', 'menuSheet', 'askSheet', 'toast', 'toastText',
      'toastAction', 'logoutBtn', 'bulkSheet', 'micBtn', 'shopBtn', 'shopExit', 'shopClock']) {
      els[id] = document.getElementById(id);
    }
    els.sync = document.getElementById('syncState');
    bind();
    bindLogin();
    if (shopping) setShopping(true);
    start();

    if ('serviceWorker' in navigator && window.isSecureContext) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* offline shell is optional */ });
    }
  });

  // Exposed for quick checks in the browser console.
  window.__shoppingList = { parseEntry, guessCategory, splitList };
})();
