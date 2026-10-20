#!/bin/sh
set -e

# Bridge (standaard): app luistert altijd op 8080 in de container.
# Externe poort stel je in met APP_PORT (bijv. 8888:8080).
# Host network: zet HOST_NETWORK=true en APP_PORT op de gewenste luisterpoort.

if [ "$HOST_NETWORK" = "true" ] || [ "$HOST_NETWORK" = "1" ]; then
  export PORT="${APP_PORT:-${PORT:-8080}}"
  echo "ONVIF Explorer: host-netwerk, luistert op 0.0.0.0:${PORT}"
else
  export PORT=8080
  echo "ONVIF Explorer: luistert in container op 0.0.0.0:${PORT}"
  echo "  Publiceer met APP_PORT -> 8080 (huidige mapping: host ${APP_PORT:-8080} -> container 8080)"
fi

exec node dist/index.js
