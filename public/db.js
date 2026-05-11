/* db.js — Almacenamiento 100 % local: IndexedDB para PDFs, localStorage para miembros */

// ══════════════════════════════════════════════════════════════════════════
// IndexedDB — PDFs
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

async function listarPDFs(dia) {
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
      } else {
        resolve(out);
      }
    };
    req.onerror = e => reject(e.target.error);
  });
}

async function obtenerPDF(dia, nombre) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction('pdfs', 'readonly');
    const req = tx.objectStore('pdfs').get(`${dia}/${nombre}`);
    req.onsuccess = e => resolve(e.target.result ? e.target.result.blob : null);
    req.onerror   = e => reject(e.target.error);
  });
}

async function eliminarPDF(dia, nombre) {
  const db = await _openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').delete(`${dia}/${nombre}`);
    tx.oncomplete = resolve;
    tx.onerror    = e => reject(e.target.error);
  });
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
