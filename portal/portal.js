const Portal = (() => {

    // Credenciales Sincronizadas
    const SUPABASE_URL = "https://douynvwqijrlqzhbllcv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXludndxaWpybHF6aGJsbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM0MDMsImV4cCI6MjA4NDc2OTQwM30.F_xAB9DUqmcy84I57693q63NY1chlQxPTOK6FtQkAkQ";

    const supabase = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );

    /* ================= AUTH ================= */

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        if (error) throw error;
        return data;
    }

    async function requireAuth() {
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
                
                // AJUSTE AQUÍ: Verificamos si es null O si está vacío ("")
                const isConfigured = branch.business_name !== null && branch.business_name.trim() !== "";

                const row = document.createElement("tr");
                row.className = "border-b border-white/5";
                row.innerHTML = `
                    <td class="py-4">
                        ${isConfigured ? branch.business_name : "Sucursal " + branch.branch_number}
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
                                : `<button class="border border-yellow-400 text-yellow-400 px-4 py-1 rounded font-bold text-xs hover:bg-yellow-400 hover:text-black transition"
                                    onclick="Portal.manageBranch('${branch.id}')">
                                    Gestionar
                                   </button>`
                        }
                    </td>
                `;
                table.appendChild(row);
            });
        }
    }

    // AJUSTE: Ahora abre el formulario de Fillout en una NUEVA pestaña
    function activateBranch(branchId) {
        const filloutBaseUrl = "https://forms.fillout.com/t/421DwsCucCus";
        window.open(`${filloutBaseUrl}?branch_id=${branchId}`, '_blank');
    }

    function manageBranch(branchId) {
        window.location.href = `/portal/manage.html?id=${branchId}`;
    }

    /* ================= STRIPE PORTAL ================= */

    async function openStripePortal(customerId) {
        // Validación de seguridad
        if (!customerId) {
            alert("Error: No se encontró el ID de facturación.");
            return;
        }

        const btn = document.getElementById("btnStripe");
        if(btn) {
            btn.innerText = "Conectando...";
            btn.disabled = true;
        }

        const user = await requireAuth();
        if (!user) return;

        try {
            const res = await fetch("https://hook.us2.make.com/4nwu1igjvf2casgekjsf24lujuse5i5s", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ customer_id: customerId })
            });

            const data = await res.json();
            
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert("Error al obtener la URL del portal de pagos.");
                if(btn) { btn.innerText = "Administrar Suscripción"; btn.disabled = false; }
            }
        } catch (err) {
            console.error(err);
            alert("Hubo un error al intentar abrir Stripe.");
            if(btn) { btn.innerText = "Administrar Suscripción"; btn.disabled = false; }
        }
    }

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
