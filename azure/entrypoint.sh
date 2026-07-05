#!/bin/bash
set -euo pipefail

PG_BIN=/usr/libexec/postgresql16
PATH="$PG_BIN:$PATH"

BACKEND_PID=""
CADDY_PID=""

log() { echo "[entrypoint] $*"; }

shutdown() {
    log "shutting down..."
    if [ -n "$CADDY_PID" ] && kill -0 "$CADDY_PID" 2>/dev/null; then
        kill -TERM "$CADDY_PID" 2>/dev/null || true
        wait "$CADDY_PID" 2>/dev/null || true
    fi
    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill -TERM "$BACKEND_PID" 2>/dev/null || true
        wait "$BACKEND_PID" 2>/dev/null || true
    fi
    su-exec postgres "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast stop 2>/dev/null || true
    exit 0
}
trap shutdown TERM INT

# --- PostgreSQL: first-boot init -------------------------------------------
if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
    log "initializing PostgreSQL data directory at $PGDATA"
    chown -R postgres:postgres "$PGDATA"
    chmod 700 "$PGDATA"
    su-exec postgres "$PG_BIN/initdb" -D "$PGDATA" -U postgres --auth-local=trust --auth-host=scram-sha-256 >/tmp/initdb.log 2>&1
else
    log "existing PostgreSQL data directory found, skipping initdb"
    chown -R postgres:postgres "$PGDATA"
fi

log "starting PostgreSQL"
su-exec postgres "$PG_BIN/pg_ctl" -D "$PGDATA" -l /var/log/postgresql/postgresql.log -w start

# --- PostgreSQL: ensure app role + database exist (idempotent) ------------
SQL_ROLE=$(cat <<SQL
DO \$do\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
      CREATE ROLE "${POSTGRES_USER}" LOGIN PASSWORD '${POSTGRES_PASSWORD}';
   ELSE
      ALTER ROLE "${POSTGRES_USER}" WITH PASSWORD '${POSTGRES_PASSWORD}';
   END IF;
END
\$do\$;
SQL
)
echo "$SQL_ROLE" | su-exec postgres psql -v ON_ERROR_STOP=1 -d postgres

DB_EXISTS=$(su-exec postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname = '${POSTGRES_DB}'" -d postgres)
if [ "$DB_EXISTS" != "1" ]; then
    log "creating database ${POSTGRES_DB}"
    su-exec postgres psql -v ON_ERROR_STOP=1 -d postgres -c "CREATE DATABASE \"${POSTGRES_DB}\" OWNER \"${POSTGRES_USER}\";"
fi

# --- Backend ----------------------------------------------------------------
export SPRING_DATASOURCE_URL="jdbc:postgresql://localhost:5432/${POSTGRES_DB}"
export SPRING_DATASOURCE_USERNAME="${POSTGRES_USER}"
export SPRING_DATASOURCE_PASSWORD="${POSTGRES_PASSWORD}"

log "starting backend"
su-exec spring java -jar /app/app.jar &
BACKEND_PID=$!

log "waiting for backend to become healthy"
for i in $(seq 1 60); do
    if curl -fs http://127.0.0.1:8080/api/auth/config >/dev/null 2>&1; then
        log "backend is healthy"
        break
    fi
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
        log "backend process exited unexpectedly"
        exit 1
    fi
    sleep 2
done

# --- Frontend / reverse proxy (Caddy) ---------------------------------------
# If APP_DOMAIN is set to a real, internet-resolvable hostname (e.g. the
# Azure Container Instance FQDN), Caddy automatically requests a Let's
# Encrypt certificate for it and serves HTTPS on :443 (redirecting :80).
# Without it, Caddy just serves plain HTTP on :80 - useful for local testing.
if [ -n "${APP_DOMAIN:-}" ]; then
    SITE_ADDRESS="$APP_DOMAIN"
else
    SITE_ADDRESS=":80"
fi

mkdir -p "${CADDY_DATA_DIR:-/data}"

cat > /tmp/Caddyfile <<CADDY_EOF
{
    admin off
    storage file_system {
        root ${CADDY_DATA_DIR:-/data}
    }
}

${SITE_ADDRESS} {
    encode gzip zstd

    handle /api/* {
        reverse_proxy 127.0.0.1:8080
    }

    handle /actuator/* {
        reverse_proxy 127.0.0.1:8080
    }

    handle {
        root * /var/www/html
        try_files {path} /index.html
        file_server
    }
}
CADDY_EOF

log "starting Caddy (site: ${SITE_ADDRESS})"
caddy run --config /tmp/Caddyfile --adapter caddyfile &
CADDY_PID=$!

wait -n "$BACKEND_PID" "$CADDY_PID"
shutdown
