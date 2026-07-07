# 🍳 OnsInventory

[![Build Status](https://github.com/secoro/onsinventory/actions/workflows/ci.yml/badge.svg)](https://github.com/secoro/onsinventory/actions/workflows/ci.yml)
[![Known Vulnerabilities](https://snyk.io/test/github/secoro/onsinventory/badge.svg)](https://snyk.io/test/github/secoro/onsinventory)
[![Code Coverage](https://codecov.io/gh/secoro/onsinventory/graph/badge.svg)](https://app.codecov.io/gh/secoro/onsinventory)
[![Dependency Status](https://img.shields.io/librariesio/github/secoro/onsinventory?label=dependencies)](https://libraries.io/github/secoro/onsinventory)
[![npm package](https://img.shields.io/github/package-json/v/secoro/onsinventory?filename=frontend%2Fpackage.json&label=npm%20package)](frontend/package.json)

Household pantry, fridge, and freezer inventory tracking with recipe recommendations based on what you already have at home. Self-hosted on a Raspberry Pi and served at [onsinventory.com](https://onsinventory.com) through a Cloudflare Tunnel.

## Structure

| Directory | Description |
|-----------|-------------|
| [`backend/`](backend/) | Java 25 / Spring Boot 4.1 REST API with PostgreSQL (prod) or H2 (local) |
| [`frontend/`](frontend/) | React + TypeScript SPA built with Vite and Tailwind CSS |

## Features

- **Inventory management** across pantry, fridge, and freezer, shared per household
- **Recipe recommendations** ranked by how many ingredients you already have
- **Expiry tracking** for expired and soon-to-expire products
- **Meal planning** and cooking recipes directly from stock
- **Households** with members, e-mail invitations, and shared inventory
- **Accounts** with JWT login, password reset, and anonymous feedback via e-mail (Resend)

## Quick start

```bash
# Backend (H2 in-memory, security disabled)
cd backend
mvn spring-boot:run

# Frontend (http://localhost:5173)
cd frontend
npm install
npm run dev
```

See the [backend README](backend/README.md), [frontend README](frontend/README.md), and [QUICKSTART](backend/QUICKSTART.md) for details, and [DEPLOYMENT](backend/DEPLOYMENT.md) for the Raspberry Pi setup.

## Tests

```bash
cd backend && mvn test       # JUnit integration tests
cd frontend && npm run test  # Vitest unit tests
```

## CI/CD

- **CI** ([`ci.yml`](.github/workflows/ci.yml)) — tests backend and frontend on every PR and push to `main`
- **Release** ([`release.yml`](.github/workflows/release.yml)) — branch prefixes drive semver: `bug/*` → patch, `feature/*` → minor, `breaking/*` → major
- **Deploy** ([`deploy.yml`](.github/workflows/deploy.yml)) — builds and deploys to the Raspberry Pi via a self-hosted runner on release
