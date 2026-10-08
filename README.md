# PyDeck 🎛️

**Stream Deck versi hemat** — jadikan HP atau tablet kamu sebagai kontrol panel untuk komputer, tanpa perlu beli perangkat Stream Deck.

Server berjalan dengan Python (Flask) di komputer, dan HP membuka panel lewat browser. Klik tombol di HP → komputer langsung menjalankan aksinya (buka aplikasi, buka website, atau jalankan perintah).

## ✨ Fitur

- 📱 **Jalan di HP/Tablet** — cukup buka lewat browser, tidak perlu install aplikasi
- 🌐 **Cross-platform** — berjalan di Windows, macOS, dan Linux
- 🗂️ **Multiple halaman** — beberapa set tombol yang bisa diganti (mis. Utama, Media, Power)
- 🖱️ **3 tipe aksi**:
  - `open_url` — buka website di browser komputer
  - `open_app` — buka aplikasi/program
  - `command` — jalankan perintah shell
- 🎨 **Kustomisasi penuh** — atur label, warna, emoji, atau upload gambar ikon sendiri
- ✏️ **Editor bawaan** — tambah/edit/hapus tombol langsung dari HP
- 🌙 **Tampilan dark mode** yang responsif

## 📋 Kebutuhan

- Python 3.8+
- HP/Tablet & komputer terhubung ke **WiFi yang sama**

## 🚀 Cara Pakai

1. **Clone repo**
   ```bash
   git clone https://github.com/Rickyyy9/pydeck.git
   cd pydeck
   ```

2. **Install dependensi**
   ```bash
   python3 -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install flask
   ```

3. **Jalankan server**
   ```bash
   python app.py
   ```

4. **Buka di HP**
   Terminal akan menampilkan alamat seperti `http://192.168.1.4:5000`.
   Buka alamat itu di browser HP (pastikan satu WiFi).

## 🛠️ Kustomisasi Tombol

### Cara mudah (dari HP)
Tekan tombol ✏️ di kanan bawah untuk masuk **mode edit**, lalu:
- Tekan tombol mana pun untuk mengubahnya
- Tekan ✕ untuk menghapus
- Tekan ＋ untuk menambah tombol baru

### Cara manual (edit `config/deck.json`)
```json
{
  "pages": [
    {
      "id": "page_main",
      "name": "Utama",
      "buttons": [
        {
          "id": "btn_yt",
          "label": "YouTube",
          "icon": "🎬",
          "color": "#e11d48",
          "action": { "type": "open_url", "value": "https://youtube.com" }
        }
      ]
    }
  ]
}
```

## ⚠️ Catatan Keamanan

Panel ini menjalankan perintah di komputermu, dan **tidak memiliki autentikasi**.

- Siapa pun di jaringan yang sama bisa membuka alamatnya dan menekan tombol.
- Jangan mengekspos ke internet terbuka.
- Gunakan hanya di jaringan WiFi yang kamu percaya.

## 📄 Lisensi

MIT — bebas dipakai dan dimodifikasi.
