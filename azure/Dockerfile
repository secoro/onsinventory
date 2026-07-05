# All-in-one image: frontend + backend (Spring Boot) + PostgreSQL + Caddy
# (static files, reverse proxy, automatic HTTPS) in a single container.
#
# Build from the repo root:
#   docker build -f azure/Dockerfile -t onsinventory:allinone .

FROM node:20-alpine AS frontend-build

WORKDIR /app

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
# Same origin in production: frontend and API share one host, Caddy routes
# /api/* to the backend, so the base URL is relative (empty).
ENV VITE_API_BASE_URL=""
RUN npm run build


FROM maven:3.9.9-eclipse-temurin-21-alpine AS backend-build

WORKDIR /app

COPY backend/pom.xml ./
COPY backend/src ./src
RUN mvn -B clean package -DskipTests


FROM eclipse-temurin:21-jre-alpine

RUN apk add --no-cache \
      caddy \
      postgresql16 \
      postgresql16-client \
      su-exec \
      bash \
      curl \
    && mkdir -p /run/postgresql /var/lib/postgresql/data /var/log/postgresql /var/www/html /data/caddy /config/caddy \
    && chown -R postgres:postgres /var/lib/postgresql /run/postgresql /var/log/postgresql \
    && addgroup -S spring && adduser -S spring -G spring

COPY --from=frontend-build /app/dist /var/www/html
COPY --from=backend-build /app/target/onsinventory-backend-1.0.0.jar /app/app.jar
COPY azure/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh && chown -R spring:spring /app

ENV PGDATA=/var/lib/postgresql/data \
    POSTGRES_DB=inventorydb \
    POSTGRES_USER=inventory_user \
    POSTGRES_PASSWORD=change-me-now \
    APP_BOOTSTRAP_ENABLED=true \
    APP_SECURITY_ENABLED=true \
    APP_CORS_ALLOWED_ORIGINS=* \
    APP_JWT_SECRET=change-this-jwt-secret-minimum-32-characters \
    SPRING_PROFILES_ACTIVE=prod \
    APP_DOMAIN="" \
    CADDY_DATA_DIR=/data

# PGDATA: database files. CADDY_DATA_DIR: Caddy's ACME account + certificates
# (avoid re-issuing on every restart). Both can be repointed at one mounted
# volume, e.g. PGDATA=/mnt/data/postgres CADDY_DATA_DIR=/mnt/data/caddy
VOLUME ["/var/lib/postgresql/data", "/data"]

EXPOSE 80 443

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=5 \
  CMD curl -fs http://127.0.0.1:8080/api/auth/config >/dev/null || exit 1

ENTRYPOINT ["/entrypoint.sh"]
