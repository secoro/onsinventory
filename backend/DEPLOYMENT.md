# 🚀 Deployment Guide

Gids voor het deployen van OnsInventory. De aanbevolen productie-opzet voor deze repository is nu een self-hosted Raspberry Pi deployment met Docker Compose, PostgreSQL, frontend, backend en Caddy.

## Raspberry Pi Deployment (Recommended)

### Architectuur

De productie-opzet bestaat uit vier containers:

- `caddy` voor HTTPS en reverse proxy
- `onsinventory-frontend` voor de React/Vite frontend
- `onsinventory-backend` voor de Spring Boot API
- `postgres` voor persistente data

Verkeer loopt als volgt:

- `https://onsinventory.com` → frontend
- `https://www.onsinventory.com` → frontend
- `https://api.onsinventory.com` → backend

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

### Stap 4: Domeinen naar je thuisverbinding laten wijzen

Maak DNS records aan bij je domeinprovider:

- `@` of `onsinventory.com` → publieke IP van je thuisnetwerk
- `www` → publieke IP van je thuisnetwerk
- `api` → publieke IP van je thuisnetwerk

Als je een dynamisch IP-adres hebt, gebruik dan Dynamic DNS of update je records wanneer je IP verandert.

### Stap 5: Port forwarding instellen op je router

Forward deze poorten naar het lokale IP-adres van je Raspberry Pi:

- TCP `80`
- TCP `443`

Zorg dat je Pi een vast lokaal IP-adres heeft via DHCP reservation of statische configuratie.

### Stap 6: Environment file maken

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
```

### Stap 7: Caddy domeinen controleren

De reverse proxy configuratie staat in `deploy/Caddyfile`.

Standaard:

- `onsinventory.com` en `www.onsinventory.com` gaan naar de frontend
- `api.onsinventory.com` gaat naar de backend

Als je andere domeinen wilt gebruiken, pas dan zowel `deploy/Caddyfile` als `.env.pi` aan.

### Stap 8: Applicatie starten

Start alles vanaf `backend/`:

```bash
docker compose --env-file .env.pi up -d --build
```

Controleer of alles draait:

```bash
docker compose --env-file .env.pi ps
```

### Stap 9: Logs controleren

Bekijk logs als iets niet werkt:

```bash
docker compose --env-file .env.pi logs -f caddy
docker compose --env-file .env.pi logs -f onsinventory-backend
docker compose --env-file .env.pi logs -f onsinventory-frontend
docker compose --env-file .env.pi logs -f postgres
```

### Stap 10: Deployment valideren

Controleer lokaal op de Pi:

```bash
curl http://localhost:8080/actuator/health
```

Controleer daarna extern:

- `https://onsinventory.com`
- `https://www.onsinventory.com`
- `https://api.onsinventory.com/actuator/health`

### Stap 11: Updates uitrollen

Bij handmatige updates:

```bash
cd ~/apps/onsinventory
git pull
cd backend
docker compose --env-file .env.pi up -d --build
```

### Stap 12: Automatische deploy via GitHub Actions instellen

De workflow staat in:

- `.github/workflows/deploy-to-pi.yml`

Deze workflow:

- draait backend tests
- draait frontend tests
- synchroniseert de repository naar de Pi via SSH
- voert daarna `docker compose up -d --build` uit op de Pi

#### GitHub secrets die je moet toevoegen

Voeg in GitHub repository settings deze secrets toe:

- `PI_HOST`
- `PI_USER`
- `PI_APP_PATH`
- `PI_SSH_PRIVATE_KEY`
- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_BOOTSTRAP_ENABLED`
- `APP_CORS_ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`

#### Betekenis van de secrets

Voorbeeldwaarden:

```text
PI_HOST=203.0.113.10
PI_USER=pi
PI_APP_PATH=/home/pi/apps/onsinventory
POSTGRES_DB=inventorydb
POSTGRES_USER=inventory_user
POSTGRES_PASSWORD=<strong-password>
APP_BOOTSTRAP_ENABLED=false
APP_CORS_ALLOWED_ORIGINS=https://onsinventory.com,https://www.onsinventory.com
VITE_API_BASE_URL=https://api.onsinventory.com
```

#### SSH key voor GitHub Actions

Maak op je eigen machine een deploy key pair:

```bash
ssh-keygen -t ed25519 -C "github-actions-pi-deploy" -f ~/.ssh/github_actions_pi
```

Voeg daarna de public key toe aan `~/.ssh/authorized_keys` op de Pi.

Voorbeeld:

```bash
cat ~/.ssh/github_actions_pi.pub | ssh pi@<PI_HOST> 'mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys'
```

Zet de private key als GitHub secret in:

- `PI_SSH_PRIVATE_KEY`

### Stap 13: Eerste automatische deploy testen

Merge een wijziging naar `main` of start de workflow handmatig via GitHub Actions.

Daarna kun je op de Pi controleren:

```bash
cd ~/apps/onsinventory/backend
docker compose --env-file .env.pi ps
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

- `http://localhost:8080`

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
SPRING_JPA_HIBERNATE_DDL_AUTO=update
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
docker compose --env-file .env.pi logs -f caddy
docker compose --env-file .env.pi logs -f onsinventory-backend
docker compose --env-file .env.pi logs -f onsinventory-frontend
docker compose --env-file .env.pi logs -f postgres
```

---

## Troubleshooting

### HTTPS certificate wordt niet uitgegeven

Controleer:

- DNS records wijzen naar je publieke IP
- poort `80` en `443` staan open
- je router forwardt naar de Pi
- Caddy logs bevatten geen ACME errors

```bash
docker compose --env-file .env.pi logs -f caddy
```

### Backend start niet

```bash
docker compose --env-file .env.pi logs -f onsinventory-backend
```

Controleer ook of PostgreSQL gezond is:

```bash
docker compose --env-file .env.pi ps
```

### Frontend kan API niet bereiken

Controleer:

- `VITE_API_BASE_URL` in `.env.pi`
- `api.onsinventory.com` in `deploy/Caddyfile`
- `APP_CORS_ALLOWED_ORIGINS` bevat je frontend domeinen

Rebuild daarna:

```bash
docker compose --env-file .env.pi up -d --build
```

### Database connection failed

```bash
docker compose --env-file .env.pi logs -f postgres
docker compose --env-file .env.pi logs -f onsinventory-backend
```

### Nieuwe code wordt niet uitgerold via GitHub Actions

Controleer:

- GitHub Actions run output
- SSH toegang vanaf GitHub Actions
- juiste waarde van `PI_APP_PATH`
- of Docker beschikbaar is voor de `PI_USER`

---

## Next Steps

1. Add authentication
2. Add backups for PostgreSQL volumes
3. Add fail2ban or similar host hardening
4. Add uptime monitoring
5. Add automatic OS and container patch strategy
