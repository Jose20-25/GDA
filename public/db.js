/* db.js — PDFs estáticos (GitHub) + IndexedDB local; miembros en localStorage */

// ══════════════════════════════════════════════════════════════════════════
// Manifest estático — archivos.json (compartido en todos los dispositivos)
// ══════════════════════════════════════════════════════════════════════════
let _manifest = null;

async function _cargarManifest() {
  if (_manifest) return _manifest;
  try {
    const res = await fetch('archivos.json?v=' + Date.now());
    _manifest = res.ok ? await res.json() : {};
  } catch { _manifest = {}; }
  return _manifest;
}

async function listarPDFsEstaticos(dia) {
  const m = await _cargarManifest();
  return Array.isArray(m[dia]) ? m[dia] : [];
}

// URL pública de un PDF estático
function urlPDF(dia, nombre) {
  return `${dia}/${encodeURIComponent(nombre)}`;
}

// ══════════════════════════════════════════════════════════════════════════
// IndexedDB — PDFs subidos localmente (solo en este dispositivo)
// ══════════════════════════════════════════════════════════════════════════
const _DB_NAME    = 'gdaDB';
const _DB_VERSION = 1;
let   _db         = null;

function _openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(_DB_NAME, _DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'key' });
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

async function guardarPDF(dia, nombre, blob) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').put({ key: `${dia}/${nombre}`, dia, nombre, blob, fecha: Date.now() });
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

async function listarPDFsLocales(dia) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pdfs', 'readonly');
    const out = [];
    const req = tx.objectStore('pdfs').openCursor();
    req.onsuccess = e => {
      const cursor = e.target.result;
      if (cursor) {
        if (cursor.value.dia === dia) out.push(cursor.value.nombre);
        cursor.continue();
      } else { resolve(out); }
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function obtenerPDFLocal(dia, nombre) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pdfs', 'readonly');
    const req = tx.objectStore('pdfs').get(`${dia}/${nombre}`);
    req.onsuccess = e => resolve(e.target.result ? e.target.result.blob : null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function eliminarPDFLocal(dia, nombre) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').delete(`${dia}/${nombre}`);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
}

// ══════════════════════════════════════════════════════════════════════════
// API pública unificada (estáticos + locales combinados)
// ══════════════════════════════════════════════════════════════════════════

async function listarPDFs(dia) {
  const [estaticos, locales] = await Promise.all([
    listarPDFsEstaticos(dia),
    listarPDFsLocales(dia)
  ]);
  // Combinar sin duplicados
  const todos = [...estaticos];
  locales.forEach(n => { if (!todos.includes(n)) todos.push(n); });
  return todos;
}

async function obtenerPDF(dia, nombre) {
  // Intentar como archivo estático primero
  try {
    const res = await fetch(urlPDF(dia, nombre));
    if (res.ok) return await res.blob();
  } catch {}
  // Fallback a IndexedDB local
  return obtenerPDFLocal(dia, nombre);
}

async function eliminarPDF(dia, nombre) {
  // Solo se pueden eliminar los locales (los estáticos viven en GitHub)
  return eliminarPDFLocal(dia, nombre);
}

// ══════════════════════════════════════════════════════════════════════════
// localStorage — Miembros
// ══════════════════════════════════════════════════════════════════════════
const _MIEMBROS_KEY = 'gda_miembros';

function leerMiembros() {
  try { return JSON.parse(localStorage.getItem(_MIEMBROS_KEY) || '[]'); }
  catch { return []; }
}

function guardarMiembros(data) {
  localStorage.setItem(_MIEMBROS_KEY, JSON.stringify(data));
}

// ── UUID simple ──────────────────────────────────────────────────────────
function _uuid() {
  return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
}
