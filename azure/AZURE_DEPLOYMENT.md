# Deploying OnsInventory to Azure (single container)

This folder contains an all-in-one Docker image: frontend + Spring Boot
backend + PostgreSQL + Caddy (static files, `/api` reverse proxy, automatic
HTTPS), all in one container. See `Dockerfile` / `entrypoint.sh` for how it's
assembled.

## Why a VM instead of Azure Container Instances

Azure Container Instances (ACI) only supports Azure Files as a mountable
persistent volume. The default (SMB) protocol is not safe for a real
database - Postgres needs POSIX file-locking/fsync guarantees SMB doesn't
reliably provide. The only durable option on ACI is a **Premium NFS** file
share, which requires a Premium FileStorage account (billed on a ~100GB
minimum, roughly $20+/mo regardless of actual usage) *and* deploying the
container into an Azure Virtual Network just to reach it.

A small Azure VM running Docker gets a normal disk for Postgres data - no
network filesystem gotchas - costs less, and is operationally identical to
the Raspberry Pi setup already documented in `backend/DEPLOYMENT.md`. That's
what this guide sets up. (If you'd rather use ACI anyway, the image itself
doesn't change - only the storage/networking around it would.)

## Cost (optimized for cheapest-that-still-works)

Everything below runs on a single always-on VM - no registry, no managed
Postgres, no load balancer, no VNet. Pay-as-you-go West Europe list prices,
check the [Azure pricing calculator](https://azure.microsoft.com/pricing/calculator/)
for your region/currency:

| Component | Choice | Approx. cost |
|---|---|---|
| VM compute | `Standard_B1ms` (1 vCPU, 2 GB RAM) | ~$15/mo |
| OS disk | 30 GB `StandardSSD_LRS` | ~$2.50/mo |
| Public IP | Standard SKU (Basic is being retired) | ~$3.50/mo |
| Bandwidth | negligible for personal use | ~$0 |
| **Total** | | **~$20-21/mo** |

Why `B1ms` and not the cheaper `B1s` (~$7.50/mo, 1 GB RAM): running
Postgres + the JVM + Caddy together in 1 GB is tight - realistically
700-900 MB just for the three processes, leaving almost no headroom before
the OOM killer starts picking one off. `B1ms` doubles the RAM for about
$7.50/mo more and removes that risk. If you want to try `B1s` anyway to
shave the VM to its bare minimum, it's a one-line change to `--size` below
and you can resize later (`az vm resize`) without losing data - just watch
`free -h` and `dmesg | grep -i kill` on the VM after startup.

Two more small savings if you want them: use `StandardSSD_LRS` -> `Standard_LRS`
(HDD) for the OS disk to shave another ~$1/mo (fine for this workload, just
slower disk I/O), and B-series VMs are "burstable" - they bank CPU credit
while idle, which is a good fit for a low-traffic personal app.

## 1. Prerequisites

- An Azure subscription
- Azure CLI: `brew install azure-cli`, then `az login`
- A domain name if you want your own hostname (optional - Azure gives you a
  free `*.cloudapp.azure.com` FQDN either way)

## 2. Create the resource group, VM, and public IP with a DNS label

```bash
RG=onsinventory-rg
LOCATION=westeurope
VM_NAME=onsinventory-vm
DNS_LABEL=onsinventory-$RANDOM   # must be globally unique

az group create --name "$RG" --location "$LOCATION"

az vm create \
  --resource-group "$RG" \
  --name "$VM_NAME" \
  --image Ubuntu2404 \
  --size Standard_B1ms \
  --os-disk-size-gb 30 \
  --storage-sku StandardSSD_LRS \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard \
  --public-ip-address-dns-name "$DNS_LABEL"

az vm open-port --resource-group "$RG" --name "$VM_NAME" --port 80 --priority 100
az vm open-port --resource-group "$RG" --name "$VM_NAME" --port 443 --priority 101
```

Your public hostname is now `$DNS_LABEL.$LOCATION.cloudapp.azure.com` - print
it and note it down:

```bash
az vm show -d --resource-group "$RG" --name "$VM_NAME" --query fqdns -o tsv
```

If you own a real domain, you can instead (or additionally) point an `A`
record at the VM's public IP:

```bash
az vm show -d --resource-group "$RG" --name "$VM_NAME" --query publicIps -o tsv
```

## 3. SSH in and install Docker

```bash
az vm ssh --resource-group "$RG" --name "$VM_NAME"
```

On the VM:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
```

## 4. Build the image on the VM

Building directly on the VM avoids cross-arch emulation (the VM is already
amd64) and needs no separate registry.

```bash
git clone <YOUR_GIT_REMOTE_URL> onsinventory
cd onsinventory
docker build -f azure/Dockerfile -t onsinventory:allinone .
```

To redeploy later after code changes: `git pull`, rebuild, then repeat the
`docker run` step below (see "Redeploying" at the bottom).

## 5. Run it

```bash
docker volume create onsinventory-pgdata
docker volume create onsinventory-caddydata

docker run -d \
  --name onsinventory \
  --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v onsinventory-pgdata:/var/lib/postgresql/data \
  -v onsinventory-caddydata:/data \
  -e POSTGRES_PASSWORD='<choose-a-strong-password>' \
  -e APP_JWT_SECRET='<choose-a-random-32+-char-secret>' \
  -e APP_DOMAIN='<your-fqdn-from-step-2-or-your-own-domain>' \
  -e APP_CORS_ALLOWED_ORIGINS='https://<your-fqdn>' \
  -e APP_BOOTSTRAP_ENABLED=true \
  -e JAVA_TOOL_OPTIONS='-Xmx512m' \
  onsinventory:allinone
```

Notes:

- `JAVA_TOOL_OPTIONS='-Xmx512m'` caps the JVM heap so it can't crowd out
  Postgres and Caddy on a small VM. Worth keeping on `B1ms` (2 GB total);
  drop it if you resize up to something with more headroom.
- Leave `APP_DOMAIN` unset only for local testing - Caddy then serves plain
  HTTP on port 80 with no TLS. Set it to get automatic HTTPS via Let's
  Encrypt (ports 80 and 443 must both be reachable from the internet, which
  `az vm open-port` above already arranged).
- `APP_BOOTSTRAP_ENABLED=true` seeds two accounts (`sean` / `natalia`, both
  password `Test!234`) plus sample data on first boot, same as the existing
  Pi deployment. **Log in and change these once the site is up** - the
  default password is visible in the public source. After that you can
  redeploy with `APP_BOOTSTRAP_ENABLED=false` (it only matters on an empty
  database anyway).
- Check it's healthy: `docker logs -f onsinventory`, then
  `curl -I https://<your-fqdn>/` once Caddy has obtained its certificate
  (can take up to a minute on first boot).

## 6. Redeploying after code changes

```bash
cd ~/onsinventory
git pull
docker build -f azure/Dockerfile -t onsinventory:allinone .
docker stop onsinventory && docker rm onsinventory
# re-run the `docker run` command from step 5 (same volumes, same env vars)
```

Data in `onsinventory-pgdata` and `onsinventory-caddydata` survives this -
those are named volumes, not part of the image.

## Local testing before touching Azure

```bash
cd /Users/seanderoo/Repositories/Local/onsinventory
docker build -f azure/Dockerfile -t onsinventory:allinone .
docker run -d --name onsinventory-local -p 8080:80 \
  -e POSTGRES_PASSWORD=localtest \
  -e APP_JWT_SECRET=local-test-jwt-secret-32-chars-min \
  onsinventory:allinone

curl http://localhost:8080/api/auth/config
docker logs -f onsinventory-local
```

## What's inside the image

- `azure/Dockerfile` - multi-stage build: Vite frontend build -> Maven
  backend build -> final Alpine image with Caddy, PostgreSQL 16, and the
  Spring Boot jar.
- `azure/entrypoint.sh` - on container start: initializes the Postgres data
  directory on first boot only, starts Postgres, ensures the app role/database
  exist, starts the backend, waits for it to become healthy, then generates
  a Caddyfile (HTTPS if `APP_DOMAIN` is set, plain HTTP otherwise) and starts
  Caddy in the foreground.
- Everything under `/api/*` is reverse-proxied to the backend on
  `127.0.0.1:8080`; everything else serves the built frontend, matching the
  existing same-origin setup already used for local dev (see
  `backend/docker-compose.override.yml`).
