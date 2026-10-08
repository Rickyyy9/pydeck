#!/usr/bin/env bash
# Skrip test otomatis untuk PyDeck
set -e
cd "$(dirname "$0")"

# Matikan sisa proses lama
pkill -f "streamdeck/venv/bin/python" 2>/dev/null || true
sleep 1

# Jalankan server di background
./venv/bin/python app.py > /tmp/pydeck_test.log 2>&1 &
SERVER_PID=$!
echo "Server PID: $SERVER_PID"

# Tunggu server siap (maks 10 detik)
for i in $(seq 1 20); do
  if curl -s -o /dev/null http://127.0.0.1:5000/ 2>/dev/null; then
    break
  fi
  sleep 0.5
done

echo ""
echo "========== HASIL TEST =========="

echo -n "[1] GET /              : "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:5000/

echo -n "[2] GET /static/app.js : "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:5000/static/app.js

echo -n "[3] GET /static/style.css : "
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://127.0.0.1:5000/static/style.css

echo "[4] GET /api/config :"
curl -s http://127.0.0.1:5000/api/config | ./venv/bin/python -c "import sys,json; d=json.load(sys.stdin); print('    -> pages:', [p['name'] for p in d['pages']]); print('    -> tombol di halaman 1:', len(d['pages'][0]['buttons']))"

echo "[5] POST /api/trigger (tombol tidak ada) :"
curl -s -X POST http://127.0.0.1:5000/api/trigger -H "Content-Type: application/json" -d '{"page":"page_main","button":"tidak_ada"}'
echo ""

echo "[6] POST /api/trigger (command aman) :"
curl -s -X POST http://127.0.0.1:5000/api/trigger -H "Content-Type: application/json" -d '{"page":"page_test","button":"btn_echo"}' 2>/dev/null || true
echo ""

# Matikan server
kill $SERVER_PID 2>/dev/null || true
sleep 1
pkill -f "streamdeck/venv/bin/python" 2>/dev/null || true
echo ""
echo "========== TEST SELESAI, server dimatikan =========="
