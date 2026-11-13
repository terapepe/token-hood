# HOOD TERMINAL

AI terminal for $HOOD holders: paste a website URL, HOOD scans and analyses it (design, UX, content, SEO, accessibility)
and generates a redesigned, self-contained HTML site to the user's brief. Preview on desktop/tablet/mobile, request revisions, download.
Also shows live $HOOD market data and transfers on Robinhood Chain.

Next.js (App Router) + Tailwind + wagmi/viem/RainbowKit + Claude API.

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
- Access: the wallet signs a timestamped message (no transaction); the server verifies it and reads `balanceOf` on Robinhood Chain. Must hold `NEXT_PUBLIC_HOOD_MIN_HOLD`.
- Live token data: Blockscout, DexScreener, GeckoTerminal (`lib/hood-data.ts`). Failing sources show NO SIGNAL; no data is simulated.

## Deploy (Vercel)
Add the variables from `.env.example`. Generation can take 1–3 minutes; the run route sets `maxDuration = 300`
(needs a plan / Fluid Compute that allows it).
