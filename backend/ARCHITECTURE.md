# 📦 Project Overview

## OnsInventory Backend

Een complete **backend API** gebouwd met **Java 21 + Spring Boot 3.2** voor voorraadbeheer en intelligente receptaanbevelingen.

---

## 🎯 Project Doelstellingen

✅ **Voorraadbeheer** - Track inhoud van kast, koelkast, vriezer
✅ **ReceptenDB** - Beheer verzameling van recepten  
✅ **Aanbevelingen** - Intelligente suggesties gebaseerd op beschikbare ingrediënten
✅ **Verloopdetectie** - Markeer items die binnenkort verlopen
✅ **API-first** - Clean REST API voor frontend/mobile integrations

---

## 📊 Architecture Overview

```
┌─────────────────┐
│     Frontend    │  (React/Vite, Mobile)
├─────────────────┤
│    REST API     │  (Spring Boot 3.2, Java 21)
├─────────────────┤
│  Service Layer  │  (Business Logic, Recommendations)
├─────────────────┤
│   Repositories  │  (JPA, Database Access)
├─────────────────┤
│   Database      │  (H2 for dev, PostgreSQL for prod)
└─────────────────┘
```

---

## 🗂️ Project Structure

```
backend/
├── src/main/java/nl/seanderoo/inventory/
│   ├── controller/          # 4 REST Controllers
│   │   ├── InventoryController
│   │   ├── RecipeController
│   │   ├── RecipeRecommendationController  ⭐ The Magic
│   │   └── LocationController
│   │
│   ├── service/             # 3 Services
│   │   ├── InventoryService
│   │   ├── RecipeService
│   │   └── RecipeRecommendationService  ⭐ Recommendation Algorithm
│   │
│   ├── repository/          # 4 JPA Repositories
│   │   ├── LocationRepository
│   │   ├── InventoryItemRepository
│   │   ├── RecipeRepository
│   │   └── RecipeIngredientRepository
│   │
│   ├── model/               # 4 JPA Entities
│   │   ├── Location
│   │   ├── InventoryItem
│   │   ├── Recipe
│   │   └── RecipeIngredient
│   │
│   ├── dto/                 # Data Transfer Objects
│   │   ├── InventoryItemDTO
│   │   ├── RecipeDTO
│   │   ├── RecipeIngredientDTO
│   │   └── RecipeRecommendationDTO
│   │
│   ├── config/              # Configuration
│   │   └── DataInitializationConfig
│   │
│   └── InventoryApplication.java
│
├── src/main/resources/
│   ├── application.yml          # Default (H2)
│   └── application-prod.yml     # Production (PostgreSQL)
│
├── pom.xml                      # Maven configuration
├── Dockerfile                   # Docker image
├── docker-compose.yml           # Local dev environment
├── README.md                    # Full documentation
├── QUICKSTART.md                # 5-minute setup guide
├── DEPLOYMENT.md                # Deploy guides
└── .gitignore
```

---

## 📊 Data Model

### Core Entities

```
Location (Pantry, Fridge, Freezer)
    ↓
    └── has many InventoryItems
            (name, quantity, expiry date, etc.)

Recipe
    ├── has many RecipeIngredients
    │   (ingredient name, quantity, unit)
    │
    └── used for matching with InventoryItems
```

### Key Relationships

- **1:N** Location → InventoryItems
- **1:N** Recipe → RecipeIngredients
- **N:M** (implicit) Recipes ↔ Inventory Items (via ingredient matching)

---

## 🧠 Recommendation Algorithm

### How It Works

```
1. Get all recipes from database
2. Get all inventory items from database
3. For each recipe:
   a. Extract required ingredients
   b. Try to match against inventory items
      - Exact match ("Tomato" == "Tomato")
      - Partial match ("Tomato" in "Fresh Tomatoes")
   c. Calculate: (matched / total) × 100 = matchPercentage
   d. Check if matched items are expiring soon
   e. Score and sort results
4. Return top N recommendations
```

### Example Calculation

```
Recipe: "Tomato Pasta"
Required: [Pasta, Tomato, Garlic, Olive oil]

Inventory:
- Pasta ✅ (found)
- Tomato ✅ (found, expiring in 2 days!)
- Garlic ✅ (found)
- Olive oil ✅ (found)

Result:
- matchPercentage: 100%
- Total ingredients: 4
- Matched: 4
- expiringIngredientsUsed: ["Tomato"]
```

### Sorting Strategy

1. **Primary**: Higher matchPercentage = better
2. **Secondary**: More expiring ingredients = better (use them up!)

---

## 🔑 Key Features

### ✨ Smart Matching
- Fuzzy string matching (handles "fresh tomato" vs "tomato")
- Case-insensitive comparison
- Supports optional ingredients

### ⏰ Expiry Tracking
- Automatic expiry detection (items overdue)
- "Expiring Soon" flag (within 3 days)
- Special recommendations for items expiring soon

### 🔍 Full Search
- Search inventory by name/category/location
- Search recipes by name/cuisine/difficulty
- Filter operations at database level (efficient)

### 📋 Categories & Organization
- Inventory items by: location, category, name
- Recipes by: difficulty, cuisine, name
- Flexible organization system

---

## 🚀 API Design

