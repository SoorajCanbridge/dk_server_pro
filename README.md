# DK Clothing — Backend

Standalone Express REST API, webhooks, and background workers.

## Setup

```bash
cd backend
npm install
cp .env.example .env
```

## Start MongoDB & Redis

```bash
docker compose up -d
```

## Seed database

```bash
npm run seed
```

## Run

```bash
npm run dev
```

- API: http://localhost:4000/api/v1
- Health: http://localhost:4000/api/v1/health

## Background worker (optional)

```bash
npm run worker
```

## Production

```bash
npm run start
```
