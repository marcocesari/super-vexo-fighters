#!/bin/sh
# Serve the game on http://localhost:8080 (ES modules need a server, not file://)
cd "$(dirname "$0")"
echo "Super Vexo Fighters → http://localhost:8080"
python3 tools/serve.py 8080
