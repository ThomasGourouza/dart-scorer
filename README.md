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

## Fullstack docs

For the two official operation modes (Production Render+Neon and Local one-command Docker), use the shared infra repo tutorial:

- `../dart-scorer-infra/README.md`
