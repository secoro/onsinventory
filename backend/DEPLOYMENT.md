# 🚀 Deployment Guide

Gids voor het deployen van OnsInventory. De aanbevolen productie-opzet voor deze repository is nu een self-hosted Raspberry Pi deployment met Docker Compose, PostgreSQL, frontend, backend en een Cloudflare Tunnel.

## Raspberry Pi Deployment (Recommended)

### Architectuur

De productie-opzet bestaat uit vier containers:

- `cloudflared` voor de uitgaande tunnel naar Cloudflare (geen inbound poorten nodig)
- `onsinventory-frontend` voor de React/Vite frontend
- `onsinventory-backend` voor de Spring Boot API
- `postgres` voor persistente data

Verkeer loopt als volgt:

- bezoeker → Cloudflare edge (TLS termination hier) → Cloudflare Tunnel (uitgaand vanaf de Pi, dus geen open poorten op de router) → rechtstreeks naar `onsinventory-frontend` of `onsinventory-backend`, op basis van de hostname-routing in de tunnel zelf (Public Hostnames, zie Stap 4)
- `onsinventory.com` → frontend
- `www.onsinventory.com` → frontend
- `api.onsinventory.com` → backend

Omdat de Pi op een netwerk staat dat met huisgenoten wordt gedeeld, forwarden we bewust geen poorten op de router: `cloudflared` maakt alleen uitgaande verbindingen, dus er hoeft niets publiek bereikbaar te zijn vanaf het thuisnetwerk.

### Stap 1: Raspberry Pi voorbereiden

Gebruik bij voorkeur:

- Raspberry Pi OS 64-bit
- een Raspberry Pi 4 of 5
- SSD-opslag of betrouwbare storage voor PostgreSQL

Update eerst het systeem:

```bash
sudo apt update && sudo apt upgrade -y
```

### Stap 2: Docker en Compose installeren

Installeer Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
```

Controleer daarna:

```bash
docker --version
docker compose version
```

### Stap 3: Repository op de Pi plaatsen

Clone de repository op de Pi, bijvoorbeeld naar `/home/pi/apps/onsinventory`:

```bash
mkdir -p ~/apps
cd ~/apps
git clone <YOUR_GIT_REMOTE_URL> onsinventory
cd onsinventory/backend
```

### Stap 4: Cloudflare Tunnel instellen

1. Koop het domein (bijv. via [Cloudflare Registrar](https://developers.cloudflare.com/registrar/)) - dit zet de nameservers meteen op Cloudflare, geen aparte migratie nodig. Kocht je elders? Voeg de site toe in het Cloudflare dashboard en wijzig de nameservers bij je registrar.
2. Ga naar de [Cloudflare Zero Trust dashboard](https://one.dash.cloudflare.com/) → **Networks → Tunnels → Create a tunnel**.
3. Kies connector type **Cloudflared**, geef de tunnel een naam (bijv. `onsinventory-pi`) en kopieer de tunnel token die je te zien krijgt - deze heb je nodig in Stap 5.
4. Voeg onder **Public Hostnames** drie routes toe, elk wijzend naar de bijbehorende interne service:
   - `onsinventory.com` → `http://onsinventory-frontend:8081`
   - `www.onsinventory.com` → `http://onsinventory-frontend:8081`
   - `api.onsinventory.com` → `http://onsinventory-backend:8080`

   Cloudflare maakt hierbij automatisch de bijbehorende DNS-records aan - er is geen handmatige DNS- of poort-forwarding stap nodig, en je hoeft niets aan de router te wijzigen. TLS wordt afgehandeld door Cloudflare aan de rand van hun netwerk; de containers zelf luisteren alleen intern op plain HTTP. Als je andere domeinen wilt gebruiken, pas dan zowel de Public Hostnames hier als `APP_CORS_ALLOWED_ORIGINS`/`VITE_API_BASE_URL` in `.env.pi` aan.

### Stap 5: Environment file maken

Maak de productieconfiguratie aan:

```bash
cp .env.pi.example .env.pi
```

Pas daarna minimaal dit bestand aan:

```dotenv
POSTGRES_DB=inventorydb
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=kies-een-sterk-wachtwoord
APP_BOOTSTRAP_ENABLED=false
APP_CORS_ALLOWED_ORIGINS=https://onsinventory.com,https://www.onsinventory.com
VITE_API_BASE_URL=https://api.onsinventory.com
CLOUDFLARE_TUNNEL_TOKEN=<token-uit-stap-4>
APP_FRONTEND_URL=https://onsinventory.com
APP_MAIL_FROM=onsinventory@onsinventory.com
RESEND_API_KEY=<api-key-uit-resend-dashboard>
```

