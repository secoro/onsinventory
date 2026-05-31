# OnsInventory Frontend

Modern React frontend for OnsInventory.

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- TanStack Query
- Framer Motion
- Recharts
- Vitest

## Quick start

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory/frontend
cp .env.example .env
npm install
npm run dev
```

By default, API calls target `http://localhost:8080` via `VITE_API_BASE_URL`.

## Features

- Dashboard cards for stock, recipes, expiring and expired items
- Inventory management form with location-aware placement
- Location filtering for pantry/fridge/freezer
- Recipe recommendations with match percentages and missing ingredients
- Stock distribution pie chart

## Test

```bash
npm run test
```

## Build

```bash
npm run build
```
