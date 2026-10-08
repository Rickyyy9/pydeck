/* =========================================================
   PyDeck - Frontend logic
   Menampilkan tombol, mengirim trigger ke server Python,
   dan menyediakan mode edit untuk mengubah tombol.
   ========================================================= */

let config = { pages: [] };
let activePageId = null;
let editing = false;

const el = {
  tabs: document.getElementById("tabs"),
  grid: document.getElementById("grid"),
  toast: document.getElementById("toast"),
  editBtn: document.getElementById("editBtn"),
  statusDot: document.getElementById("statusDot"),
  statusText: document.getElementById("statusText"),
};

/* ---------- Utilitas ---------- */

function toast(message, type = "") {
  el.toast.textContent = message;
  el.toast.className = "toast show " + type;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.toast.className = "toast " + type;
  }, 2200);
}

function setStatus(online) {
  el.statusDot.classList.toggle("offline", !online);
  el.statusText.textContent = online ? "Terhubung" : "Terputus";
}

async function api(path, options = {}) {
  try {
    const res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
    setStatus(true);
    return await res.json();
  } catch (e) {
    setStatus(false);
    throw e;
  }
}

/* ---------- Render ---------- */

function renderTabs() {
  el.tabs.innerHTML = "";
  config.pages.forEach((page) => {
    const tab = document.createElement("button");
    tab.className = "tab" + (page.id === activePageId ? " active" : "");
    tab.textContent = page.name;
    tab.onclick = () => {
      activePageId = page.id;
      renderTabs();
      renderGrid();
    };
    el.tabs.appendChild(tab);
  });
}

function renderGrid() {
  const page = config.pages.find((p) => p.id === activePageId);
  if (!page) return;

  el.grid.innerHTML = "";

  page.buttons.forEach((btn) => {
    const node = document.createElement("button");
    node.className = "deck-btn";
    if (btn.color) node.style.background = btn.color;

    const iconWrap = document.createElement("div");
    iconWrap.className = "icon";
    if (btn.icon && btn.icon.startsWith("/icons/")) {
      const img = document.createElement("img");
      img.src = btn.icon;
      iconWrap.appendChild(img);
    } else {
      iconWrap.textContent = btn.icon || "⬛";
    }

    const labelWrap = document.createElement("div");
    labelWrap.className = "label";
    labelWrap.textContent = btn.label || "";

    node.appendChild(iconWrap);
    node.appendChild(labelWrap);

    if (editing) {
      const badge = document.createElement("div");
      badge.className = "del-badge";
      badge.textContent = "✕";
      badge.onclick = (ev) => {
        ev.stopPropagation();
        deleteButton(page, btn.id);
      };
      node.appendChild(badge);
      node.onclick = () => openEditor(page, btn);
    } else {
      node.onclick = () => triggerButton(page, btn, node);
    }

    el.grid.appendChild(node);
  });

  // Tombol tambah (hanya saat mode edit)
  if (editing) {
    const add = document.createElement("button");
    add.className = "deck-btn empty";
    add.textContent = "＋";
    add.onclick = () => openEditor(page, null);
    el.grid.appendChild(add);
  }
}

/* ---------- Aksi tombol ---------- */

async function triggerButton(page, btn, node) {
  node.classList.add("pressed");
  setTimeout(() => node.classList.remove("pressed"), 350);
  try {
    const res = await api("/api/trigger", {
      method: "POST",
      body: JSON.stringify({ page: page.id, button: btn.id }),
    });
    toast(res.message || "Dijalankan", res.ok ? "ok" : "error");
  } catch (e) {
    toast("Gagal terhubung ke server", "error");
  }
}

/* ---------- Editor ---------- */

