const Portal = (() => {

const SUPABASE_URL = "https://TU_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "TU_PUBLIC_ANON_KEY";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

/* ================= LOGIN ================= */

async function login() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    document.getElementById("errorMsg").innerText = error.message;
    return;
  }

  window.location.href = "/portal/dashboard.html";
}

/* ================= LOGOUT ================= */

async function logout() {
  await supabase.auth.signOut();
  window.location.href = "/portal/login.html";
}

/* ================= ACTIVATION ================= */

async function handleActivation() {

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session_id");

  if (!sessionId) {
    document.getElementById("statusText").innerText =
      "Sesión inválida.";
    return;
  }

  const res = await fetch("https://hook.make.com/TU_WEBHOOK_ACTIVATION", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id: sessionId })
  });

  const data = await res.json();

  if (!data.success) {
    document.getElementById("statusText").innerText =
      "Error activando cuenta.";
    return;
  }

  document.getElementById("statusText").innerText =
    "Cuenta creada. Redirigiendo a login...";

  setTimeout(() => {
    window.location.href = "/portal/login.html";
  }, 2000);
}

/* ================= DASHBOARD ================= */

async function loadDashboard() {

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    window.location.href = "/portal/login.html";
    return;
  }

  const { data: branches, error } = await supabase
    .from("businesses")
    .select("*");

  if (error) {
    document.body.innerHTML = "Error cargando datos";
    return;
  }

  renderDashboard(branches);
}

function renderDashboard(branches) {

  if (!branches || branches.length === 0) {
    document.body.innerHTML = "No hay sucursales activas.";
    return;
  }

  document.getElementById("planBox").innerHTML =
    `Plan: ${branches[0].plan} | Permitidas: ${branches[0].allowed_quantity}`;

  const table = document.getElementById("branchesTable");
  table.innerHTML = "";

  branches.forEach(branch => {

    const row = document.createElement("tr");

    row.innerHTML = `
      <td class="py-4">
        ${branch.business_name || "Sucursal " + branch.branch_number}
      </td>
      <td>
        ${branch.activo ? "Activa" : "Desactivada"}
      </td>
      <td>
        <button onclick="alert('Configuración futura')"
          class="text-yellow-400">
          Gestionar
        </button>
      </td>
    `;

    table.appendChild(row);
  });
}

return {
  login,
  logout,
  handleActivation,
  loadDashboard
};

})();
