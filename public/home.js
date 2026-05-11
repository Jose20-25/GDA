/* home.js — Lógica de la página principal: gestión de integrantes (localStorage) */

/* ── Toast ─────────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Iniciales como avatar ─────────────────────────────────────── */
function iniciales(nombre) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Render de tarjetas ────────────────────────────────────────── */
function renderEquipo(miembros) {
  const grid = document.getElementById('team-grid');
  if (!miembros.length) {
    grid.innerHTML = `
      <div class="team-empty">
        <span class="empty-icon">🎸</span>
        <strong>No hay integrantes registrados aún.</strong>
        <p>Usa el botón "Agregar integrante" para añadir al equipo.</p>
      </div>`;
    return;
  }

  grid.innerHTML = miembros.map(m => {
    const avatarHTML = m.foto
      ? `<img class="member-avatar" src="${m.foto}" alt="${m.nombre}"/>`
      : `<div class="member-avatar-placeholder">${iniciales(m.nombre)}</div>`;

    const instrumento = m.instrumento
      ? `<div class="member-instrumento">🎵 ${m.instrumento}</div>`
      : '<div class="member-instrumento" style="opacity:0.4">Sin instrumento registrado</div>';

    return `
      <div class="member-card">
        <div class="member-avatar-wrap">${avatarHTML}</div>
        <div class="member-info">
          <div class="member-name">${m.nombre}</div>
          <div class="member-cargo">${m.cargo}</div>
          ${instrumento}
        </div>
        <div class="member-actions">
          <button class="btn-icon-sm btn-ver-sm" data-id="${m.id}" title="Ver perfil">👁 Ver perfil</button>
          <button class="btn-icon-sm btn-edit-sm" data-id="${m.id}" title="Editar">✏ Editar</button>
          <button class="btn-icon-sm btn-del-sm"  data-id="${m.id}" title="Eliminar">🗑</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-ver-sm').forEach(btn =>
    btn.addEventListener('click', () => verPerfil(btn.dataset.id, miembros)));
  grid.querySelectorAll('.btn-edit-sm').forEach(btn =>
    btn.addEventListener('click', () => abrirEditar(btn.dataset.id, miembros)));
  grid.querySelectorAll('.btn-del-sm').forEach(btn =>
    btn.addEventListener('click', () => eliminarMiembro(btn.dataset.id)));
}

/* ── Cargar miembros ───────────────────────────────────────────── */
function cargarMiembros() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '<div class="team-loading"><span class="spinner"></span> Cargando equipo...</div>';
  try {
    const data = leerMiembros();
    renderEquipo(data);
  } catch {
    grid.innerHTML = '<div class="team-empty"><span class="empty-icon">⚠️</span>Error al cargar el equipo.</div>';
  }
}

/* ── Modal ─────────────────────────────────────────────────────── */
function abrirModal(titulo) {
  document.getElementById('modal-miembro-title').textContent = titulo;
  document.getElementById('modal-miembro').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarModal() {
  document.getElementById('modal-miembro').classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('form-miembro').reset();
  document.getElementById('miembro-id').value = '';
  resetFotoPreview();
}

function resetFotoPreview() {
  const prev = document.getElementById('foto-preview');
  prev.innerHTML = '<span class="foto-placeholder-icon">👤</span>';
  prev.dataset.fotoData = '';
}

function abrirEditar(id, miembros) {
  const m = miembros.find(x => x.id === id);
  if (!m) return;
  document.getElementById('miembro-id').value = m.id;
  document.getElementById('input-nombre').value = m.nombre;
  document.getElementById('input-cargo').value = m.cargo;
  document.getElementById('input-instrumento').value = m.instrumento || '';

  const prev = document.getElementById('foto-preview');
  if (m.foto) {
    prev.innerHTML = `<img src="${m.foto}" alt="${m.nombre}"/>`;
    prev.dataset.fotoData = m.foto;
  } else {
    prev.innerHTML = `<div style="font-size:2rem;font-weight:700;color:var(--primary-mid)">${iniciales(m.nombre)}</div>`;
    prev.dataset.fotoData = '';
  }
  abrirModal('Editar integrante');
}

/* ── Preview de foto al seleccionar (se guarda como base64) ─────── */
document.getElementById('input-foto').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const prev = document.getElementById('foto-preview');
    prev.innerHTML = `<img src="${ev.target.result}" alt="preview"/>`;
    prev.dataset.fotoData = ev.target.result;
  };
  reader.readAsDataURL(file);
});

/* ── Submit form ───────────────────────────────────────────────── */
document.getElementById('form-miembro').addEventListener('submit', e => {
  e.preventDefault();
  const id          = document.getElementById('miembro-id').value;
  const nombre      = document.getElementById('input-nombre').value.trim();
  const cargo       = document.getElementById('input-cargo').value.trim();
  const instrumento = document.getElementById('input-instrumento').value.trim();
  const fotoData    = document.getElementById('foto-preview').dataset.fotoData || '';

  if (!nombre || !cargo) { showToast('Nombre y cargo son requeridos.', 'error'); return; }

  const miembros = leerMiembros();

  if (id) {
    const idx = miembros.findIndex(m => m.id === id);
    if (idx === -1) { showToast('Integrante no encontrado.', 'error'); return; }
    miembros[idx] = {
      ...miembros[idx],
      nombre,
      cargo,
      instrumento,
      foto: fotoData || miembros[idx].foto
    };
    showToast('Integrante actualizado.', 'success');
  } else {
    miembros.push({
      id: _uuid(),
      nombre,
      cargo,
      instrumento,
      foto: fotoData || null,
      creado: new Date().toISOString()
    });
    showToast('Integrante agregado.', 'success');
  }

  guardarMiembros(miembros);
  cerrarModal();
  cargarMiembros();
});

/* ── Eliminar miembro ──────────────────────────────────────────── */
function eliminarMiembro(id) {
  if (!confirm('¿Eliminar este integrante del equipo?')) return;
  const miembros = leerMiembros().filter(m => m.id !== id);
  guardarMiembros(miembros);
  showToast('Integrante eliminado.', 'success');
  cargarMiembros();
}

/* ── Ver perfil (modal grande) ────────────────────────────────── */
function verPerfil(id, miembros) {
  const m = miembros.find(x => x.id === id);
  if (!m) return;

  const avatarHTML = m.foto
    ? `<img class="perfil-foto" src="${m.foto}" alt="${m.nombre}"/>`
    : `<div class="perfil-foto-placeholder">${iniciales(m.nombre)}</div>`;

  document.getElementById('perfil-avatar').innerHTML = avatarHTML;
  document.getElementById('perfil-nombre').textContent = m.nombre;
  document.getElementById('perfil-cargo').textContent = m.cargo;
  document.getElementById('perfil-instrumento').textContent = m.instrumento || 'No especificado';

  const btnEditar = document.getElementById('perfil-btn-editar');
  btnEditar.onclick = () => { cerrarPerfil(); abrirEditar(id, miembros); };

  document.getElementById('modal-perfil').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarPerfil() {
  document.getElementById('modal-perfil').classList.add('hidden');
  document.body.style.overflow = '';
}
document.getElementById('modal-perfil-close').addEventListener('click', cerrarPerfil);
document.getElementById('modal-perfil').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-perfil')) cerrarPerfil();
});

/* ── Eventos botones y modal ───────────────────────────────────── */
document.getElementById('btn-agregar').addEventListener('click', () => abrirModal('Agregar integrante'));
document.getElementById('modal-miembro-close').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar-miembro').addEventListener('click', cerrarModal);
document.getElementById('modal-miembro').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-miembro')) cerrarModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { cerrarModal(); cerrarPerfil(); }
});

/* ── Cargar al inicio ──────────────────────────────────────────── */
cargarMiembros();

/* ── Toast ─────────────────────────────────────────────────────── */
function showToast(msg, type = '') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/* ── Iniciales como avatar ─────────────────────────────────────── */
function iniciales(nombre) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

/* ── Render de tarjetas ────────────────────────────────────────── */
function renderEquipo(miembros) {
  const grid = document.getElementById('team-grid');
  if (!miembros.length) {
    grid.innerHTML = `
      <div class="team-empty">
        <span class="empty-icon">🎸</span>
        <strong>No hay integrantes registrados aún.</strong>
        <p>Usa el botón "Agregar integrante" para añadir al equipo.</p>
      </div>`;
    return;
  }

  grid.innerHTML = miembros.map(m => {
    const avatarHTML = m.foto
      ? `<img class="member-avatar" src="/uploads/fotos/${encodeURIComponent(m.foto)}" alt="${m.nombre}"/>`
      : `<div class="member-avatar-placeholder">${iniciales(m.nombre)}</div>`;

    const instrumento = m.instrumento
      ? `<div class="member-instrumento">🎵 ${m.instrumento}</div>`
      : '<div class="member-instrumento" style="opacity:0.4">Sin instrumento registrado</div>';

    return `
      <div class="member-card">
        <div class="member-avatar-wrap">${avatarHTML}</div>
        <div class="member-info">
          <div class="member-name">${m.nombre}</div>
          <div class="member-cargo">${m.cargo}</div>
          ${instrumento}
        </div>
        <div class="member-actions">
          <button class="btn-icon-sm btn-ver-sm" data-id="${m.id}" title="Ver perfil">👁 Ver perfil</button>
          <button class="btn-icon-sm btn-edit-sm" data-id="${m.id}" title="Editar">✏ Editar</button>
          <button class="btn-icon-sm btn-del-sm"  data-id="${m.id}" title="Eliminar">🗑</button>
        </div>
      </div>`;
  }).join('');

  grid.querySelectorAll('.btn-ver-sm').forEach(btn =>
    btn.addEventListener('click', () => verPerfil(btn.dataset.id, miembros)));
  grid.querySelectorAll('.btn-edit-sm').forEach(btn =>
    btn.addEventListener('click', () => abrirEditar(btn.dataset.id, miembros)));
  grid.querySelectorAll('.btn-del-sm').forEach(btn =>
    btn.addEventListener('click', () => eliminarMiembro(btn.dataset.id)));
}

/* ── Cargar miembros ───────────────────────────────────────────── */
async function cargarMiembros() {
  const grid = document.getElementById('team-grid');
  grid.innerHTML = '<div class="team-loading"><span class="spinner"></span> Cargando equipo...</div>';
  try {
    const res = await fetch('/api/miembros');
    const data = await res.json();
    renderEquipo(data);
  } catch {
    grid.innerHTML = '<div class="team-empty"><span class="empty-icon">⚠️</span>Error al cargar el equipo.</div>';
  }
}

/* ── Modal ─────────────────────────────────────────────────────── */
function abrirModal(titulo) {
  document.getElementById('modal-miembro-title').textContent = titulo;
  document.getElementById('modal-miembro').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarModal() {
  document.getElementById('modal-miembro').classList.add('hidden');
  document.body.style.overflow = '';
  document.getElementById('form-miembro').reset();
  document.getElementById('miembro-id').value = '';
  resetFotoPreview();
}

function resetFotoPreview() {
  const prev = document.getElementById('foto-preview');
  prev.innerHTML = '<span class="foto-placeholder-icon">👤</span>';
}

function abrirEditar(id, miembros) {
  const m = miembros.find(x => x.id === id);
  if (!m) return;
  document.getElementById('miembro-id').value = m.id;
  document.getElementById('input-nombre').value = m.nombre;
  document.getElementById('input-cargo').value = m.cargo;
  document.getElementById('input-instrumento').value = m.instrumento || '';

  const prev = document.getElementById('foto-preview');
  if (m.foto) {
    prev.innerHTML = `<img src="/uploads/fotos/${encodeURIComponent(m.foto)}" alt="${m.nombre}"/>`;
  } else {
    prev.innerHTML = `<div style="font-size:2rem;font-weight:700;color:var(--primary-mid)">${iniciales(m.nombre)}</div>`;
  }
  abrirModal('Editar integrante');
}

/* ── Preview de foto al seleccionar ───────────────────────────── */
document.getElementById('input-foto').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    document.getElementById('foto-preview').innerHTML =
      `<img src="${ev.target.result}" alt="preview"/>`;
  };
  reader.readAsDataURL(file);
});

/* ── Submit form ───────────────────────────────────────────────── */
document.getElementById('form-miembro').addEventListener('submit', async e => {
  e.preventDefault();
  const id = document.getElementById('miembro-id').value;
  const formData = new FormData(e.target);

  const url = id ? `/api/miembros/${id}` : '/api/miembros';
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, { method, body: formData });
    const data = await res.json();
    if (!res.ok) { showToast(data.error || 'Error al guardar.', 'error'); return; }
    showToast(id ? 'Integrante actualizado.' : 'Integrante agregado.', 'success');
    cerrarModal();
    cargarMiembros();
  } catch {
    showToast('Error de red.', 'error');
  }
});

/* ── Eliminar miembro ──────────────────────────────────────────── */
async function eliminarMiembro(id) {
  if (!confirm('¿Eliminar este integrante del equipo?')) return;
  try {
    const res = await fetch(`/api/miembros/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { showToast('Integrante eliminado.', 'success'); cargarMiembros(); }
    else showToast(data.error || 'Error al eliminar.', 'error');
  } catch {
    showToast('Error de red.', 'error');
  }
}

/* ── Ver perfil (modal grande) ────────────────────────────────── */
function verPerfil(id, miembros) {
  const m = miembros.find(x => x.id === id);
  if (!m) return;

  const avatarHTML = m.foto
    ? `<img class="perfil-foto" src="/uploads/fotos/${encodeURIComponent(m.foto)}" alt="${m.nombre}"/>`
    : `<div class="perfil-foto-placeholder">${iniciales(m.nombre)}</div>`;

  document.getElementById('perfil-avatar').innerHTML = avatarHTML;
  document.getElementById('perfil-nombre').textContent = m.nombre;
  document.getElementById('perfil-cargo').textContent = m.cargo;
  document.getElementById('perfil-instrumento').textContent = m.instrumento || 'No especificado';

  const btnEditar = document.getElementById('perfil-btn-editar');
  btnEditar.onclick = () => { cerrarPerfil(); abrirEditar(id, miembros); };

  document.getElementById('modal-perfil').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function cerrarPerfil() {
  document.getElementById('modal-perfil').classList.add('hidden');
  document.body.style.overflow = '';
}
document.getElementById('modal-perfil-close').addEventListener('click', cerrarPerfil);
document.getElementById('modal-perfil').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-perfil')) cerrarPerfil();
});

/* ── Eventos botones y modal ───────────────────────────────────── */
document.getElementById('btn-agregar').addEventListener('click', () => abrirModal('Agregar integrante'));
document.getElementById('modal-miembro-close').addEventListener('click', cerrarModal);
document.getElementById('btn-cancelar-miembro').addEventListener('click', cerrarModal);
document.getElementById('modal-miembro').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-miembro')) cerrarModal();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { cerrarModal(); cerrarPerfil(); }
});

/* ── Cargar al inicio ──────────────────────────────────────────── */
cargarMiembros();
