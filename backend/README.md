# 🍳 OnsInventory Backend

Een Spring Boot applicatie waarmee je de inhoud van je voorraadkast, koelkast en vriezer kunt beheren en recepten kunt aanbevelen op basis van wat je al in huis hebt.

## ✨ Wat deze app doet

Deze repository bevat een **Java 25 + Spring Boot backend API** voor:

- **Voorraadbeheer** van pantry, koelkast en vriezer
- **Locatiebeheer** voor opslagplekken zoals Pantry, Fridge en Freezer
- **Receptbeheer** met ingrediënten, bereidingstijd en moeilijkheid
- **Receptaanbevelingen** op basis van beschikbare ingrediënten
- **Vervaldatumdetectie** voor verlopen en bijna-verlopende producten
- **Huishoudens** met leden, uitnodigingen per e-mail en gedeelde voorraad

## 🛠️ Tech stack

- **Java 25**
- **Spring Boot 4.1**
- **Maven**
- **Spring Web**
- **Spring Data JPA / Hibernate**
- **Flyway** voor productie-migraties
- **H2** voor lokale development
- **PostgreSQL** voor productie
- **Spring Security + JWT** (uit te schakelen voor lokale development)
- **Spring Boot Actuator** voor health/info endpoints
- **springdoc-openapi** voor Swagger UI

## 📦 Projectstatus

De backend is functioneel en bevat:

- CRUD-endpoints voor locaties, voorraaditems en recepten
- Een recommendation service die recepten rangschikt op ingredient-match
- Accounts, login (JWT), wachtwoord-reset en huishouden-uitnodigingen via e-mail (Resend)
- Seed data voor lokale development
- Integratietests voor foutafhandeling en receptservice

## 🚀 Snel starten

### Vereisten

- Java 25+
- Maven 3.8+

### Lokaal starten met H2

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory/backend
mvn spring-boot:run
```

De applicatie draait daarna op:

- API: `http://localhost:8080`
- H2 console: `http://localhost:8080/h2-console`
- Actuator health: `http://localhost:8080/actuator/health`

### Builden

```bash
mvn clean package
```

### JAR starten

```bash
java -jar target/onsinventory-backend-1.0.0.jar
```

## 🧪 Lokale database en seed data

Standaard gebruikt de app lokaal een in-memory H2 database:

- JDBC URL: `jdbc:h2:mem:inventorydb`
- Username: `sa`
- Password: leeg

Bij lokale startup wordt automatisch demo-data geladen als de tabellen leeg zijn. Dit gedrag wordt gestuurd via:

```yaml
app:
  bootstrap:
    enabled: true
```

Standaardwaarden:

- `application.yml` → `true`
- `application-prod.yml` → `true` (alleen actief als de database nog leeg is)

De seed data bevat onder andere:

- standaardlocaties zoals Pantry, Fridge en Freezer
- voorbeeldvoorraad
- voorbeeldrecepten voor recommendation testing

## ⚙️ Configuratie

### Development

Belangrijke instellingen uit `src/main/resources/application.yml`:

- H2 in-memory datasource
- `spring.jpa.hibernate.ddl-auto=update`
- H2 console enabled op `/h2-console`
- logging voor `nl.seanderoo.inventory` op `DEBUG`

### Production

Gebruik het `prod` profiel voor PostgreSQL:

```bash
java -jar target/onsinventory-backend-1.0.0.jar --spring.profiles.active=prod
```

Ondersteunde environment variables:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

Voorbeeld:

```bash
SPRING_DATASOURCE_URL='jdbc:postgresql://localhost:5432/inventorydb' \
SPRING_DATASOURCE_USERNAME='inventory_user' \
SPRING_DATASOURCE_PASSWORD='inventory_password' \
java -jar target/onsinventory-backend-1.0.0.jar --spring.profiles.active=prod
```

## 🔐 Security

Authenticatie loopt via JWT (login met username/wachtwoord). Voor lokale development staat `app.security.enabled: false` in `application.yml`, waardoor alle endpoints open zijn. In het `prod` profiel staat security aan en zijn alleen de auth-endpoints en invite-preview publiek.

## 📡 API-overzicht

Volledige, actuele documentatie staat in Swagger UI: `http://localhost:8080/swagger-ui.html`.

### Auth & Household

```text
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
POST   /api/auth/change-password
GET    /api/auth/me
GET    /api/auth/config
DELETE /api/auth/account
GET    /api/household
POST   /api/household/invite
GET    /api/household/invite/{token}
```

### Locations

```text
GET    /api/locations
POST   /api/locations
GET    /api/locations/{id}
PUT    /api/locations/{id}
DELETE /api/locations/{id}
```

### Inventory

```text
GET    /api/inventory
POST   /api/inventory
GET    /api/inventory/{id}
PUT    /api/inventory/{id}
DELETE /api/inventory/{id}
```

### Recipes

