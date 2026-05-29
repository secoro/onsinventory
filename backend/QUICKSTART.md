# 🚀 Quick Start Guide

Volg deze stappen om snel aan de slag te gaan met OnsInventory.

## 1️⃣ Clone of Download het Project

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory/backend
```

## 2️⃣ Keuze: Hoe wil je starten?

### Option A: Lokaal (H2 Database) - Snelste! ⚡

```bash
# Start de app
mvn spring-boot:run

# Open in browser
open http://localhost:8080

# H2 Console (database viewer)
open http://localhost:8080/h2-console
# Login: sa / (empty password)
```

✅ App draait zonder extra setup!
✅ Perfecte database is in-memory en reset na restart

---

### Option B: Docker Compose (PostgreSQL) 🐳

```bash
# Build en start
docker compose up -d

# Kijk logs
docker compose logs -f onsinventory-backend

# Stop
docker compose down
```

✅ Realistische productie setup
✅ Automatische database migrations

---

## 3️⃣ Check of alles werkt

```bash
# Test API
curl http://localhost:8080/api/locations

# Zou dit moeten returnen:
# [{"id":1,"name":"Pantry",...}, {"id":2,"name":"Fridge",...}, ...]
```

---

## 4️⃣ Data Toevoegen

### Via cURL / Terminal

```bash
# Voeg item toe aan voorraden
curl -X POST http://localhost:8080/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tomatoes",
    "category": "vegetable",
    "location": "Fridge",
    "quantity": 5,
    "unit": "pieces",
    "expiryDate": "2026-06-15"
  }'

# Voeg recept toe
curl -X POST http://localhost:8080/api/recipes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Vegetable Stir Fry",
    "description": "Quick and healthy",
    "instructions": "Heat oil, add veggies, stir, serve",
    "servings": 2,
    "preparationTimeMinutes": 10,
    "cookingTimeMinutes": 10,
    "difficulty": "easy",
    "cuisine": "Asian"
  }'
```

### Via H2 Console (lokaal)

Open http://localhost:8080/h2-console en voer SQL uit:

```sql
-- Add items
INSERT INTO inventory_items (name, category, location_id, quantity, unit, expiry_date, added_date, expired, created_at, updated_at)
VALUES ('Eggs', 'dairy', 2, 12, 'pieces', '2026-06-10', CURRENT_DATE, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO inventory_items (name, category, location_id, quantity, unit, expiry_date, added_date, expired, created_at, updated_at)
VALUES ('Butter', 'dairy', 2, 500, 'grams', '2026-06-20', CURRENT_DATE, false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- Check data
SELECT * FROM location;
SELECT * FROM inventory_items;
SELECT * FROM recipe;
```

---

## 5️⃣ Recepten-aanbevelingen bekijken

```bash
# Get recommendations (top 10)
curl http://localhost:8080/api/recommendations

# Get recommendations (top 5)
curl "http://localhost:8080/api/recommendations?limit=5"

# Get recipes using expiring items
curl http://localhost:8080/api/recommendations/expiring

# Get specific recipe match score
curl http://localhost:8080/api/recommendations/recipe/1
```

### Voorbeeld response:
```json
[
  {
    "recipe": {
      "id": 3,
      "name": "Cheese Omelette",
      "difficulty": "easy",
      "cuisine": "French"
    },
    "matchPercentage": 100,
    "matchedIngredients": 3,
    "totalIngredients": 3,
    "missingIngredients": [],
    "expiringIngredientsUsed": ["Eggs"]
  }
]
```

---

## 6️⃣ Alle beschikbare endpoints

### 📍 Locations
```
GET    /api/locations
POST   /api/locations
GET    /api/locations/{id}
PUT    /api/locations/{id}
DELETE /api/locations/{id}
```

### 🛒 Inventory
```
GET       /api/inventory
POST      /api/inventory
GET       /api/inventory/{id}
PUT       /api/inventory/{id}
DELETE    /api/inventory/{id}
GET       /api/inventory/location/{location}
GET       /api/inventory/category/{category}
GET       /api/inventory/search?q=...
GET       /api/inventory/expiring
GET       /api/inventory/expired
```

### 📖 Recipes
```
GET       /api/recipes
POST      /api/recipes
GET       /api/recipes/{id}
PUT       /api/recipes/{id}
DELETE    /api/recipes/{id}
GET       /api/recipes/difficulty/{difficulty}
GET       /api/recipes/cuisine/{cuisine}
GET       /api/recipes/search?q=...
```

### 🎯 Recommendations
```
GET       /api/recommendations
GET       /api/recommendations?limit=20
GET       /api/recommendations/cuisine/{cuisine}
GET       /api/recommendations/recipe/{recipeId}
GET       /api/recommendations/expiring
```

---

## 7️⃣ Advanced: Samples Data Laden

De app creëert automatisch 3 sample recepten:
1. **Tomato Pasta** - Italiaans
2. **Vegetable Stir Fry** - Aziatisch  
3. **Cheese Omelette** - Frans

Voeg items toe met dezelfde ingrediëntnamen voor automatische matches!

---

## 8️⃣ Production Deployment

### Build Production JAR
```bash
mvn clean package -DskipTests
```

### Deploy met Docker
```bash
docker build -t onsinventory-backend:latest .
docker run -p 8080:8080 onsinventory-backend:latest
```

### Deploy met Kubernetes
Zie [DEPLOYMENT.md](DEPLOYMENT.md) voor gedetailleerde instructies!

---

## 🔧 Troubleshooting

### App start niet
```bash
# Check Java version
java -version

# Zorg dat je Java 21+ hebt!
# Download: https://adoptium.net/
```

### Port 8080 already in use
```bash
# Kill bestaand process
lsof -ti:8080 | xargs kill -9

# Of gebruik ander port
mvn spring-boot:run -Dspring-boot.run.arguments="--server.port=8081"
```

### H2 Console error
```bash
# H2 jar issue? Verwijder target folder
rm -rf target
mvn clean package
```

### Database reset nodig
```bash
# Stop app
# Verwijder: target/ en maak schoon
mvn clean package
mvn spring-boot:run
```

---

## 📚 Volgende Stappen

1. **Frontend toevoegen**: React app voor mooi UI
2. **Authenticatie**: Keycloak/OAuth2 integration
3. **Notifications**: Alerting voor verlopende items
4. **AI**: Machine Learning voor recipe suggestions
5. **Mobile**: React Native app
6. **Scaling**: Redis caching, multi-instance setup

---

## 🎯 Tips & Tricks

### Sneller testen met cURL script
```bash
#!/bin/bash

API="http://localhost:8080"

# Add inventory
curl -X POST $API/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"name":"Milk","category":"dairy","location":"Fridge","quantity":1,"unit":"liter"}'

# Get recommendations
curl $API/api/recommendations | jq '.'
```

### Bulk data laden
```bash
# Create script met 50+ items en recepten
# Run eenmaal om database te vullen
./load-sample-data.sh
```

### Monitor performance
```bash
# Check health endpoint
curl http://localhost:8080/actuator/health | jq '.'

# Monitor database
# Local: H2 console
# Docker: pgAdmin of DBeaver
```

---

## ❓ Vragen?

Check:
- [README.md](README.md) - Volledige documentatie
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deploy opties
- Application logs in target/ of docker compose logs

Veel plezier! 🎉
