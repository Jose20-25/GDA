/* app.js — Logica de cada pagina de dia (almacenamiento local: IndexedDB) */

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
    const archivos = await listarPDFs(DIA);
    archivos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
    if (!archivos.length) {
      listEl.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div>No hay archivos aun. Sube el primer PDF para este dia.<p></p></div>';
    } else {
      listEl.innerHTML = "";
      archivos.forEach((nombre, i) => listEl.appendChild(crearItem(nombre, i + 1, archivos.length)));
    }
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

/* Guardar archivo en IndexedDB */
async function subirArchivo(file) {
  if (!file) return;
  if (file.type !== "application/pdf") { showToast("Solo se permiten PDFs.", "error"); return; }
  if (file.size > 50 * 1024 * 1024) { showToast("El archivo supera 50 MB.", "error"); return; }

  const pw    = document.getElementById("progress-dia");
  const fill  = pw.querySelector(".progress-fill");
  const label = pw.querySelector(".progress-label");
  pw.classList.remove("hidden");
  fill.style.width = "50%";
  label.textContent = "Guardando...";

  try {
    const safeName = file.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑüÜ.\-_ ]/g, '_').trim();
    await guardarPDF(DIA, safeName, file);
    fill.style.width = "100%";
    label.textContent = "¡Guardado!";
    setTimeout(() => pw.classList.add("hidden"), 800);
    showToast("Archivo guardado!", "success");
    cargarArchivos();
  } catch {
    pw.classList.add("hidden");
    showToast("Error al guardar el archivo.", "error");
  }
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
const GITHUB_BASE = 'https://jose20-25.github.io/GDA/public/';
let _blobURL = null;
async function abrirPDF(nombre) {
  try {
    const estaticos = await listarPDFsEstaticos(DIA);
    if (estaticos.includes(nombre)) {
      // Archivo estático: abrir con Google Docs Viewer
      const pdfURL = GITHUB_BASE + DIA + '/' + encodeURIComponent(nombre);
      const viewerURL = 'https://docs.google.com/viewer?url=' + encodeURIComponent(pdfURL);
      window.open(viewerURL, '_blank');
      return;
    }
    // Archivo local (IndexedDB): abrir blob en nueva pestaña
    const blob = await obtenerPDF(DIA, nombre);
    if (!blob) { showToast("No se pudo cargar el archivo.", "error"); return; }
    if (_blobURL) URL.revokeObjectURL(_blobURL);
    _blobURL = URL.createObjectURL(blob);
    window.open(_blobURL, '_blank');
  } catch {
    showToast("Error al abrir el archivo.", "error");
  }
}
function cerrarPDF() {
  document.getElementById("pdf-frame").src = "";
  document.getElementById("modal-overlay").classList.add("hidden");
  document.body.style.overflow = "";
  if (_blobURL) { URL.revokeObjectURL(_blobURL); _blobURL = null; }
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
    await eliminarPDF(DIA, nombre);
    showToast("Archivo eliminado.", "success");
    cargarArchivos();
  } catch {
    showToast("Error al eliminar.", "error");
  }
}

cargarArchivos();
