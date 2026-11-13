# HOOD TERMINAL

AI terminal for $HOOD holders: paste a website URL, HOOD scans and analyses it (design, UX, content, SEO, accessibility)
and generates a redesigned, self-contained HTML site to the user's brief. Preview on desktop/tablet/mobile, request revisions, download.
Also shows live $HOOD market data and transfers on Robinhood Chain.

Next.js (App Router) + Tailwind + wagmi/viem/RainbowKit + Claude API.

## Configure (edit on GitHub)

All site settings live in [`src/hood.config.ts`](src/hood.config.ts). Commit the change and Vercel redeploys.

| Key | Purpose |
|---|---|
| `social.x`, `social.xHandle`, `social.telegram`, `social.discord` | Social links ("" hides a link) |
| `token.address` | $HOOD CA shared by all EVM networks (Robinhood, Base, BSC) |
| `token.sol` | $HOOD mint on Solana |
| `mode` | `"single"` = only `singleNetwork` · `"multi"` = all 4 networks |
| `singleNetwork` | `robinhood` \| `solana` \| `base` \| `bsc` — shown network and main network in single mode |
| `multiOrder` | Network order in multi mode |
| `primaryNetwork` | Default network for live data in multi mode |
| `access.minHold` | $HOOD a wallet must hold (summed over shown networks of its type) to use the terminal |
| `access.runsPerHour` | Fair-use limit per wallet |
| `networks.<id>` | `name`, `short`, `color`, `tagline`, `icon`, `ca` (empty → `token.address` / `token.sol`), RPC, explorer, `blockscoutApi`, `buyUrl` |
| `deployer` | Launchpad credit in the footer |

Network behaviour:
- **single**: one network badge + tagline, one CA card ("Copy Robinhood CA"), header Copy CA copies directly, only that network's wallet type.
- **multi**: badges for all 4 (MAIN pill on the primary), CA cards grouped (EVM networks sharing a CA → one card + Solana card), header Copy CA opens the list, network tabs on market data / tx monitor, wallet switch EVM ↔ Solana in the terminal.
- Holders, transfers and chain stats need a Blockscout API (Robinhood, Base). BSC and Solana show market data only; the monitor says the feed is not available instead of inventing data.

## Run locally
```bash
cp .env.example .env.local   # set ANTHROPIC_API_KEY at minimum
npm install
npm run dev
```

## How it works
- `lib/scan.ts` fetches the target page (public addresses only, redirects re-checked) and builds a dossier: headings, nav, sections, CTAs, images, forms, colors, fonts, tech stack, quality checks.
- `lib/ai.ts` asks Claude for a JSON analysis, then streams a single HTML file.
- `POST /api/terminal/run` streams NDJSON events (log, dossier, analysis, code, done, error). Revisions send the previous HTML + a request.
- Access: the wallet signs a timestamped message (no transaction). EVM signatures are verified with viem, Solana with ed25519; the server sums the wallet's $HOOD on every shown network of that type and requires `access.minHold`.
- Live token data per network: Blockscout, DexScreener, GeckoTerminal (`lib/hood-data.ts`, `/api/hood?net=`). Failing sources show NO SIGNAL; no data is simulated.

## Deploy (Vercel)
Add the variables from `.env.example`. Generation can take 1–3 minutes; the run route sets `maxDuration = 300`
(needs a plan / Fluid Compute that allows it).
