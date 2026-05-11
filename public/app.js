/* app.js — Logica de cada pagina de dia */

const DIA = typeof DIA_ACTUAL !== "undefined" ? DIA_ACTUAL : "miercoles";

/* Toast */
function showToast(msg, type = "") {
  const c = document.getElementById("toast-container");
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* Cargar archivos */
async function cargarArchivos() {
  const listEl = document.getElementById("file-list");
  listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⏳</div>Cargando...</div>';
  try {
    const res = await fetch("/api/archivos/" + DIA);
    if (!res.ok) throw new Error();
    const archivos = await res.json();
    // Ordenar alfanuméricamente (1.pdf, 2.pdf, Cadena1.pdf …)
    archivos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (!archivos.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div>No hay archivos aun. Sube el primer PDF para este dia.<p></p></div>';
    } else {
      listEl.innerHTML = "";
      archivos.forEach((nombre, i) => listEl.appendChild(crearItem(nombre, i + 1, archivos.length)));
    }
    // Actualizar calendario según los archivos cargados
    if (typeof renderCalendario === 'function') renderCalendario();
  } catch {
    listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">⚠️</div>No se pudieron cargar los archivos.</div>';
  }
}

/* Crear item de archivo */
function crearItem(nombre, numCadena, total) {
  const item = document.createElement("div");
  item.className = "file-item";
  const corto = nombre.replace(/\.pdf$/i, '');
  const display = corto.length > 55 ? corto.substring(0, 52) + "..." : corto;
  item.innerHTML = `
    <div class="file-icon">📄</div>
    <div class="file-info">
      <div class="file-name" title="${nombre}">${display}</div>
      <div class="file-meta">
        <span class="cadena-num-badge">Cadena #${numCadena}</span>
        <span class="meta-sep">·</span>
        <span>${total} en rotación</span>
      </div>
    </div>
    <div class="file-actions">
      <button class="btn-view" data-nombre="${nombre}">👁 Ver</button>
      <button class="btn-delete" data-nombre="${nombre}">🗑 Eliminar</button>
    </div>`;
  item.querySelector(".btn-view").addEventListener("click", () => abrirPDF(nombre));
  item.querySelector(".btn-delete").addEventListener("click", () => eliminarArchivo(nombre));
  return item;
}

/* Subir archivo */
async function subirArchivo(file) {
  if (!file) return;
  if (file.type !== "application/pdf") { showToast("Solo se permiten PDFs.", "error"); return; }
  if (file.size > 20 * 1024 * 1024) { showToast("El archivo supera 20 MB.", "error"); return; }

  const pw = document.getElementById("progress-dia");
  const fill = pw.querySelector(".progress-fill");
  const label = pw.querySelector(".progress-label");
  pw.classList.remove("hidden");
  fill.style.width = "0%";

  const fd = new FormData();
  fd.append("pdf", file);

  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload/" + DIA);
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const p = Math.round(e.loaded / e.total * 100);
        fill.style.width = p + "%";
        label.textContent = "Subiendo... " + p + "%";
      }
    };
    xhr.onload = () => {
      pw.classList.add("hidden");
      if (xhr.status === 200) { showToast("Archivo subido!", "success"); cargarArchivos(); }
      else {
        try { showToast(JSON.parse(xhr.responseText).error || "Error al subir.", "error"); }
        catch { showToast("Error al subir.", "error"); }
      }
      resolve();
    };
    xhr.onerror = () => { pw.classList.add("hidden"); showToast("Error de red.", "error"); resolve(); };
    xhr.send(fd);
  });
}

/* Input de archivo */
document.getElementById("file-dia").addEventListener("change", async e => {
  if (e.target.files[0]) { await subirArchivo(e.target.files[0]); e.target.value = ""; }
});

/* Drag & Drop */
const dropZone = document.querySelector(".drop-zone");
if (dropZone) {
  dropZone.addEventListener("dragover", e => { e.preventDefault(); dropZone.classList.add("drag-over"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
  dropZone.addEventListener("drop", async e => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    if (e.dataTransfer.files[0]) await subirArchivo(e.dataTransfer.files[0]);
  });
}

/* Visor PDF */
function abrirPDF(nombre) {
  document.getElementById("modal-title").textContent = nombre;
  document.getElementById("pdf-frame").src = "/uploads/" + DIA + "/" + encodeURIComponent(nombre);
  document.getElementById("modal-overlay").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function cerrarPDF() {
  document.getElementById("pdf-frame").src = "";
  document.getElementById("modal-overlay").classList.add("hidden");
  document.body.style.overflow = "";
}
document.getElementById("modal-close").addEventListener("click", cerrarPDF);
document.getElementById("modal-overlay").addEventListener("click", e => {
  if (e.target === document.getElementById("modal-overlay")) cerrarPDF();
});
document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarPDF(); });

/* Eliminar */
async function eliminarArchivo(nombre) {
  if (!confirm('Eliminar "' + nombre + '"?')) return;
  try {
    const res = await fetch("/api/archivos/" + DIA + "/" + encodeURIComponent(nombre), { method: "DELETE" });
    const data = await res.json();
    if (res.ok) { showToast("Archivo eliminado.", "success"); cargarArchivos(); }
    else showToast(data.error || "Error al eliminar.", "error");
  } catch { showToast("Error de red.", "error"); }
}

cargarArchivos();
