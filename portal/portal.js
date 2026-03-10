const Portal = (() => {

    const SUPABASE_URL = "https://douynvwqijrlqzhbllcv.supabase.co";
    const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXludndxaWpybHF6aGJsbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM0MDMsImV4cCI6MjA4NDc2OTQwM30.F_xAB9DUqmcy84I57693q63NY1chlQxPTOK6FtQkAkQ";

    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    /* ================= AUTH ================= */

    async function login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
            document.body.innerHTML = "<div style='color:white; padding:20px;'>No hay sucursales vinculadas a este usuario.</div>";
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
        if(renewalDateEl) renewalDateEl.innerText = `${activeBranches} / ${allowedQuantity} sucursales activas`;

        if (table) {
            table.innerHTML = "";
            branches.forEach(branch => {
                
                // AJUSTE 1: Ahora evaluamos 'client_id' para saber si está configurado
                let isConfigured = false;
                if (branch.client_id && String(branch.client_id).trim() !== "" && String(branch.client_id).toLowerCase() !== "null") {
                    isConfigured = true;
                }

                const row = document.createElement("tr");
                row.className = "border-b border-white/5";
                
                // AJUSTE 3: Pasamos 'branch.branch_number' en lugar del ID largo a la función activateBranch
                row.innerHTML = `
                    <td class="py-4">
                        ${branch.business_name} <span class="text-xs text-gray-500 ml-2">(Sucursal ${branch.branch_number})</span>
                    </td>
                    <td class="py-4 ${isConfigured ? (branch.activo ? 'text-green-400' : 'text-yellow-400') : 'text-gray-400'}">
                        ${!isConfigured ? 'Pendiente de activación' : (branch.activo ? 'Activa' : 'Pausada')}
                    </td>
                    <td class="py-4">
                        ${!isConfigured
                            ? `<button class="bg-yellow-400 text-black px-4 py-1 rounded font-bold text-xs"
                                onclick="Portal.activateBranch('${branch.id}')">Activar</button>`
                            : `<button class="border border-yellow-400 text-yellow-400 px-4 py-1 rounded font-bold text-xs hover:bg-yellow-400 hover:text-black transition"
                                onclick="Portal.manageBranch('${branch.id}')">Gestionar</button>`
                        }
                    </td>
                `;
                table.appendChild(row);
            });
        }
    }

    // AJUSTE 3 (Continuación): Recibimos el número de sucursal y lo inyectamos en la URL
    function activateBranch(branchId) {
        const filloutBaseUrl = "https://forms.fillout.com/t/421DwsCucCus";
        window.open(`${filloutBaseUrl}?branch_id=${branchId}`, '_blank');
    }

    function manageBranch(branchId) {
        // Para gestionar, sí es mejor usar el ID (UUID) único de la base de datos
        window.location.href = `/portal/manage.html?id=${branchId}`;
    }

    /* ================= GESTIÓN DE SUCURSAL ================= */

    async function getBranchDetails(id) {
        const user = await requireAuth();
        if (!user) return null;

        const { data, error } = await supabase
            .from("businesses")
            .select("*")
            .eq("id", id)
            .eq("user_id", user.id) // SEGURIDAD: Solo si le pertenece al usuario
            .single();

        if (error) {
            console.error("Error cargando sucursal:", error);
            return null;
        }
        return data;
    }

    async function updateBranch(id, updates) {
        const user = await requireAuth();
        if (!user) return false;

        const { error } = await supabase
            .from("businesses")
            .update(updates)
            .eq("id", id)
            .eq("user_id", user.id); // SEGURIDAD: Solo si le pertenece al usuario

        if (error) {
            console.error("Error actualizando sucursal:", error);
            return false;
        }
        return true;
    }

    /* ================= STRIPE PORTAL ================= */

    async function openStripePortal() {
        // 1. OBTENEMOS AL USUARIO ACTUAL
        const user = await requireAuth();
        if (!user) return;

        const btn = document.getElementById("btnStripe");
        if(btn) {
            btn.innerText = "Redirigiendo a Stripe...";
            btn.disabled = true;
        }

        // 2. PEGA AQUÍ TU ENLACE UNIVERSAL DE STRIPE
        const stripePortalBaseUrl = "https://billing.stripe.com/p/login/test_cNi14n59bfvs5Vud7BabK00";

        // 3. ARMAMOS LA URL CON EL CORREO PRE-LLENADO
        // Esto le ahorra un paso a tu cliente
        const finalUrl = `${stripePortalBaseUrl}?prefilled_email=${encodeURIComponent(user.email)}`;

        // 4. REDIRIGIMOS
        window.open(finalUrl, '_blank');
        
        // Regresamos el botón a la normalidad por si el usuario regresa atrás
        setTimeout(() => {
            if(btn) {
                btn.innerText = "Administrar Suscripción";
                btn.disabled = false;
            }
        }, 3000);
    }

    return {
        login, 
        requireAuth, 
        loadDashboard, 
        logout,
        activateBranch, 
        manageBranch, 
        openStripePortal, 
        sendResetPassword,
        getBranchDetails,
        updateBranch
    };

})();
