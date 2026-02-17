// =========================================
// COMMON HEADER MONCAYO (inyecta navbar igual en todas)
// =========================================

document.addEventListener("DOMContentLoaded", () => {
  const host = document.getElementById("app-header");
  if (!host) return;

  const current = (location.pathname.split("/").pop() || "").toLowerCase();

  const menu = [
    { label: "Inicio", href: "dashboard.html" },
    { label: "Alumnos", href: "students.html" },
    { label: "Maestros", href: "teachers.html" },
    { label: "Calendario", href: "calendar.html" },
    { label: "Finanzas", href: "finanzas.html" },
    { label: "Almacen", href: "almacen.html" },
  ];

  const userName = localStorage.getItem("userName") || "vania";

  const buttons = menu.map(m => {
    const isActive = current === m.href.toLowerCase();
    return `
      <button class="nav-btn ${isActive ? "active" : ""}"
        onclick="window.location.href='${m.href}'">
        ${m.label}
      </button>
    `;
  }).join("");

  host.innerHTML = `
    <header class="navbar">
      <div class="brand">
        <img src="logo.png" alt="Logo Academia Moncayo">
        <div class="brand-text">
          <h3 class="brand-title">Academia Moncayo</h3>
          <p class="brand-subtitle">Panel de Administración</p>
        </div>
      </div>

      <nav class="nav-center">
        ${buttons}
      </nav>

      <div class="nav-right">
        <div class="user-pill">
          <span class="user-dot"></span>
          <span id="userDisplay">${userName}</span>
        </div>
        <button class="btn-logout" id="btnLogout">Salir</button>
      </div>
    </header>
  `;

  const btnLogout = document.getElementById("btnLogout");
  btnLogout?.addEventListener("click", () => {
    localStorage.removeItem("userName");
    window.location.href = "index.html";
  });
});
