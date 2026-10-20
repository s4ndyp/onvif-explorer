# ONVIF Explorer

Donker-thema webapp om ONVIF-camera's op het netwerk te vinden (WS-Discovery), te verbinden en live RTSP-streams in de browser te bekijken — vergelijkbaar met ONVIF Device Manager.

Gebouwd voor deploy via **Docker Compose** (o.a. Dockhand met GitHub pull).

## Functies

- Netwerkscan voor ONVIF-apparaten (WS-Discovery)
- Handmatig IP/hostname toevoegen
- Inloggen met camera-credentials en media-profielen ophalen
- Live stream via [go2rtc](https://github.com/AlexxIT/go2rtc) (MSE / WebRTC / HLS in de browser)

## Snel starten (Docker Compose)

```bash
git clone https://github.com/s4ndyp/onvif-explorer.git
cd onvif-explorer

# Pas aan naar het IP/hostname waar gebruikers de browser openen:
export GO2RTC_PUBLIC_URL=http://192.168.1.10:1984

docker compose up -d --build
```

- Web-UI: `http://<host>:8080`
- go2rtc UI: `http://<host>:1984`

### Dockhand

**Optie A — voorgebouwde image (aanbevolen)**

GitHub Actions bouwt bij elke push naar `main` de container en pusht naar **GHCR** (`ghcr.io/s4ndyp/onvif-explorer:latest`).

1. Zorg dat de workflow **Build Docker image** op `main` groen is (tab Actions).
2. Dockhand stack → Git repo → compose-bestand: **`docker-compose.ghcr.yml`**
3. Omgeving:
   - `GO2RTC_PUBLIC_URL` — URL van go2rtc voor de browser (poort **1984**)
   - Optioneel: `APP_IMAGE` (default `ghcr.io/s4ndyp/onvif-explorer:latest`), `APP_PORT`, `GO2RTC_PORT`
4. Als GHCR privaat is: in Dockhand registry-login voor `ghcr.io` met een GitHub PAT (`read:packages`).

**Optie B — build op de host**

Compose-pad: **`docker-compose.yml`** → `docker compose up -d --build` (of Dockhand “build” ingeschakeld).

### CI / Docker build

Workflow: [`.github/workflows/docker-build.yml`](.github/workflows/docker-build.yml)

- **Pull requests**: alleen build (validatie), geen push
- **Push naar `main`** / tags `v*`: build + push naar GHCR
- **Handmatig**: Actions → *Build Docker image* → *Run workflow*

Repository variable (optioneel): `GO2RTC_PUBLIC_URL` — wordt als build-arg meegegeven.

## Netwerkscan in Docker

WS-Discovery gebruikt **multicast UDP 3702**. In een standaard bridge-netwerk werkt dat vaak niet.

Opties:

1. **Host network** (Linux): in `docker-compose.yml` bij service `app` uncomment `network_mode: host` en zet `GO2RTC_PUBLIC_URL` op het LAN-IP van de host.
2. **Handmatig IP** in de UI toevoegen en verbinden (ONVIF-poort meestal 80).

Zorg dat poorten **8080** (app) en **1984** (go2rtc) bereikbaar zijn vanaf de client-pc.

## Lokale ontwikkeling

```bash
# Terminal 1 – go2rtc
docker run --rm -p 1984:1984 alexxit/go2rtc

# Terminal 2 – server
cd server && npm install && GO2RTC_INTERNAL_URL=http://127.0.0.1:1984 GO2RTC_PUBLIC_URL=http://127.0.0.1:1984 npm run dev

# Terminal 3 – client
cd client && npm install && npm run dev
```

Open Vite op `http://localhost:5173` (proxy naar API op 8080).

## Omgevingsvariabelen

| Variabele | Default | Beschrijving |
|-----------|---------|--------------|
| `PORT` | `8080` | HTTP-poort van de app |
| `GO2RTC_INTERNAL_URL` | `http://go2rtc:1984` | go2rtc vanuit de app-container |
| `GO2RTC_PUBLIC_URL` | `http://localhost:1984` | URL die de browser gebruikt voor video |

## Licentie

MIT
