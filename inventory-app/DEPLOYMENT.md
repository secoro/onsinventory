# 🚀 Deployment Guide

Gids voor het deployen van de Inventory & Recipe Recommendation App naar verschillende omgevingen.

## Local Development (H2 Database)

### Snelste manier om te starten

```bash
cd inventory-app
mvn clean package
mvn spring-boot:run
```

App draait op: **http://localhost:8080**

H2 Console: **http://localhost:8080/h2-console**

---

## Docker (Recommended)

### Build en Run met Docker Compose

```bash
cd inventory-app

# Build het Docker image
docker build -t inventory-app:latest .

# Start alle services (app + PostgreSQL)
docker-compose up -d

# View logs
docker-compose logs -f inventory-app
```

De app draait op: **http://localhost:8080**
PostgreSQL draait op: **localhost:5432**

### Database credentials (Docker)
- Database: `inventorydb`
- User: `inventory_user`
- Password: `inventory_password`

### Stop en cleanup

```bash
# Stop services
docker-compose down

# Stop en remove volumes
docker-compose down -v
```

### Handmatig Docker image pushen naar registry

```bash
# Tag image
docker tag inventory-app:latest <registry>/inventory-app:1.0.0

# Push naar Harbor (example)
docker push <registry>/inventory-app:1.0.0
```

---

## Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (lokaal: `kind`, `minikube`, of managed like AKS/EKS)
- `kubectl` CLI
- Docker image in container registry

### Create Kubernetes Manifests

1. **Create a namespace**
```bash
kubectl create namespace inventory-app
```

2. **Create ConfigMap voor properties**
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: inventory-app-config
  namespace: inventory-app
data:
  application-k8s.yml: |
    spring:
      datasource:
        url: jdbc:postgresql://postgres:5432/inventorydb
        username: inventory_user
        password: inventory_password
      jpa:
        hibernate:
          ddl-auto: update
```

3. **Create PostgreSQL Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  namespace: inventory-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:15-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: inventorydb
        - name: POSTGRES_USER
          value: inventory_user
        - name: POSTGRES_PASSWORD
          value: inventory_password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
      volumes:
      - name: postgres-storage
        emptyDir: {}
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: inventory-app
spec:
  clusterIP: None
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
```

4. **Create Inventory App Deployment**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: inventory-app
  namespace: inventory-app
  labels:
    app: inventory-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: inventory-app
  template:
    metadata:
      labels:
        app: inventory-app
    spec:
      containers:
      - name: inventory-app
        image: <registry>/inventory-app:1.0.0
        ports:
        - containerPort: 8080
          name: http
        env:
        - name: SPRING_DATASOURCE_URL
          value: jdbc:postgresql://postgres:5432/inventorydb
        - name: SPRING_DATASOURCE_USERNAME
          value: inventory_user
        - name: SPRING_DATASOURCE_PASSWORD
          value: inventory_password
        - name: SPRING_PROFILES_ACTIVE
          value: prod
        livenessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /actuator/health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: inventory-app
  namespace: inventory-app
spec:
  type: LoadBalancer
  selector:
    app: inventory-app
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
    name: http
```

5. **Deploy naar Kubernetes**
```bash
kubectl apply -f postgres-deployment.yaml
kubectl apply -f inventory-app-deployment.yaml

# Verify deployment
kubectl get pods -n inventory-app
kubectl get svc -n inventory-app

# View logs
kubectl logs -f deployment/inventory-app -n inventory-app

# Port forward (for local testing)
kubectl port-forward svc/inventory-app 8080:80 -n inventory-app
```

---

## Azure Container Apps

### Prerequisites
- Azure subscription
- Azure CLI (`az`)
- Container image in Azure Container Registry (ACR)

### Deploy Steps

1. **Login to Azure**
```bash
az login
```

2. **Create Resource Group**
```bash
az group create \
  --name inventory-app-rg \
  --location westeurope
```

3. **Create Container Registry**
```bash
az acr create \
  --resource-group inventory-app-rg \
  --name inventoryappcr \
  --sku Basic