### RESTful Principles
- ✅ Resource-based URLs
- ✅ Standard HTTP methods (GET, POST, PUT, DELETE)
- ✅ JSON request/response
- ✅ Proper HTTP status codes
- ✅ CORS enabled

### Example Requests

```bash
# Get recommendations (sorted by match %)
GET /api/recommendations?limit=10

# Get items expiring soon
GET /api/inventory/expiring

# Search inventory
GET /api/inventory/search?q=tomato

# Get recipes using expiring items
GET /api/recommendations/expiring
```

---

## 📈 Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Add inventory item | O(1) | Single insert |
| Add recipe | O(n) | n = number of ingredients |
| Get recommendations | O(r × m × i) | r=recipes, m=matching logic, i=inventory items |
| Search inventory | O(n) | n = inventory items (filtered at DB level) |

**Optimization opportunities:**
- Add caching for recommendations (Redis)
- Index ingredient names for faster matching
- Pre-compute frequently requested queries

---

## 🔐 Security (Planned)

Currently: **No authentication** (development mode)

Planned implementations:
- Spring Security with JWT
- Keycloak integration
- OAuth2 / OpenID Connect
- Role-based access control (RBAC)
- API key authentication

---

## 📦 Dependencies

### Core
- **Spring Boot 3.2.5** - Framework
- **Spring Data JPA** - Database access
- **Hibernate** - ORM
- **Jakarta Validation** - Input validation

### Database
- **H2** - Development (in-memory)
- **PostgreSQL** - Production
- **HikariCP** - Connection pooling

### Tools
- **Lombok** - Reduce boilerplate
- **Spring Security** - Future auth
- **Spring Actuator** - Monitoring

---

## 🔧 Development Workflow

### Local Development

```bash
# 1. Start app
mvn spring-boot:run

# 2. App opens on port 8080

# 3. Access H2 console
http://localhost:8080/h2-console

# 4. Test API
curl http://localhost:8080/api/inventory
```

### Production Deployment

```bash
# 1. Build JAR
mvn clean package

# 2. Run with PostgreSQL
java -jar target/onsinventory-backend-1.0.0.jar \
  --spring.profiles.active=prod \
  --spring.datasource.url=jdbc:postgresql://db:5432/inventorydb \
  --spring.datasource.username=user \
  --spring.datasource.password=pass
```

---

## 🎯 Future Enhancements

### Phase 1 (Next)
- [ ] Frontend (Next.js/React)
- [ ] Authentication (Keycloak)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit/Integration tests

### Phase 2
- [ ] Barcode scanning
- [ ] Image recognition for ingredients
- [ ] Nutrition tracking
- [ ] Shopping list generation
- [ ] User profiles

### Phase 3
- [ ] AI-powered recipe suggestions (LLM)
- [ ] Dietary preference matching
- [ ] Family/shared pantries
- [ ] Mobile app (React Native)
- [ ] Grocery delivery integration

### Phase 4
- [ ] Real-time notifications
- [ ] Social recipe sharing
- [ ] Seasonal recipe recommendations
- [ ] Advanced analytics
- [ ] Multi-tenant support

---

## 📝 Documentation Files

| File | Purpose |
|------|---------|
| **README.md** | Full documentation, guides, examples |
| **QUICKSTART.md** | 5-minute setup guide |
| **DEPLOYMENT.md** | Deploy to Docker, K8s, Azure, OpenShift |
| **ARCHITECTURE.md** | This file - technical overview |

---

## 🤝 Integration Points

### Frontend Expected Endpoints
- GET `/api/inventory` - List all items
- POST `/api/inventory` - Add item
- GET `/api/recommendations` - Get suggestions
- GET `/api/recipes` - List recipes

### Mobile App Expected Endpoints
- POST `/api/inventory` - Quick add (barcode scan)
- GET `/api/recommendations` - Widget feed
- GET `/api/inventory/expiring` - Alerts

### Third-party Integration Points
- Barcode database API (future)
- Recipe APIs (e.g., Spoonacular)
- Nutrition database APIs
- Grocery delivery APIs (Instacart, Deliveroo)

---

## 📊 Statistics

- **20 Java source files**
- **~600 lines of code** (models, controllers, services)
- **4 JPA entities**
- **4 REST controllers**
- **3 service classes**
- **4 repositories**
- **1 recommendation algorithm**

---

## ✅ Quality Checklist

- ✅ Following Spring Boot best practices
- ✅ Clean architecture (model/service/controller separation)
- ✅ Proper exception handling (TODO)
- ✅ Transactional consistency
- ✅ DTOs for API responses
- ✅ Configuration externalization (application.yml)
- ✅ Lombok for reduced boilerplate
- ✅ Ready for Docker/K8s deployment

---

## 🎓 Learning Resources

If you're new to Spring Boot:
- [Spring Boot Official Docs](https://spring.io/projects/spring-boot)
- [Spring Data JPA Guide](https://spring.io/projects/spring-data-jpa)
- [Hibernate Documentation](https://hibernate.org/)
- [RESTful API Design](https://restfulapi.net/)

---

## 📞 Support

For issues or questions:
1. Check [README.md](README.md) FAQ
2. Check [DEPLOYMENT.md](DEPLOYMENT.md) for troubleshooting
3. Review [QUICKSTART.md](QUICKSTART.md) for setup issues
4. Check application logs in `target/` folder

---

**Happy coding! 🚀**
