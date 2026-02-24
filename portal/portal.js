const Portal = (() => {

const MAKE_ACTIVATION_WEBHOOK = "https://hook.make.com/TU_WEBHOOK_ACTIVATION";
const MAKE_DASHBOARD_WEBHOOK  = "https://hook.make.com/TU_WEBHOOK_DASHBOARD";

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

async function handleActivation() {

    const sessionId = getParam("session_id");

    if (!sessionId) {
        document.getElementById("statusText").innerText = "Sesión inválida.";
        return;
    }

    try {

        const data = await postData(MAKE_ACTIVATION_WEBHOOK, {
            session_id: sessionId
        });

        if (!data.customer_id) {
            document.getElementById("statusText").innerText = "No se pudo validar el pago.";
            return;
        }

        document.getElementById("statusText").innerText =
            "Activación confirmada. Redirigiendo al portal...";

        setTimeout(() => {
            window.location.href =
                `/portal/dashboard.html?customer_id=${data.customer_id}`;
        }, 1500);

    } catch (err) {
        document.getElementById("statusText").innerText =
            "Error procesando activación.";
    }
}

async function loadDashboard() {

    const customerId = getParam("customer_id");

    if (!customerId) {
        document.body.innerHTML =
            "<h1 class='text-center mt-20 text-white'>Acceso inválido</h1>";
        return;
    }

    try {

        const data = await postData(MAKE_DASHBOARD_WEBHOOK, {
            customer_id: customerId
        });

        renderDashboard(data);

    } catch (err) {
        document.body.innerHTML =
            "<h1 class='text-center mt-20 text-white'>Error cargando datos</h1>";
    }
}

function renderDashboard(data) {

    document.getElementById("planName").innerText =
        "Plan " + data.plan;

    document.getElementById("renewalDate").innerText =
        "Renovación: " + data.renewal;

    const table = document.getElementById("branchesTable");
    table.innerHTML = "";

    data.branches.forEach(branch => {

        const row = document.createElement("tr");
        row.className = "border-b border-white/5";

        row.innerHTML = `
            <td class="py-4">
                ${branch.name || "Sucursal " + branch.branch_number}
            </td>
            <td class="py-4 ${branch.status === 'active' ? 'text-green-400' : 'text-yellow-300'}">
                ${branch.status === 'active' ? 'Activa' : 'Pendiente'}
            </td>
            <td class="py-4">
                <button class="btn-gold"
                onclick="window.location.href='${branch.form_link}'">
                ${branch.status === 'active' ? 'Ver' : 'Configurar'}
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
