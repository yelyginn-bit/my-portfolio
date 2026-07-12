# YELYGINN portfolio

Production portfolio and client workspace for video, photography and content
production. The application uses React, TypeScript, Vite, Express and
Supabase. Production is hosted on a REG.RU VPS behind nginx and PM2.

## Local development

```bash
npm ci
cp .env.example .env
npm run dev
```

The Vite server runs on `http://localhost:3000`. API requests are proxied to
`http://localhost:3001`; run the Express server separately when testing forms
and authenticated workflows.

## Verification

```bash
npm run check
```

This command runs TypeScript, unit tests, integration tests and the production
build. A read-only production route check is available as:

```bash
npm run smoke:production
```

## Production

The supported deployment target is the Russian REG.RU VPS. See:

- `deploy/README.md`
- `deploy/nginx-yelyginn.ru.conf`
- `ecosystem.config.cjs`

Netlify is not part of the current production architecture.
