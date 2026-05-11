/* nav.js — Renderiza la barra de navegación en todas las páginas */
(function () {
  const LINKS = [
    { href: 'index.html',     label: 'Inicio',     key: 'index' },
    { href: 'miercoles.html', label: '🎼 Miércoles', key: 'miercoles' },
    { href: 'viernes.html',   label: '🎹 Viernes',   key: 'viernes' },
    { href: 'domingo.html',   label: '🎺 Domingo',   key: 'domingo' },
    { href: 'vigilias.html',  label: '🕯 Vigilias',  key: 'vigilias' },
  ];

  const page = location.pathname.split('/').pop() || 'index.html';
  const currentKey = page.replace('.html', '') || 'index';

  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  let html = `<img src="/logo/gda.png" alt="GDA" class="nav-logo" onerror="this.style.display='none'"/>`;
  LINKS.forEach(link => {
    const active = (link.key === currentKey) ? ' active' : '';
    html += `<a href="${link.href}" class="nav-link${active}">${link.label}</a>`;
  });

  navbar.innerHTML = html;
})();