function openEditor(page, btn) {
  const isNew = !btn;
  const data = btn
    ? JSON.parse(JSON.stringify(btn))
    : {
        id: "btn_" + Date.now(),
        label: "",
        icon: "🔘",
        color: "#3b82f6",
        action: { type: "open_url", value: "" },
      };

  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop show";
  backdrop.innerHTML = `
    <div class="modal">
      <h2>${isNew ? "Tambah Tombol" : "Edit Tombol"}</h2>

      <div class="field">
        <label>Label</label>
        <input id="f-label" type="text" value="${escapeHtml(data.label)}" placeholder="Nama tombol">
      </div>

      <div class="field">
        <label>Ikon (emoji atau upload gambar)</label>
        <div class="color-row">
          <div class="icon-preview" id="f-icon-preview">${renderIconPreview(data.icon)}</div>
          <input id="f-icon" type="text" value="${escapeHtml(data.icon.startsWith("/icons/") ? "" : data.icon)}" placeholder="Contoh: 🎬" style="flex:1">
          <input id="f-icon-file" type="file" accept="image/*"style="display:none">
          <button type="button" class="btn ghost" id="f-icon-upload" style="flex:0 0 auto;width:auto;padding:12px 16px">📁</button>
        </div>
        <div class="hint">Isi emoji, atau tekan tombol folder untuk upload gambar.</div>
      </div>

      <div class="field">
        <label>Warna</label>
        <div class="color-row">
          <input id="f-color" type="color" value="${data.color || "#3b82f6"}">
          <span class="hint">Warna latar tombol</span>
        </div>
      </div>

      <div class="field">
        <label>Tipe Aksi</label>
        <select id="f-type">
          <option value="open_url">Buka Website (URL)</option>
          <option value="open_app">Buka Aplikasi</option>
          <option value="command">Jalankan Perintah</option>
        </select>
      </div>

      <div class="field">
        <label id="f-value-label">Nilai / Perintah</label>
        <textarea id="f-value" rows="2" placeholder="https://...">${escapeHtml(data.action.value)}</textarea>
        <div class="hint" id="f-value-hint"></div>
      </div>

      <div class="modal-actions">
        ${isNew ? "" : '<button class="btn danger" id="m-delete">Hapus</button>'}
        <button class="btn ghost" id="m-cancel">Batal</button>
        <button class="btn primary" id="m-save">Simpan</button>
      </div>
    </div>
  `;
  document.body.appendChild(backdrop);

  const $ = (id) => backdrop.querySelector(id);
  const typeSelect = $("#f-type");
  const valueInput = $("#f-value");
  const valueLabel = $("#f-value-label");
  const valueHint = $("#f-value-hint");

  typeSelect.value = data.action.type;

  function updateValueField() {
    const t = typeSelect.value;
    if (t === "open_url") {
      valueLabel.textContent = "URL Website";
      valueInput.placeholder = "https://youtube.com";
      valueHint.textContent = "Website akan terbuka di browser komputer.";
    } else if (t === "open_app") {
      valueLabel.textContent = "Nama / Command Aplikasi";
      valueInput.placeholder = "notepad  /  firefox  /  chrome";
      valueHint.textContent = "Contoh Linux/Mac: firefox, code. Contoh Windows: notepad, calc.";
    } else {
      valueLabel.textContent = "Perintah Shell";
      valueInput.placeholder = "shutdown /s /t 0";
      valueHint.textContent = "Perintah dijalankan di komputer. Hati-hati!";
    }
  }
  updateValueField();
  typeSelect.onchange = updateValueField;

  // Upload gambar
  $("#f-icon-upload").onclick = () => $("#f-icon-file").click();
  $("#f-icon-file").onchange = async (ev) => {
    const file = ev.target.files[0];
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload_icon", { method: "POST", body: form });
      const json = await res.json();
      if (json.ok) {
        data.icon = json.path;
        $("#f-icon-preview").innerHTML = renderIconPreview(json.path);
        $("#f-icon").value = "";
        toast("Gambar diunggah", "ok");
      } else {
        toast(json.message || "Gagal upload", "error");
      }
    } catch (e) {
      toast("Gagal upload gambar", "error");
    }
  };

  // Update preview saat emoji diubah
  $("#f-icon").oninput = (ev) => {
    const v = ev.target.value.trim();
    if (v) {
      data.icon = v;
      $("#f-icon-preview").innerHTML = renderIconPreview(v);
    }
  };

  // Batal
  const close = () => backdrop.remove();
  $("#m-cancel").onclick = close;
  backdrop.onclick = (ev) => { if (ev.target === backdrop) close(); };

  // Hapus
  if (!isNew) {
    $("#m-delete").onclick = () => {
      deleteButton(page, data.id);
      close();
    };
  }

  // Simpan
  $("#m-save").onclick = async () => {
    data.label = $("#f-label").value.trim() || "Tombol";
    data.color = $("#f-color").value;
    data.action.type = typeSelect.value;
    data.action.value = valueInput.value.trim();
    if (!data.action.value) {
      toast("Isi nilai aksi dulu", "error");
      return;
    }

    if (isNew) {
      page.buttons.push(data);
    } else {
      const idx = page.buttons.findIndex((b) => b.id === data.id);
      if (idx >= 0) page.buttons[idx] = data;
    }

    await saveConfig();
    renderGrid();
    close();
    toast("Tombol disimpan", "ok");
  };
}

function deleteButton(page, btnId) {
  page.buttons = page.buttons.filter((b) => b.id !== btnId);
  saveConfig();
  renderGrid();
  toast("Tombol dihapus");
}

async function saveConfig() {
  try {
    await api("/api/config", {
      method: "POST",
      body: JSON.stringify(config),
    });
  } catch (e) {
    toast("Gagal menyimpan konfigurasi", "error");
  }
}

/* ---------- Helper ---------- */

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderIconPreview(icon) {
  if (icon && icon.startsWith("/icons/")) {
    return `<img src="${icon}">`;
  }
  return escapeHtml(icon || "🔘");
}

/* ---------- Toggle mode edit ---------- */

el.editBtn.onclick = () => {
  editing = !editing;
  document.body.classList.toggle("editing", editing);
  el.editBtn.classList.toggle("active", editing);
  el.editBtn.textContent = editing ? "✓" : "✏️";
  if (editing) toast("Mode edit: tekan tombol untuk ubah, ✕ untuk hapus");
  renderGrid();
};

/* ---------- Init ---------- */

async function init() {
  try {
    config = await api("/api/config");
    if (config.pages.length > 0) {
      activePageId = config.pages[0].id;
    }
    renderTabs();
    renderGrid();
  } catch (e) {
    toast("Tidak bisa terhubung ke server", "error");
  }
}

init();
