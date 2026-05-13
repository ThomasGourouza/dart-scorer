# Dart Scorer Frontend

Angular frontend for Dart Scorer.

## Local dev without Docker

```bash
npm install
npm start
```

## Docker image

The project includes a production Docker image (`Dockerfile`) served by Nginx.

Runtime API URL is injected via environment variable:

- `API_BASE_URL` -> written to `assets/runtime-config.js` at container startup.

## Render deployment

This repo contains `render.yaml` for Docker deployment.
Set:

- `API_BASE_URL=https://<your-backend-service>.onrender.com`

## App structure

Sidebar tabs:

- **Play** — current live game flow.
- **History** — paginated list of saved games, with click-through to a per-game timeline.
- **Stats** — player-name based analytics across all games, with optional filters (date range, variant).

## Suggested future features

- Head-to-head rivalry view (per pair of player names).
- Milestones/achievements (best checkout, highest single dart, win streaks).
- Shareable game recap link / image.
- Season mode (date-bounded leaderboard).
- Data export of History and Stats as CSV/JSON.

## Fullstack docs

For the two official operation modes (Production Render+Neon and Local one-command Docker), use the shared infra repo tutorial:

- `../dart-scorer-infra/README.md`
