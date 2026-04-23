#!/bin/bash
# ============================================================
# magnetique Dashboard — Deploy-Script
# ============================================================
# Dieses Script richtet das Dashboard auf dem VPS ein.
# Ausführen: bash deploy.sh
# ============================================================

set -e

echo "=== magnetique Dashboard Setup ==="
echo ""

# Zielverzeichnis
DASHBOARD_DIR="/opt/dashboard"

# Verzeichnis erstellen
echo "1. Erstelle Verzeichnis $DASHBOARD_DIR ..."
mkdir -p $DASHBOARD_DIR

# Dateien kopieren (Script wird aus dem Dashboard-Ordner heraus ausgeführt)
echo "2. Kopiere Dateien ..."
cp -r server.js db.js auth.js package.json Dockerfile .dockerignore docker-compose.yml public/ $DASHBOARD_DIR/

# .env erstellen falls nicht vorhanden
if [ ! -f "$DASHBOARD_DIR/.env" ]; then
  echo "3. Erstelle .env mit sicheren Werten ..."
  JWT_SECRET=$(openssl rand -hex 32)
  cat > $DASHBOARD_DIR/.env << EOF
JWT_SECRET=${JWT_SECRET}
N8N_BASE_URL=https://n8n.magnetique.net
N8N_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZWViNjg2MC0wNmYyLTQ1ZTMtODQ5OS00MTdiYzliNDhkOTgiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiN2QwOWZmNzUtZmNkNi00YzM0LWI2M2ItMjg3NzM4MTI4MzkzIiwiaWF0IjoxNzc2ODYzOTE5LCJleHAiOjE3Nzc0MTM2MDB9.2uFBQOMuXmVHEOPQ2KwtL83szHwBQc3H02rz6Q1tHJU
PORT=3000
ADMIN_PASSWORD=magnetique2026
EOF
  echo "   ⚠️  Bitte ADMIN_PASSWORD in $DASHBOARD_DIR/.env ändern!"
else
  echo "3. .env existiert bereits — übersprungen"
fi

# Docker-Image bauen und starten
echo "4. Baue Docker-Image ..."
cd $DASHBOARD_DIR
docker compose build

echo "5. Starte Dashboard-Container ..."
docker compose up -d

echo ""
echo "=== Setup abgeschlossen ==="
echo ""
echo "Dashboard läuft auf Port 3000"
echo "Erreichbar unter: https://dashboard.magnetique.net"
echo ""
echo "Login: moritz / (Passwort aus .env ADMIN_PASSWORD)"
echo ""
echo "⚠️  DNS-Eintrag prüfen:"
echo "   dashboard.magnetique.net → A-Record auf $(curl -s ifconfig.me)"
echo ""