```

4. **Build and push image**
```bash
az acr build \
  --registry inventoryappcr \
  --image inventory-app:latest \
  .
```

5. **Create Container Apps Environment**
```bash
az containerapp env create \
  --name inventory-app-env \
  --resource-group inventory-app-rg \
  --location westeurope
```

6. **Deploy Container App**
```bash
az containerapp create \
  --name inventory-app \
  --resource-group inventory-app-rg \
  --environment inventory-app-env \
  --image inventoryappcr.azurecr.io/inventory-app:latest \
  --target-port 8080 \
  --ingress external \
  --registry-server inventoryappcr.azurecr.io \
  --env-vars \
    SPRING_DATASOURCE_URL="jdbc:postgresql://postgres-server.postgres.database.azure.com:5432/inventorydb" \
    SPRING_DATASOURCE_USERNAME="inventory_user" \
    SPRING_DATASOURCE_PASSWORD="inventory_password" \
    SPRING_PROFILES_ACTIVE="prod"
```

7. **Get app URL**
```bash
az containerapp show \
  --name inventory-app \
  --resource-group inventory-app-rg \
  --query properties.configuration.ingress.fqdn
```

---

## OpenShift Deployment

### Prerequisites
- OpenShift cluster
- `oc` CLI
- Docker image in internal registry

### Deploy to OpenShift

```bash
# Login
oc login --token=<token> --server=<api-server>

# Create project
oc new-project inventory-app

# Create app from Docker image
oc new-app docker~<registry>/inventory-app:latest \
  --name=inventory-app \
  -e SPRING_PROFILES_ACTIVE=prod

# Expose service
oc expose svc/inventory-app

# Check status
oc status
oc get routes
```

---

## Environment Variables

### Development (H2)
```bash
# No env vars needed - uses H2 in-memory database
```

### Production (PostgreSQL)
```bash
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/inventorydb
SPRING_DATASOURCE_USERNAME=inventory_user
SPRING_DATASOURCE_PASSWORD=inventory_password
SPRING_PROFILES_ACTIVE=prod
SPRING_JPA_HIBERNATE_DDL_AUTO=update
```

---

## Health Checks

### Local (H2)
```bash
curl http://localhost:8080/actuator/health
```

### Docker
```bash
docker-compose exec inventory-app \
  curl http://localhost:8080/actuator/health
```

### Kubernetes
```bash
kubectl exec -it deployment/inventory-app -n inventory-app -- \
  curl http://localhost:8080/actuator/health
```

---

## Monitoring & Logs

### Local
```bash
# Tail logs
tail -f logs/app.log
```

### Docker
```bash
docker-compose logs -f inventory-app
```

### Kubernetes
```bash
# View logs
kubectl logs deployment/inventory-app -n inventory-app

# Stream logs
kubectl logs -f deployment/inventory-app -n inventory-app

# View logs from specific pod
kubectl logs pod-name -n inventory-app
```

---

## Performance Tuning

### Database Connection Pool (prod)
```yaml
spring:
  datasource:
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 20000
```

### Caching (future)
```yaml
spring:
  cache:
    type: redis
    redis:
      host: redis-host
      port: 6379
```

---

## Troubleshooting

### App won't start
```bash
# Check logs
docker-compose logs inventory-app

# Check health
curl http://localhost:8080/actuator/health

# Check database connection
curl -v http://localhost:8080/api/locations
```

### Database connection failed
```bash
# Verify postgres is running
docker-compose ps

# Test connection
psql -h localhost -U inventory_user -d inventorydb -c "SELECT 1"
```

### Memory issues
- Increase JVM heap: `JAVA_OPTS=-Xmx1g`
- Increase container limits in docker-compose.yml

---

## Next Steps

1. Add authentication (Keycloak, OAuth2)
2. Add API documentation (Swagger/OpenAPI)
3. Add caching layer (Redis)
4. Add message queue (RabbitMQ, Kafka)
5. Add frontend (Next.js)
6. Set up CI/CD pipeline (GitHub Actions, GitLab CI, Azure DevOps)
