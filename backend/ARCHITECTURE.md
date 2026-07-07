# 📦 Architecture Overview

## OnsInventory Backend

Een **backend API** gebouwd met **Java 25 + Spring Boot 4.1** voor voorraadbeheer per huishouden en receptaanbevelingen op basis van wat je in huis hebt.

---

## 📊 Architecture

```
┌─────────────────┐
│     Frontend    │  (React/Vite)
├─────────────────┤
│    REST API     │  (Spring Boot, JWT auth)
├─────────────────┤
│  Service Layer  │  (Business logic, recommendations)
├─────────────────┤
│   Repositories  │  (Spring Data JPA)
├─────────────────┤
│   Database      │  (H2 for dev, PostgreSQL + Flyway for prod)
└─────────────────┘
```

---

## 🗂️ Project Structure

```
src/main/java/nl/seanderoo/inventory/
├── controller/    # AuthController, HouseholdController, InventoryController,
│                  # LocationController, RecipeController, RecipeRecommendationController
├── service/       # UserService, HouseholdService, InventoryService, RecipeService,
│                  # RecipeRecommendationService, EmailService, JwtService,
│                  # CurrentHouseholdProvider
├── repository/    # Spring Data repositories (per entity)
├── model/         # JPA entities: User, Household, HouseholdInvite, PasswordResetToken,
│                  # Location, InventoryItem, Recipe, RecipeIngredient
├── dto/           # API request/response objects
├── security/      # JwtAuthenticationFilter
├── exception/     # GlobalExceptionHandler + API error types
└── config/        # SecurityConfig, PasswordConfig, OpenApiConfig, DataInitializationConfig

src/main/resources/
├── application.yml               # Default profile (H2, security uit)
├── application-prod.yml          # Prod profile (PostgreSQL, Flyway, security aan)
└── db/migration/postgresql/      # Flyway migraties
```

---

## 📊 Data Model

```
Household ── has many ── Users, Locations, InventoryItems, Recipes, HouseholdInvites
Location ── has many ── InventoryItems
Recipe ── has many ── RecipeIngredients
User ── has many ── PasswordResetTokens
```

Alle data is gescoped op household: elke query filtert op het household van de ingelogde gebruiker (`CurrentHouseholdProvider`).

---

## 🧠 Recommendation Algorithm

1. Haal alle recepten en voorraaditems van het household op
2. Match per recept de vereiste (niet-optionele) ingrediënten tegen de voorraad
   op naam (case-insensitive, substring in beide richtingen)
3. `matchPercentage = matched / totaal × 100`
4. Sorteer op matchPercentage, daarna op aantal bijna-verlopende ingrediënten
   (voedselverspilling tegengaan)

Bij het koken (`POST /api/recipes/{id}/cook`) worden hoeveelheden afgeboekt, met
eenheid-conversie (gewicht/volume, bijv. gram ↔ kg, tbsp ↔ ml) waar mogelijk.

---

## 🔐 Security

- JWT bearer tokens (login met username/wachtwoord, BCrypt hashes)
- `app.security.enabled: false` in het default profiel voor lokale development
- Publiek zonder token: register, login, forgot/reset-password, auth config,
  invite preview, Swagger UI
- Wachtwoord-reset en household-invites via e-mail (Resend API)

---

## 📝 Documentation

| File | Purpose |
|------|---------|
| **README.md** | Volledige documentatie en API-overzicht |
| **QUICKSTART.md** | Snelle setup guide |
| **DEPLOYMENT.md** | Deploy naar Raspberry Pi (Docker Compose + Cloudflare Tunnel) |
| **ARCHITECTURE.md** | Dit bestand |

Actuele API-documentatie: Swagger UI op `/swagger-ui.html`.
