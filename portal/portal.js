const Portal = (() => {

const MAKE_ACTIVATION_WEBHOOK = "https://hook.make.com/TU_WEBHOOK_ACTIVATION";

const SUPABASE_URL = "https://TU_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "TU_PUBLIC_ANON_KEY";

function getParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
}

async function postData(url, data) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });
    return res.json();
}

/* =========================
   ACTIVATION FLOW
========================= */

async function handleActivation() {

    const sessionId = getParam("session_id");

    if (!sessionId) {
        document.getElementById("statusText").innerText =
            "Sesión inválida.";
        return;
    }

    try {

        const data = await postData(MAKE_ACTIVATION_WEBHOOK, {
            session_id: sessionId
        });

        if (!data.access_token) {
            document.getElementById("statusText").innerText =
                "No se pudo validar el pago.";
            return;
        }

        document.getElementById("statusText").innerText =
            "Activación confirmada. Redirigiendo al portal...";

        setTimeout(() => {
            window.location.href =
                `/portal/dashboard.html?token=${data.access_token}`;
        }, 1500);

    } catch (err) {
        document.getElementById("statusText").innerText =
            "Error procesando activación.";
    }
}

/* =========================
   DASHBOARD FLOW
========================= */

async function loadDashboard() {

    const token = getParam("token");

    if (!token) {
        document.body.innerHTML =
            "<h1 class='text-center mt-20 text-white'>Acceso inválido</h1>";
        return;
    }

    try {

        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/businesses?select=*`,
            {
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                    "access_token": token
                }
            }
        );

        const branches = await res.json();

        if (!branches || branches.length === 0) {
            document.body.innerHTML =
                "<h1 class='text-center mt-20 text-white'>Token inválido o expirado</h1>";
            return;
        }

        renderDashboard(branches);

    } catch (err) {
        document.body.innerHTML =
            "<h1 class='text-center mt-20 text-white'>Error cargando datos</h1>";
    }
}

function renderDashboard(branches) {

    document.getElementById("planName").innerText =
        "Plan " + branches[0].plan;

    const table = document.getElementById("branchesTable");
    table.innerHTML = "";

    branches.forEach(branch => {

        const row = document.createElement("tr");
        row.className = "border-b border-white/5";

        row.innerHTML = `
            <td class="py-4">
                ${branch.business_name || "Sucursal " + branch.branch_number}
            </td>
            <td class="py-4 ${branch.status === 'activo' ? 'text-green-400' : 'text-yellow-300'}">
                ${branch.status}
            </td>
            <td class="py-4">
                <button class="btn-gold"
                onclick="alert('Configuración futura')">
                Ver
                </button>
            </td>
        `;

        table.appendChild(row);
    });

}

return {
    handleActivation,
    loadDashboard
};

})();
