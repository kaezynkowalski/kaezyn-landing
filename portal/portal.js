const Portal = (() => {

const SUPABASE_URL = "https://douynvwqijrlqzhbllcv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXludndxaWpybHF6aGJsbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM0MDMsImV4cCI6MjA4NDc2OTQwM30.F_xAB9DUqmcy84I57693q63NY1chlQxPTOK6FtQkAkQ";

const supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

/* ================= AUTH ================= */

async function requireAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = "/portal/login.html";
        return null;
    }
    return user;
}

async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/portal/login.html";
}

/* ================= DASHBOARD ================= */

async function loadDashboard() {

    const user = await requireAuth();
    if (!user) return;

    const { data: branches, error } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", user.id)
        .order("branch_number", { ascending: true });

    if (error) {
        document.body.innerHTML = "Error cargando datos.";
        return;
    }

    if (!branches || branches.length === 0) {
        document.body.innerHTML = "No hay sucursales activas.";
        return;
    }

    renderDashboard(branches);
}

function renderDashboard(branches) {

    window.currentCustomerId = branches[0].stripe_customer_id;

    const allowedQuantity = branches[0].allowed_quantity || 1;
    const activeBranches = branches.filter(b => b.activo === true).length;

    document.getElementById("planName").innerText =
        "Plan " + branches[0].plan;

    const renewalText = `
        ${activeBranches} / ${allowedQuantity} sucursales activas
    `;
    document.getElementById("renewalDate").innerText = renewalText;

    const table = document.getElementById("branchesTable");
    table.innerHTML = "";

    branches.forEach(branch => {

        const isConfigured = branch.business_name !== null;

        const row = document.createElement("tr");
        row.className = "border-b border-white/5";

        row.innerHTML = `
            <td class="py-4">
                ${branch.business_name || "Sucursal " + branch.branch_number}
            </td>
            <td class="py-4 ${
                isConfigured
                    ? (branch.activo ? 'text-green-400' : 'text-yellow-400')
                    : 'text-gray-400'
            }">
                ${
                    !isConfigured
                        ? 'Pendiente de activación'
                        : (branch.activo ? 'Activa' : 'Pausada')
                }
            </td>
            <td class="py-4">
                ${
                    !isConfigured
                        ? `<button class="btn-gold"
                            onclick="Portal.activateBranch('${branch.id}')">
                            Activar
                           </button>`
                        : `<button class="btn-gold"
                            onclick="Portal.manageBranch('${branch.id}')">
                            Gestionar
                           </button>`
                }
            </td>
        `;

        table.appendChild(row);
    });

    configureAddBranchButton(activeBranches, allowedQuantity);
}

function activateBranch(branchId) {

    const filloutBaseUrl = "https://forms.fillout.com/t/421DwsCucCus";

    const url = `${filloutBaseUrl}?branch_id=${branchId}`;

    window.location.href = url;
}
    
function configureAddBranchButton(activeBranches, allowedQuantity) {

    const button = document.querySelector(".btn-gold");

    if (!button) return;

    if (activeBranches >= allowedQuantity) {

        button.innerText = "Actualizar Plan para agregar sucursal";

        button.onclick = () => {
            Portal.openStripePortal(window.currentCustomerId);
        };

    } else {

        button.innerText = "+ Activar Sucursal Disponible";

        button.onclick = () => {
            alert("Activa una sucursal pendiente desde la tabla.");
        };
    }
}


/* ================= STRIPE PORTAL ================= */

async function openStripePortal(customerId) {

    const user = await requireAuth();
    if (!user) return;

    const res = await fetch("https://hook.us2.make.com/4nwu1igjvf2casgekjsf24lujuse5i5s", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_id: customerId })
    });

    const data = await res.json();

    if (data.url) {
        window.location.href = data.url;
    }
}

return {
    handleActivation,
    loadDashboard,
    logout,
    openStripePortal
};

})();
