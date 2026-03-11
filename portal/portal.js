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
            document.body.innerHTML = "<div style='color:white; padding:20px;'>Error cargando datos.</div>";
            return;
        }

        if (!branches || branches.length === 0) {
            document.body.innerHTML = "<div style='color:white; padding:20px;'>No hay sucursales vinculadas.</div>";
            return;
        }

        renderDashboard(branches);
    }

    function renderDashboard(branches) {
        window.currentCustomerId = branches[0].stripe_customer_id;
        const dashboardDiv = document.getElementById("dashboard");
        const planNameEl = document.getElementById("planName");
        const renewalDateEl = document.getElementById("renewalDate");

        // 1. Cálculos de Estado Global
        const allowedQuantity = branches[0].allowed_quantity || 0;
        const activeBranches = branches.filter(b => b.activo === true).length;
        const subStatus = branches[0].subscription_status || 'active';
        const expirationDateStr = branches[0].current_period_end; // Usando tu columna existente

        const getDaysLeft = (dateStr) => {
            if (!dateStr) return null;
            const diffTime = new Date(dateStr) - new Date();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        const daysLeft = getDaysLeft(expirationDateStr);
        const isCanceledTotal = (subStatus === 'canceled' || allowedQuantity === 0);
        const isPendingClosure = (subStatus !== 'active' && daysLeft !== null && daysLeft > 0);

        // Actualizar encabezados
        if(planNameEl) planNameEl.innerText = "Plan " + (branches[0].plan || "Pro");
        if(renewalDateEl) renewalDateEl.innerText = `${activeBranches} / ${allowedQuantity} sucursales activas`;

        // 2. Lógica de Alertas
        let alertHtml = "";
        const stripeUrl = "https://billing.stripe.com/p/login/test_cNi14n59bfvs5Vud7BabK00";

        if (isCanceledTotal) {
            alertHtml = `
            <div class="mb-6 bg-gray-900 border border-red-900/50 p-5 rounded-xl flex items-center justify-between">
                <div>
                    <h3 class="text-red-400 font-bold text-sm">Acceso Restringido</h3>
                    <p class="text-gray-400 text-xs mt-1">Tu suscripción ha finalizado. Reactiva para gestionar tus sucursales.</p>
                </div>
                <button onclick="Portal.openStripePortal()" class="bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-600 transition">Reactivar Ahora</button>
            </div>`;
        } else if (isPendingClosure && daysLeft <= 30) {
            alertHtml = `
            <div class="mb-6 bg-orange-500/10 border border-orange-500/50 p-5 rounded-xl flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <div class="bg-orange-500 text-black w-10 h-10 rounded-full flex items-center justify-center font-bold">${daysLeft}</div>
                    <div>
                        <h3 class="text-orange-400 font-bold text-sm">Cuenta en fase de cierre</h3>
                        <p class="text-gray-300 text-xs mt-1">Te quedan ${daysLeft} días de acceso. Luego, las sucursales se pausarán.</p>
                    </div>
                </div>
                <button onclick="Portal.openStripePortal()" class="bg-orange-500 text-black px-4 py-2 rounded-lg text-xs font-bold hover:bg-orange-400 transition">Mantener Plan</button>
            </div>`;
        } else if (activeBranches > allowedQuantity) {
            alertHtml = `
            <div class="mb-6 bg-red-500/10 border border-red-500/50 p-4 rounded-xl flex items-center justify-between">
                <div>
                    <h3 class="text-red-400 font-bold text-sm">Límite excedido</h3>
                    <p class="text-gray-300 text-xs mt-1">Tienes ${activeBranches} sucursales activas pero tu plan solo permite ${allowedQuantity}. Pausa una sucursal.</p>
                </div>
            </div>`;
        }

        // 3. Renderizar Grid de Sucursales
        if (dashboardDiv) {
            dashboardDiv.innerHTML = `
                ${alertHtml}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${branches.map(branch => {
                        const isConfigured = branch.business_name && branch.business_name !== "empty";
                        const canUserEdit = (allowedQuantity > 0 && (subStatus === 'active' || (daysLeft !== null && daysLeft > 0)));
                        
                        let actionButton = "";
                        if (!canUserEdit) {
                            actionButton = `<span class="text-gray-500 text-xs italic">Solo lectura</span>`;
                        } else if (!isConfigured) {
                            actionButton = `<button class="bg-yellow-400 text-black px-4 py-1 rounded font-bold text-xs" onclick="Portal.activateBranch('${branch.id}')">Activar</button>`;
                        } else {
                            actionButton = `<button class="border border-yellow-400 text-yellow-400 px-4 py-1 rounded font-bold text-xs hover:bg-yellow-400 hover:text-black transition" onclick="Portal.manageBranch('${branch.id}')">Gestionar</button>`;
                        }

                        return `
                            <div class="bg-white/5 border border-white/10 p-6 rounded-2xl relative">
                                <div class="flex justify-between items-start mb-4">
                                    <div>
                                        <span class="text-xs font-bold tracking-widest text-yellow-400 uppercase">Sucursal ${branch.branch_number}</span>
                                        <h3 class="text-lg font-bold text-white mt-1">${isConfigured ? branch.business_name : "Pendiente de Activación"}</h3>
                                    </div>
                                    <span class="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${branch.activo ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                                        ${branch.activo ? 'Activa' : 'Pausada'}
                                    </span>
                                </div>
                                <div class="flex justify-between items-center mt-6">
                                    <span class="text-xs text-gray-400">ID: ${branch.client_id !== 'empty' ? branch.client_id : '---'}</span>
                                    ${actionButton}
                                </div>
                            </div>`;
                    }).join('')}
                </div>
            `;
        }
    }

    function activateBranch(branchId) {
        const filloutBaseUrl = "https://forms.fillout.com/t/421DwsCucCus";
        window.open(`${filloutBaseUrl}?branch_id=${branchId}`, '_blank');
    }

    function manageBranch(branchId) {
        window.location.href = `/portal/manage.html?id=${branchId}`;
    }

    async function getBranchDetails(id) {
        const user = await requireAuth();
        if (!user) return null;
        const { data, error } = await supabase.from("businesses").select("*").eq("id", id).eq("user_id", user.id).single();
        if (error) return null;
        return data;
    }

    async function updateBranch(id, updates) {
        const user = await requireAuth();
        if (!user) return false;
        const { error } = await supabase.from("businesses").update(updates).eq("id", id).eq("user_id", user.id);
        return !error;
    }

    async function openStripePortal() {
        const user = await requireAuth();
        if (!user) return;
        const stripePortalBaseUrl = "https://billing.stripe.com/p/login/test_cNi14n59bfvs5Vud7BabK00";
        const finalUrl = `${stripePortalBaseUrl}?prefilled_email=${encodeURIComponent(user.email)}`;
        window.open(finalUrl, '_blank');
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