```text
GET    /api/recipes
POST   /api/recipes
GET    /api/recipes/{id}
PUT    /api/recipes/{id}
DELETE /api/recipes/{id}
GET    /api/recipes/{id}/availability?servings=2
POST   /api/recipes/{id}/cook
```

### Recommendations

```text
GET    /api/recommendations
GET    /api/recommendations?limit=20
```

## 🧠 Hoe de aanbevelingen werken

De recommendation service vergelijkt receptingrediënten met je huidige voorraad en berekent per recept een matchscore.

De sortering houdt rekening met:

1. **Match percentage** — hoeveel vereiste ingrediënten aanwezig zijn
2. **Verlopende ingrediënten** — recepten die bijna-verlopende producten gebruiken krijgen extra prioriteit

Daardoor krijg je sneller recepten te zien die:

- direct kookbaar zijn
- weinig extra boodschappen vereisen
- voedselverspilling helpen verminderen

## 📝 Voorbeeldrequests

### Alle locaties ophalen

```bash
curl http://localhost:8080/api/locations
```

### Voorraaditem toevoegen

```bash
curl -X POST http://localhost:8080/api/inventory \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "Tomatoes",
    "category": "vegetable",
    "location": "Fridge",
    "quantity": 4,
    "unit": "pieces",
    "expiryDate": "2026-06-01",
    "notes": "Fresh from market"
  }'
```

### Recepten ophalen

```bash
curl http://localhost:8080/api/recipes
```

### Aanbevelingen ophalen

```bash
curl 'http://localhost:8080/api/recommendations?limit=5'
```

## 🧱 Domeinmodel

### Location

- `id`
- `name`
- `description`
- `icon`

### InventoryItem

- `id`
- `name`
- `category`
- `location`
- `quantity`
- `unit`
- `expiryDate`
- `addedDate`
- `expired`
- `notes`

### Recipe

- `id`
- `name`
- `description`
- `instructions`
- `servings`
- `preparationTimeMinutes`
- `cookingTimeMinutes`
- `difficulty`
- `cuisine`
- `ingredients`

### RecipeIngredient

- `id`
- `recipe`
- `ingredientName`
- `quantity`
- `unit`
- `optional`
- `notes`

## 🧪 Testen

Tests draaien met Maven:

```bash
mvn test
```

Aanwezige tests omvatten onder andere:

- exception handling integratietests
- recipe service integratietests

## 🐳 Docker

Er zijn Docker-bestanden aanwezig in deze module:

- `Dockerfile`
- `docker-compose.yml`

Gebruik voor meer details ook:

- [QUICKSTART.md](QUICKSTART.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## 📁 Projectstructuur

```text
src/main/java/nl/seanderoo/inventory/
├── config/        # Security en data initialization
├── controller/    # REST controllers
├── dto/           # API DTOs
├── exception/     # API error handling
├── model/         # JPA entities
├── repository/    # Spring Data repositories
├── service/       # Business logic en recommendations
└── InventoryApplication.java
```

## 🔭 Mogelijke vervolgstappen

Handige uitbreidingen voor een volgende iteratie:

- barcode scanning voor snelle invoer
- shopping list generatie op basis van ontbrekende ingrediënten
- betere fuzzy matching en voedingsfilters

## 📚 Extra documentatie

- [QUICKSTART.md](QUICKSTART.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## 📄 Licentie

MIT

## 🍓 Raspberry Pi deployment

Deze repository bevat nu ook een self-hosted productie-opzet voor Raspberry Pi met:

- `backend/docker-compose.yml` voor PostgreSQL, backend en frontend
- `backend/docker-compose.cloudflare.yml` voor de `cloudflared` tunnel container
- TLS termination via Cloudflare (geen Let's Encrypt/poorten nodig op de Pi zelf)
- frontend op `https://onsinventory.com`
- backend API op `https://api.onsinventory.com`
- GitHub Actions deployment via een self-hosted runner op de Pi (geen SSH)

Zie `backend/DEPLOYMENT.md` voor de volledige stap-voor-stap gids.

### Vereisten op de Pi

- Raspberry Pi OS 64-bit
- Docker en Docker Compose plugin
- een self-hosted GitHub Actions runner (repository → Settings → Actions → Runners)
- geen open poorten nodig - `cloudflared` maakt alleen uitgaande verbindingen

### Eerste setup

```bash
cd /path/to/onsinventory/backend
cp .env.pi.example .env.pi
# pas daarna POSTGRES_PASSWORD, CLOUDFLARE_TUNNEL_TOKEN en eventuele domeinen aan

docker compose -f docker-compose.yml -f docker-compose.cloudflare.yml --env-file .env.pi up -d --build
```

### GitHub Actions secrets voor deploy naar de Pi

Voeg deze repository secrets toe:

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `APP_BOOTSTRAP_ENABLED`
- `APP_CORS_ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `CLOUDFLARE_TUNNEL_TOKEN`

Na elke merge naar `main` draait `.github/workflows/deploy-to-pi.yml` automatisch tests en daarna een redeploy op de Raspberry Pi via de self-hosted runner.

---
Happy coding!