`RESEND_API_KEY` is nodig voor "wachtwoord vergeten"-mails en huishouden-uitnodigingen
([Resend](https://resend.com), gratis tot 3.000 mails/maand). Verifieer `onsinventory.com`
als domein in het Resend dashboard - dat voegt een paar DNS-records toe die je direct in
Cloudflare DNS kunt zetten (het domein staat daar al). Zonder geldige `RESEND_API_KEY`
falen deze e-mails stil (gelogd als warning) - de rest van de app blijft gewoon werken.

### Stap 6: Applicatie starten

Start alles vanaf `backend/`. We sluiten `docker-compose.override.yml` hier bewust uit met `-f docker-compose.yml -f docker-compose.cloudflare.yml`, want dat bestand is alleen voor lokale ontwikkeling (het zet o.a. `APP_SECURITY_ENABLED` uit) en zou anders ook in productie meegenomen worden:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi up -d --build
```

Controleer of alles draait:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi ps
```

### Stap 7: Logs controleren

Bekijk logs als iets niet werkt:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f cloudflared
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-backend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-frontend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f postgres
```

De `cloudflared` logs tonen of de tunnel verbonden is met Cloudflare - dat is het eerste om te checken als de site extern niet bereikbaar is.

### Stap 8: Deployment valideren

Controleer lokaal op de Pi:

```bash
curl http://localhost:8080/actuator/health
```

Controleer daarna extern (bijv. vanaf je telefoon op mobiele data, niet op hetzelfde wifi):

- `https://onsinventory.com`
- `https://www.onsinventory.com`
- `https://api.onsinventory.com/actuator/health`

Ook op de Cloudflare Zero Trust dashboard (Networks → Tunnels) zie je de tunnel als "Healthy" staan zodra `cloudflared` verbonden is.

### Stap 9: Updates uitrollen

Bij handmatige updates:

```bash
cd ~/apps/onsinventory
git pull
cd backend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi up -d --build
```

### Stap 10: CI/CD via GitHub Actions instellen

Er zijn drie workflows in `.github/workflows/`:

| Workflow | Trigger | Wat het doet | Waar het draait |
|----------|---------|--------------|-----------------|
| `ci.yml` | pull request naar `main` (en push naar `main`) | backend tests + frontend lint/test/build, parallel | GitHub-hosted runners (snel, niet op de Pi) |
| `release.yml` | PR gemerged naar `main` | bepaalt de versiebump uit de branchnaam, maakt een GitHub release en start de deploy | GitHub-hosted runner |
| `deploy.yml` | release published (handmatig of via `release.yml`), of handmatig via de Actions-tab | schrijft `.env.pi` en voert `docker compose up -d --build` uit | self-hosted runner op de Pi |

**Branch-conventie voor de versiebump:**

```text
bug/<story>-korte-omschrijving       -> patch  (1.2.3 -> 1.2.4)
feature/<story>-korte-omschrijving   -> minor  (1.2.3 -> 1.3.0)
breaking/<story>-korte-omschrijving  -> major  (1.2.3 -> 2.0.0)
overige prefixes (chore/, docs/, …)  -> merge zonder release/deploy
```

De flow: maak een feature branch → open een PR → `ci.yml` draait de tests → merge als alles groen is → `release.yml` maakt automatisch de release (bijv. `v1.3.0`) → `deploy.yml` rolt die release uit op de Pi. Een release die je zelf handmatig in GitHub aanmaakt triggert de deploy ook.

De deploy-workflow draait op een self-hosted GitHub Actions runner die je zelf op de Pi installeert (GitHub repository → **Settings → Actions → Runners → New self-hosted runner**, volg de instructies daar). De runner haalt jobs op via een uitgaande verbinding naar GitHub - net als `cloudflared` hoeft er dus niets inbound bereikbaar te zijn. Omdat de tests al in de PR draaien, doet de Pi alleen nog `docker compose up -d --build` (met Docker layer caching voor de Maven dependencies) en ruimt daarna oude images op.

#### GitHub secrets die je moet toevoegen

Voeg in GitHub repository settings deze secrets toe:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_BOOTSTRAP_ENABLED`
- `APP_CORS_ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `CLOUDFLARE_TUNNEL_TOKEN`
- `APP_FRONTEND_URL`
- `APP_MAIL_FROM`
- `RESEND_API_KEY`

#### Betekenis van de secrets

Voorbeeldwaarden:

```text
POSTGRES_DB=inventorydb
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=<strong-password>
APP_BOOTSTRAP_ENABLED=false
APP_CORS_ALLOWED_ORIGINS=https://onsinventory.com,https://www.onsinventory.com
VITE_API_BASE_URL=https://api.onsinventory.com
CLOUDFLARE_TUNNEL_TOKEN=<token-uit-de-cloudflare-zero-trust-dashboard>
APP_FRONTEND_URL=https://onsinventory.com
APP_MAIL_FROM=onsinventory@onsinventory.com
RESEND_API_KEY=<api-key-uit-resend-dashboard>
```

### Stap 11: Eerste automatische deploy testen

Maak eenmalig een release `v1.0.0` aan in GitHub (repository → Releases → **Draft a new release**, tag `v1.0.0`, target `main`). Dat seedt de versienummering én triggert meteen de eerste deploy. Daarna gaat alles via branches: merge bijv. een `bug/...`-PR en `release.yml` maakt vanzelf `v1.0.1` aan en deployt die.

Je kunt `deploy.yml` ook altijd handmatig starten via de Actions-tab (workflow_dispatch).

Daarna kun je op de Pi controleren:

```bash
cd ~/apps/onsinventory/backend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi ps
```

## Local Development (H2 Database)

### Snelste manier om te starten

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory/backend
mvn clean package
mvn spring-boot:run
```

App draait op: **http://localhost:8080**

H2 Console: **http://localhost:8080/h2-console**

---

## Docker (Local Development)

### Build en run met Docker Compose

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory/backend
docker compose up -d --build
```

Voor lokale frontend development gebruikt de frontend standaard:

- `http://localhost:8080` (backend rechtstreeks op `http://localhost:8081`)

### Stop en cleanup

```bash
docker compose down
docker compose down -v
```

---

## Environment Variables

### Development (H2)

```bash
# No env vars needed - uses H2 in-memory database
```

### Production (PostgreSQL)

```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://postgres:5432/inventorydb
SPRING_DATASOURCE_USERNAME=inventory_user
SPRING_DATASOURCE_PASSWORD=<strong-password>
SPRING_PROFILES_ACTIVE=prod
APP_CORS_ALLOWED_ORIGINS=https://onsinventory.com,https://www.onsinventory.com
VITE_API_BASE_URL=https://api.onsinventory.com
```

---

## Health Checks

### Backend

```bash
curl http://localhost:8080/actuator/health
```

### Public endpoints

```bash
curl https://api.onsinventory.com/actuator/health
curl -I https://onsinventory.com
```

---

## Monitoring & Logs

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f cloudflared
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-backend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-frontend
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f postgres
```

---

## Troubleshooting

### Site is extern niet bereikbaar

Controleer:

- de tunnel staat op "Healthy" in de Cloudflare Zero Trust dashboard (Networks → Tunnels)
- `cloudflared` logs bevatten geen verbindingsfouten
- de Public Hostnames in de tunnel wijzen naar `http://onsinventory-frontend:8081` (voor `onsinventory.com`/`www`) en `http://onsinventory-backend:8080` (voor `api.onsinventory.com`)
- `CLOUDFLARE_TUNNEL_TOKEN` in `.env.pi` is correct en niet verlopen/ingetrokken

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f cloudflared
```

### Backend start niet

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-backend
```

Controleer ook of PostgreSQL gezond is:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi ps
```

### Frontend kan API niet bereiken

Controleer:

- `VITE_API_BASE_URL` in `.env.pi`
- `api.onsinventory.com` wijst in de Cloudflare Tunnel Public Hostnames naar `http://onsinventory-backend:8080`
- `APP_CORS_ALLOWED_ORIGINS` bevat je frontend domeinen

Rebuild daarna:

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi up -d --build
```

### Database connection failed

```bash
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f postgres
docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi logs -f onsinventory-backend
```

### Nieuwe code wordt niet uitgerold via GitHub Actions

Controleer:

- of de gemergede branch een release-prefix had (`bug/`, `feature/`, `breaking/`) - andere prefixes maken geen release aan en deployen dus niet
- de run output van `release.yml` en `deploy.yml` in de Actions-tab
- of de self-hosted runner op de Pi actief is (repository → Settings → Actions → Runners)
- of Docker beschikbaar is voor de gebruiker waaronder de runner draait

---

## Database migrations (Flyway)

Production (the `prod` profile, Postgres) now manages its schema with Flyway
instead of Hibernate's `ddl-auto`. Migrations live in
`src/main/resources/db/migration/postgresql/`. On first deploy of this
version, Flyway will notice the existing tables predate it, automatically
baseline the database at V1, and then run `V2__add_households.sql` for real —
this creates the `households` table, assigns all of Sean and Natalia's
existing data to one household, and backfills their `email`/`last_name`.
This was verified against a copy of the pre-migration schema before shipping;
no manual DB steps are needed on deploy. Local dev (H2) is unaffected and
keeps using `ddl-auto: update`, since it's a fresh in-memory database on every
run with nothing to migrate.

For any future schema change: add a new `V3__...sql` (etc.) file in that same
folder rather than relying on Hibernate to alter the production schema.

---

## Next Steps

1. Add authentication
2. Add backups for PostgreSQL volumes
3. Add fail2ban or similar host hardening
4. Add uptime monitoring
5. Add automatic OS and container patch strategy
