const Portal = (() => {

    // Credenciales Sincronizadas
    const SUPABASE_URL = "https://douynvwqijrlqzhbllcv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXludndxaWpybHF6aGJsbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM0MDMsImV4cCI6MjA4NDc2OTQwM30.F_xAB9DUqmcy84I57693q63NY1chlQxPTOK6FtQkAkQ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    /* ================= AUTH ================= */

    // Función para el Login (Nueva/Ajustada)
    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    async function requireAuth() {
        // Usamos getSession para mayor rapidez en la verificación de ruta
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            window.location.href = "/portal/login.html";
            return null;
        }
        return session.user;
    }

    async function logout() {
        await supabase.auth.signOut();
        window.location.href = "/portal/login.html";
    }

    async function sendResetPassword(email) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: 'https://kaezyn.com/portal/reset-password.html',
        });
        if (error) throw error;
        return true;
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
            console.error("Error Supabase:", error);
            document.body.innerHTML = "<div style='color:white; padding:20px;'>Error cargando datos de sucursales.</div>";
            return;
        }

        if (!branches || branches.length === 0) {
            document.body.innerHTML = "<div style='color:white; padding:20px;'>No hay sucursales activas vinculadas a este usuario.</div>";
            return;
        }

        renderDashboard(branches);
    }

    function renderDashboard(branches) {
        window.currentCustomerId = branches[0].stripe_customer_id;

        const allowedQuantity = branches[0].allowed_quantity || 1;
        const activeBranches = branches.filter(b => b.activo === true).length;

        // Asegúrate de que estos IDs existan en tu dashboard.html
        const planNameEl = document.getElementById("planName");
        const renewalDateEl = document.getElementById("renewalDate");
        const table = document.getElementById("branchesTable");

        if(planNameEl) planNameEl.innerText = "Plan " + (branches[0].plan || "Pro");
        
        if(renewalDateEl) {
            renewalDateEl.innerText = `${activeBranches} / ${allowedQuantity} sucursales activas`;
        }

        if (table) {
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
                                ? `<button class="bg-yellow-400 text-black px-4 py-1 rounded font-bold text-xs"
                                    onclick="Portal.activateBranch('${branch.id}')">
                                    Activar
                                   </button>`
                                : `<button class="border border-yellow-400 text-yellow-400 px-4 py-1 rounded font-bold text-xs"
                                    onclick="Portal.manageBranch('${branch.id}')">
                                    Gestionar
                                   </button>`
                        }
                    </td>
                `;
                table.appendChild(row);
            });
        }

        configureAddBranchButton(activeBranches, allowedQuantity);
    }

    function activateBranch(branchId) {
        const filloutBaseUrl = "https://forms.fillout.com/t/421DwsCucCus";
        window.location.href = `${filloutBaseUrl}?branch_id=${branchId}`;
    }

    // Nota: Agregué esta función que faltaba para evitar errores al hacer clic
    function manageBranch(branchId) {
        // Redirigir a la gestión de la sucursal específica
        window.location.href = `/portal/manage.html?id=${branchId}`;
    }
        
    function configureAddBranchButton(activeBranches, allowedQuantity) {
        const button = document.getElementById("addBranchBtn"); // Mejor usar ID
        if (!button) return;

        if (activeBranches >= allowedQuantity) {
            button.innerText = "Actualizar Plan";
            button.onclick = () => Portal.openStripePortal(window.currentCustomerId);
        } else {
            button.innerText = "+ Activar Sucursal";
            button.onclick = () => alert("Selecciona una sucursal 'Pendiente' en la tabla para activarla.");
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

    // Exportar las funciones para que sean accesibles vía Portal.XXXX
    return {
        login,
        requireAuth,
        loadDashboard,
        logout,
        activateBranch,
        manageBranch,
        openStripePortal,
        sendResetPassword
    };

})();
