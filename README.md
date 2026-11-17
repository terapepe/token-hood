# HOOD — tokenhood.online

Static site (plain HTML + CSS + JS, no build, no backend). Deployed on Vercel as-is.

- `index.html` — page, `css/style.css` — styles, `js/app.js` — renders config values (CA cards, buy / explorer / social links)
- `js/config.js` — project name, ticker, socials, CA, networks, `mode` (`single` / `multi`)

On load, `js/config.js` asks hybot (`https://hybot.xyz/api/site-token?site=<domain>`) for the newest token launched for this domain and uses its CA, name, symbol, X and Telegram; the values in the file are the fallback.
