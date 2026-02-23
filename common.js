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

  const userName = localStorage.getItem("userName") || "Admin";

  const buttons = menu.map(m => {
    const isActive = current === m.href.toLowerCase();
    return `
      <button class="nav-btn ${isActive ? "active" : ""}"
        onclick="window.location.href='${m.href}'">
        ${m.label}
      </button>
    `;
  }).join("");

  // Usamos exactamente la estructura HTML que ella puso en su commit
  host.innerHTML = `
    <header class="navbar">
      <div class="navbar-shell">
        <div class="nav-left">
          <div class="brand">
            <div class="brand-logo">
              <img src="src/assets/imagenes/Logo.png" alt="Academia Moncayo" style="max-width: 100%; height: auto;" />
            </div>
            <div class="brand-text">
              <div class="brand-title">Academia Moncayo</div>
              <div class="brand-subtitle">Panel de Administración</div>
            </div>
          </div>
        </div>

        <nav class="nav-center">
          ${buttons}
        </nav>

        <div class="nav-right">
          <div class="user-chip">
            <div class="user-dot"></div>
            <span id="userDisplay">${userName}</span>
          </div>
          <button id="btnLogout" class="btn-logout" style="margin-left: 10px;">Salir</button>
        </div>
      </div>
    </header>
  `;

  const btnLogout = document.getElementById("btnLogout");
  btnLogout?.addEventListener("click", () => {
    localStorage.removeItem("userName");
    window.location.href = "index.html";
  });
});