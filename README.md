# Shopping list

A self-hosted, shared shopping list. One small Node server, no dependencies, data in a single JSON file.

## Features

- Several lists (Groceries, Costco, Pharmacy…), switch from the title
- Items sort themselves into aisles; correct an aisle once and it's remembered
- Type naturally: `2 avocados`, `2 lb ground beef`, `milk x2`, `a dozen eggs`
- Several at once: type `milk, eggs and bread`, or one item per line, then tap send
- Paste a text message into the box and tap send: each item is added separately, with one Undo.
  Greetings, "can you grab…", bullets, numbering, emoji, WhatsApp timestamps and headings like `Costco:` are skipped
- "Paste a list from a text" in the ⋯ menu shows what will be added so you can untick things first
- Voice: tap the mic and say items with a short pause between them (Chrome, Edge, Safari)
- Share a text to the app from Android's share menu (install it with Chrome's Install app first): it lands in the add box, tap send. Or open `/?text=milk%0Aeggs`
- Checked items move to a hidden "Completed" section; tap it to see them and clear them
- Shopping mode (the Shop button): black and white like an always-on display, big clock,
  screen stays on, tap anywhere on a row to check it off. Stays on until you tap "Done"
- Edit quantity, aisle, note, or move an item to another list; undo after deleting
- Live sync between phones (changes appear instantly on every open device)
- Works offline in the store: changes are saved on the phone and sync when you reconnect
- Install to the home screen (needs HTTPS, as does keeping the screen on), share or copy the list
- Optional password, light and dark mode

## Run it

**Docker (recommended)**

```bash
cp .env.example .env
nano .env                # set APP_PASSWORD (and port, name, proxy settings if you like)
docker compose up -d --build
```

Open `http://SERVER-IP:3000`. Your settings live in `.env`, which git ignores, so updates never overwrite them.

**Plain Node 18+**

```bash
APP_PASSWORD=yourpassword node server.js
```

| Variable | Default | What it does |
|---|---|---|
| `PORT` | `3000` | Port to listen on |
| `APP_PASSWORD` | none | Require this password. Changing it signs every device out |
| `DATA_DIR` | `./data` | Where `db.json` is stored |
| `TRUST_PROXY` | off | Set to `1` behind Caddy/nginx/Cloudflare so rate limiting and secure cookies use the real client |
| `COOKIE_SECURE` | off | Set to `1` to always mark the cookie Secure |

## Updating

On the server, from the folder you cloned:

```bash
~/apps/shop/update.sh
```

It pulls the latest version from GitHub, rebuilds the container and waits until it's healthy.
Your list is in a Docker volume and isn't touched, and your `.env` settings are kept. It won't start
while the password is still `change-me`. If a container with the same name was started by hand with
`docker run`, it's replaced by the compose one (same volume, so same list).
`FORCE=1 ./update.sh` rebuilds even when there's nothing new.

## HTTPS (needed for install + offline)

Browsers only allow home-screen install, offline caching and keep-screen-on over HTTPS. With Caddy:

```
list.yourdomain.com {
    reverse_proxy 127.0.0.1:3000
}
```

Then set `TRUST_PROXY=1` in `.env`. With nginx, also add `proxy_buffering off;` so live sync isn't delayed.
Serving from a subpath (e.g. `/shopping/`) works if the proxy strips the prefix.

## Oracle Cloud note

Opening port 3000 (or 80/443 for Caddy) needs two things: an ingress rule in the VCN security list, and the instance's own firewall:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 3000 -j ACCEPT
sudo netfilter-persistent save
```

## Backups

Everything lives in `db.json` in the data folder (the Docker volume named by `DATA_VOLUME`, default `shopping-list-data`).
A copy is saved as `db.json.bak` each time the server starts. Writes are atomic, so a crash can't leave a half-written file.

```bash
docker cp "$(docker compose ps -q)":/data/db.json ./shopping-backup.json
```

## API

All JSON, cookie-authenticated when a password is set. Every write returns the full state.

```
GET    /api/state
GET    /api/events                         Server-sent events (version changes)
POST   /api/lists                          { name }
PATCH  /api/lists/:id                      { name }
DELETE /api/lists/:id
POST   /api/lists/:id/items                { name, qty?, category?, note? }
PATCH  /api/lists/:id/items/:itemId        any of { name, qty, category, note, checked }
DELETE /api/lists/:id/items/:itemId
POST   /api/lists/:id/clear-checked | uncheck-all | clear-all
DELETE /api/history/:key                   stop suggesting an item
```

Handy for n8n or Home Assistant automations (e.g. "add milk" from a voice command).
