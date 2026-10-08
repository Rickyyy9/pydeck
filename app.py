"""
PyDeck - Stream Deck untuk HP/Tablet
Server Python (Flask) yang berjalan di komputer, dikontrol dari browser HP.

Cara pakai:
    python app.py
    Lalu buka alamat yang ditampilkan di browser HP (satu WiFi).
"""

import json
import os
import platform
import secrets
import socket
import subprocess
import threading
import webbrowser

from flask import Flask, jsonify, render_template, request, send_from_directory

# ---------------------------------------------------------------------------
# Konfigurasi
# ---------------------------------------------------------------------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config", "deck.json")
ICON_DIR = os.path.join(BASE_DIR, "config", "icons")
PORT = 5000

app = Flask(__name__)


# ---------------------------------------------------------------------------
# Utilitas
# ---------------------------------------------------------------------------
def get_local_ip():
    """Ambil IP lokal komputer agar HP bisa mengakses."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # Tidak benar-benar mengirim data, hanya mencari interface
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


def load_config():
    """Baca konfigurasi deck dari file JSON."""
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_config(data):
    """Simpan konfigurasi deck ke file JSON."""
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def run_command_background(cmd, shell=True):
    """Jalankan perintah tanpa memblokir server."""
    def _run():
        try:
            subprocess.Popen(
                cmd,
                shell=shell,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )
        except Exception as e:  # noqa: BLE001
            print(f"[PyDeck] Gagal menjalankan '{cmd}': {e}")

    threading.Thread(target=_run, daemon=True).start()


def execute_action(action):
    """
    Eksekusi sebuah aksi tombol. Mengembalikan (sukses: bool, pesan: str).

    Tipe aksi yang didukung:
      - open_app   : buka aplikasi/program berdasarkan nama command
      - open_url   : buka URL di browser default
      - command    : jalankan perintah shell
    """
    tipe = action.get("type")
    value = action.get("value", "")
    system = platform.system()

    if not value:
        return False, "Aksi kosong"

    try:
        if tipe == "open_url":
            # Buka URL di browser default komputer
            if system == "Windows":
                os.startfile(value)  # noqa: S606
            elif system == "Darwin":
                subprocess.Popen(["open", value])
            else:
                subprocess.Popen(["xdg-open", value])
            return True, f"Membuka URL: {value}"

        if tipe == "open_app":
            # Buka aplikasi berdasarkan nama/command
            run_command_background(value)
            return True, f"Membuka aplikasi: {value}"

        if tipe == "command":
            # Jalankan perintah shell apa saja
            run_command_background(value)
            return True, f"Menjalankan: {value}"

        return False, f"Tipe aksi tidak dikenal: {tipe}"
    except Exception as e:  # noqa: BLE001
        return False, f"Error: {e}"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.route("/")
def index():
    """Halaman utama Stream Deck."""
    return render_template("index.html")


@app.route("/api/config", methods=["GET"])
def api_get_config():
    """Ambil seluruh konfigurasi deck."""
    return jsonify(load_config())


@app.route("/api/config", methods=["POST"])
def api_save_config():
    """Simpan konfigurasi deck (dari editor di HP)."""
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"ok": False, "message": "Data tidak valid"}), 400
    save_config(data)
    return jsonify({"ok": True, "message": "Konfigurasi disimpan"})


@app.route("/api/trigger", methods=["POST"])
def api_trigger():
    """Terima perintah klik tombol dari HP dan eksekusi di komputer."""
    data = request.get_json(silent=True) or {}
    page_id = data.get("page")
    button_id = data.get("button")

    config = load_config()
    pages = config.get("pages", [])

    page = next((p for p in pages if p.get("id") == page_id), None)
    if not page:
        return jsonify({"ok": False, "message": "Halaman tidak ditemukan"}), 404

    button = next((b for b in page.get("buttons", []) if b.get("id") == button_id), None)
    if not button:
        return jsonify({"ok": False, "message": "Tombol tidak ditemukan"}), 404

    ok, message = execute_action(button.get("action", {}))
    print(f"[PyDeck] {message}")
    return jsonify({"ok": ok, "message": message})


@app.route("/api/upload_icon", methods=["POST"])
def api_upload_icon():
    """Upload gambar kustom untuk tombol."""
    if "file" not in request.files:
        return jsonify({"ok": False, "message": "Tidak ada file"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"ok": False, "message": "Nama file kosong"}), 400

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"):
        return jsonify({"ok": False, "message": "Format gambar tidak didukung"}), 400

    os.makedirs(ICON_DIR, exist_ok=True)
    filename = f"{secrets.token_hex(8)}{ext}"
    file.save(os.path.join(ICON_DIR, filename))
    return jsonify({"ok": True, "path": f"/icons/{filename}"})


@app.route("/icons/<path:filename>")
def serve_icon(filename):
    """Sajikan gambar ikon kustom."""
    return send_from_directory(ICON_DIR, filename)


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    ip = get_local_ip()

    # Buat config default bila belum ada
    if not os.path.exists(CONFIG_FILE):
        os.makedirs(os.path.dirname(CONFIG_FILE), exist_ok=True)
        save_config({"pages": []})

    print("=" * 56)
    print("  PyDeck - Stream Deck untuk HP/Tablet")
    print("=" * 56)
    print(f"  Komputer ini : http://127.0.0.1:{PORT}")
    print(f"  Dari HP      : http://{ip}:{PORT}")
    print("=" * 56)
    print("  Pastikan HP & komputer tersambung ke WiFi yang sama.")
    print("  Tekan CTRL+C untuk berhenti.")
    print("=" * 56)

    # Coba buka otomatis di komputer (opsional)
    try:
        webbrowser.open(f"http://127.0.0.1:{PORT}")
    except Exception:
        pass

    app.run(host="0.0.0.0", port=PORT, debug=False)
