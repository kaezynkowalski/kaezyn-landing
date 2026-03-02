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
            <td class="py-4 ${branch.activo ? 'text-green-400' : 'text-red-400'}">
                ${branch.activo ? 'Activa' : 'Desactivada'}
            </td>
            <td class="py-4">
                <button class="btn-gold"
                onclick="alert('Próxima versión configuración sucursal')">
                Gestionar
                </button>
            </td>
        `;

        table.appendChild(row);
    });
}

/* ================= STRIPE PORTAL ================= */

async function openStripePortal() {

    const user = await requireAuth();
    if (!user) return;

    const res = await fetch("https://hook.us2.make.com/4nwu1igjvf2casgekjsf24lujuse5i5s", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id })
    });

    const data = await res.json();

    if (data.url) {
        window.location.href = data.url;
    }
}

return {
    loadDashboard,
    logout,
    openStripePortal
};

})();
