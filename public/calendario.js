/* ============================================================
   calendario.js — Calendario de cadenas (basado en archivos)
   ============================================================ */

const _CAL_CONFIG = {
  miercoles: { diaSemana: 3, nombre: 'Miércoles', emoji: '📅' },
  viernes:   { diaSemana: 5, nombre: 'Viernes',   emoji: '📅' },
  domingo:   { diaSemana: 0, nombre: 'Domingo',   emoji: '📅' },
  vigilias:  { diaSemana: 6, nombre: 'Vigilia',   emoji: '🕯', esVigilia: true }
};

const _MESES_CAL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

async function renderCalendario() {
  const dia    = (typeof DIA_ACTUAL !== 'undefined') ? DIA_ACTUAL : 'miercoles';
  const config = _CAL_CONFIG[dia];
  const container = document.getElementById('calendario-container');
  if (!config || !container) return;

  const hoy   = new Date();
  const hoyMs = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).getTime();

  // Fetch y ordenar archivos
  let archivos = [];
  try {
    const res = await fetch('/api/archivos/' + dia);
    if (res.ok) archivos = await res.json();
  } catch {}
  archivos.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const numCadenas = archivos.length;

  if (numCadenas === 0) {
    container.innerHTML = `
      <div class="cal-header">
        <span class="cal-mes-titulo">${config.emoji} Calendario de Cadenas</span>
      </div>
      <div class="cal-empty">
        <span class="cal-empty-icon">📂</span>
        <p>Sube archivos PDF para ver el calendario de cadenas asignado automáticamente.</p>
      </div>`;
    return;
  }

  // Próxima fecha del día de la semana >= hoy
  function proximaFecha(diaSemana) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    while (d.getDay() !== diaSemana) d.setDate(d.getDate() + 1);
    return d;
  }

  // Último sábado de un mes
  function ultimoSabado(mes, anio) {
    const d = new Date(anio, mes + 1, 0);
    while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
    return d;
  }

  function nombreCorto(n) {
    // Quitar extensión .pdf y recortar
    const s = n.replace(/\.pdf$/i, '');
    return s.length > 32 ? s.substring(0, 30) + '…' : s;
  }

  let html = `
    <div class="cal-header">
      <span class="cal-mes-titulo">${config.emoji} Calendario de Cadenas</span>
      <span class="cal-total-badge">${numCadenas} cadena${numCadenas !== 1 ? 's' : ''} · ciclo continuo</span>
    </div>
    <div class="cal-grid">`;

  if (config.esVigilia) {
    // Un último sábado por cada cadena (meses consecutivos)
    let mes = hoy.getMonth(), anio = hoy.getFullYear();
    for (let i = 0; i < numCadenas; i++) {
      const f          = ultimoSabado(mes, anio);
      const fMs        = f.getTime();
      const cadenaIdx  = i % numCadenas;
      const nombre     = archivos[cadenaIdx];
      const pasado     = fMs < hoyMs;
      const esHoy      = fMs === hoyMs;
      const clase      = esHoy ? 'cal-item cal-actual'
                       : pasado ? 'cal-item cal-pasado'
                       : i === 0 ? 'cal-item cal-proximo cal-next'
                       : 'cal-item cal-proximo';
      const statusTxt  = esHoy ? '¡Hoy!' : pasado ? 'Realizada' : i === 0 ? '¡Próxima!' : '';

      html += `
        <div class="${clase}">
          <span class="cal-dia-semana">Sábado</span>
          <span class="cal-fecha-num">${f.getDate()}</span>
          <span class="cal-mes-label">${_MESES_CAL[f.getMonth()]} ${f.getFullYear()}</span>
          <span class="cal-cadena-badge">Cadena #${cadenaIdx + 1}</span>
          ${statusTxt ? `<span class="cal-status-badge">${statusTxt}</span>` : ''}
          <span class="cal-cadena-label" title="${nombre}">📄 ${nombreCorto(nombre)}</span>
        </div>`;

      mes++; if (mes > 11) { mes = 0; anio++; }
    }
  } else {
    const base = proximaFecha(config.diaSemana);
    for (let i = 0; i < numCadenas; i++) {
      const f         = new Date(base);
      f.setDate(base.getDate() + i * 7);
      const fMs       = f.getTime();
      const cadenaIdx = i % numCadenas;
      const nombre    = archivos[cadenaIdx];
      const esHoy     = fMs === hoyMs;
      const clase     = esHoy ? 'cal-item cal-actual'
                      : i === 0 ? 'cal-item cal-proximo cal-next'
                      : 'cal-item cal-proximo';
      const statusTxt = esHoy ? '¡Esta semana!' : i === 0 ? '¡Próxima!' : '';

      html += `
        <div class="${clase}">
          <span class="cal-dia-semana">${config.nombre}</span>
          <span class="cal-fecha-num">${f.getDate()}</span>
          <span class="cal-mes-label">${_MESES_CAL[f.getMonth()]} ${f.getFullYear()}</span>
          <span class="cal-cadena-badge">Cadena #${cadenaIdx + 1}</span>
          ${statusTxt ? `<span class="cal-status-badge">${statusTxt}</span>` : ''}
          <span class="cal-cadena-label" title="${nombre}">📄 ${nombreCorto(nombre)}</span>
        </div>`;
    }
  }

  html += `</div>
    <div class="cal-ciclo-info">
      ♻ Al terminar la <strong>Cadena #${numCadenas}</strong>, el ciclo reinicia automáticamente con la <strong>Cadena #1</strong>
    </div>`;

  container.innerHTML = html;
}

renderCalendario();
