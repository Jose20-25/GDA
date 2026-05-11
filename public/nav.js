/* nav.js — Renderiza la barra de navegación en todas las páginas */
(function () {
  // Detectar si estamos en la raíz o dentro de public/
  const inPublic = location.pathname.replace(/\/+$/, '').split('/').pop().includes('.');
  const atRoot   = !location.pathname.includes('/public/');
  const prefix   = atRoot ? 'public/' : '';
  const indexHref = atRoot ? 'index.html' : '../index.html';

  const LINKS = [
    { href: indexHref,                  label: 'Inicio',       key: 'index' },
    { href: prefix + 'miercoles.html',  label: '🎼 Miércoles', key: 'miercoles' },
    { href: prefix + 'viernes.html',    label: '🎹 Viernes',   key: 'viernes' },
    { href: prefix + 'domingo.html',    label: '🎺 Domingo',   key: 'domingo' },
    { href: prefix + 'vigilias.html',   label: '🕯 Vigilias',  key: 'vigilias' },
  ];

  const page = location.pathname.split('/').pop() || 'index.html';
  const currentKey = page.replace('.html', '') || 'index';

  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const logoSrc = atRoot ? 'public/logo/gda.png' : 'logo/gda.png';
  let html = `<img src="${logoSrc}" alt="GDA" class="nav-logo" onerror="this.style.display='none'"/>`;
  LINKS.forEach(link => {
    const active = (link.key === currentKey) ? ' active' : '';
    html += `<a href="${link.href}" class="nav-link${active}">${link.label}</a>`;
  });

  navbar.innerHTML = html;
})();
