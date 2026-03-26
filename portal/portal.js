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

        // 1. Obtenemos los datos de facturación de la nueva Vista
        const { data: billingData, error: billingError } = await supabase
            .from("billing_metrics")
            .select("*")
            .eq("user_id", user.id)
            .single(); // Como es por usuario, solo necesitamos un registro

        // 2. Obtenemos las sucursales normales
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

    function renderDashboard(branches, billingData) {
        // Asegúrate de usar fallback por si billingData está vacío al inicio
        const billing = billingData || {};
        window.currentCustomerId = branches[0].stripe_customer_id;

        // Variables de estado asegurando formatos correctos (Números)
        const allowedQuantity = Number(branches[0].allowed_quantity) || 0;
        // Cuenta activos reales, asegurando que si llega como string 'true', lo cuente bien
        const activeCount = branches.filter(b => b.activo === true || String(b.activo).toLowerCase() === 'true').length;
        const subStatus = (branches[0].subscription_status || 'active').toLowerCase();
        const expirationDateStr = branches[0].current_period_end; 

        // Elementos del DOM
        const planNameEl = document.getElementById("planName");
        const renewalDateEl = document.getElementById("renewalDate");
        const dashboardDiv = document.getElementById("dashboard");
        const table = document.getElementById("branchesTable");

        if(planNameEl) planNameEl.innerText = "Plan " + (branches[0].plan || "Pro");
        if(renewalDateEl) renewalDateEl.innerText = `${activeCount} / ${allowedQuantity} sucursales activas`;

        // Función auxiliar para calcular días restantes
        const getDaysLeft = (dateStr) => {
            if (!dateStr) return null;
            const diffTime = new Date(dateStr) - new Date();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return diffDays > 0 ? diffDays : 0;
        };

        const daysLeft = getDaysLeft(expirationDateStr);
        // Formatear la fecha en español para mostrarla al cliente
        const expirationDateFormatted = expirationDateStr ? new Date(expirationDateStr).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }) : '';

        // --- Lógica de Alertas Dinámica ---
        let alertHtml = "";
        
        // 1. Apagón Total (Cancelado y tiempo agotado)
        if (subStatus === 'canceled' && daysLeft === 0) {
            alertHtml = `
            <div class="mb-6 bg-gray-900 border-l-4 border-red-900 p-5 rounded-r-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h3 class="text-white font-bold text-base text-red-500">Acceso Restringido</h3>
                    <p class="text-gray-400 text-sm mt-1">Tu suscripción ha finalizado por completo. Reactiva tu plan para volver a habilitar y gestionar tus sucursales.</p>
                </div>
                <button onclick="Portal.openStripePortal()" class="w-full sm:w-auto bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-500 transition whitespace-nowrap shadow-lg">
                    Reactivar Ahora
                </button>
            </div>`;
        } 
        // 2. Apagón en Progreso (Cancelado pero con días restantes a su favor)
        else if (subStatus === 'canceled' && daysLeft > 0) {
            alertHtml = `
            <div class="mb-6 bg-orange-900/30 border-l-4 border-orange-500 p-5 rounded-r-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div class="flex items-center gap-4">
                    <div class="bg-orange-500/20 text-orange-400 w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold leading-tight shrink-0">
                        <span class="text-lg">${daysLeft}</span>
                        <span class="text-[10px]">días</span>
                    </div>
                    <div>
                        <h3 class="text-orange-400 font-bold text-base">Suscripción cancelada (Período de gracia)</h3>
                        <p class="text-gray-300 text-sm mt-1">Lamentamos que nos dejes. Tu servicio y sucursales seguirán funcionando con normalidad hasta el <b>${expirationDateFormatted}</b>. Después de esta fecha, se pausarán automáticamente.</p>
                    </div>
                </div>
                <button onclick="Portal.openStripePortal()" class="w-full md:w-auto bg-orange-500 text-black px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-orange-400 transition whitespace-nowrap shadow-md">
                    Mantener mi Plan
                </button>
            </div>`;
        } 
        // 3. Alerta Persistente: Límite Excedido
        else if (activeCount > allowedQuantity) {
            alertHtml = `
            <div class="mb-6 bg-red-900/30 border-l-4 border-red-500 p-5 rounded-r-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
                <div class="flex items-start gap-4">
                    <div class="bg-red-500/20 p-2 rounded-full shrink-0 mt-1">
                        <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    </div>
                    <div>
                        <h3 class="text-red-400 font-bold text-base">¡Atención! Límite de sucursales excedido</h3>
                        <p class="text-gray-300 text-sm mt-1">Tu plan permite <b>${allowedQuantity}</b> sucursales, pero tienes <b>${activeCount}</b> activas. Para asegurar el funcionamiento del sistema, por favor pausa las sucursales sobrantes dando clic en "Gestionar".</p>
                    </div>
                </div>
            </div>`;
        }
        
        // ==========================================
        // LÓGICA DE USAGE & AUTO TOP-UP (NIVEL SAAS)
        // ==========================================
        const monthlyLimit = Number(billing.monthly_limit) || 200;
        const usedInteractions = Number(billing.used_interactions) || 0;
        const autoTopup = billing.auto_topup !== false; 
        const topupAmount = Number(billing.topup_amount) || 100;
        
        const usagePercent = Math.min((usedInteractions / monthlyLimit) * 100, 100);
        
        // Colores dinámicos de la barra
        let progressColor = "bg-green-400";
        if (usagePercent >= 75) progressColor = "bg-yellow-400";
        if (usagePercent >= 90) progressColor = "bg-red-500";

        // Mensaje de Upsell Inteligente
        let upsellHtml = "";
        if (usagePercent >= 90) {
            upsellHtml = `
            <div class="mt-4 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-3 flex items-start gap-3">
                <i class="fas fa-rocket text-yellow-400 mt-1"></i>
                <div>
                    <p class="text-xs text-yellow-300 font-bold">¡Estás creciendo rápido!</p>
                    <p class="text-[10px] text-gray-300 mt-0.5">Mejorar a un Plan superior reduce tu costo por interacción. <a href="#" onclick="Portal.openStripePortal()" class="underline font-bold">Ver upgrades</a>.</p>
                </div>
            </div>`;
        }

        const usageWidgetContainer = document.getElementById("usageWidgetContainer");
        if (usageWidgetContainer) {
            usageWidgetContainer.innerHTML = `
                <div class="card p-6 md:p-8 rounded-2xl shadow-2xl relative overflow-hidden">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
                        
                        <div class="lg:col-span-2">
                            <div class="flex justify-between items-end mb-2">
                                <div>
                                    <h3 class="text-lg font-bold text-white mb-1"><i class="fas fa-chart-pie text-yellow-400 mr-2"></i> Consumo de Interacciones</h3>
                                    <p class="text-xs text-gray-400">Ciclo actual (se reinicia el 1er día del mes)</p>
                                </div>
                                <div class="text-right">
                                    <span class="text-2xl font-black text-white">${usedInteractions}</span>
                                    <span class="text-sm text-gray-400 font-medium">/ ${monthlyLimit}</span>
                                </div>
                            </div>
                            
                            <div class="w-full bg-white/5 rounded-full h-4 mb-2 overflow-hidden border border-white/10 shadow-inner">
                                <div class="${progressColor} h-4 rounded-full transition-all duration-1000 ease-out relative" style="width: ${usagePercent}%">
                                    ${usagePercent >= 10 ? `<div class="absolute inset-0 bg-white/20 w-full h-full animate-pulse"></div>` : ''}
                                </div>
                            </div>
                            
                            <p class="text-[11px] text-gray-400 font-medium flex justify-between">
                                <span>0%</span>
                                ${usagePercent >= 90 && !autoTopup ? `<span class="text-red-400 font-bold"><i class="fas fa-exclamation-triangle"></i> Límite próximo. El servicio se pausará.</span>` : `<span>Límite del plan</span>`}
                            </p>

                            ${upsellHtml}
                        </div>

                        <div class="bg-[#0b0f2a] border border-white/10 rounded-xl p-5 shadow-inner flex flex-col justify-center h-full">
                            <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
                                <div>
                                    <h4 class="text-sm font-bold text-white uppercase tracking-wider">Auto-Recarga</h4>
                                    <p class="text-[10px] text-gray-400 mt-0.5 leading-tight">Nunca pierdas una reseña</p>
                                </div>
                                
                                <div class="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in">
                                    <input type="checkbox" name="toggle" id="autoTopupToggle" class="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 border-[#0b0f2a] appearance-none cursor-pointer z-10" ${autoTopup ? 'checked' : ''} onchange="Portal.toggleAutoTopup(this.checked, '${branches[0].id}')"/>
                                    <label for="autoTopupToggle" class="toggle-label block overflow-hidden h-6 rounded-full bg-gray-600 cursor-pointer"></label>
                                </div>
                            </div>

                            <div class="${autoTopup ? 'opacity-100' : 'opacity-40 pointer-events-none'} transition-opacity duration-300">
                                <label class="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2 block">Paquete de expansión:</label>
                                <select id="topupAmountSelect" onchange="Portal.updateTopupAmount(this.value, '${branches[0].id}')" class="w-full bg-white/5 border border-white/20 text-white text-sm rounded-lg focus:ring-yellow-400 focus:border-yellow-400 block p-2.5 outline-none font-bold">
                                    <option value="100" class="text-black" ${topupAmount === 100 ? 'selected' : ''}>+100 interacciones ($690)</option>
                                    <option value="300" class="text-black" ${topupAmount === 300 ? 'selected' : ''}>+300 interacciones ($1,790)</option>
                                    <option value="1000" class="text-black" ${topupAmount === 1000 ? 'selected' : ''}>+1,000 interacciones ($5,900)</option>
                                </select>
                            </div>
                        </div>

                    </div>
                </div>
            `;
        }
        
        // --- Renderizar las Tarjetas (Grid) ---
        if (dashboardDiv) {
            dashboardDiv.innerHTML = `
                ${alertHtml}
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    ${branches.map(branch => {
                        const hasName = branch.business_name && branch.business_name !== "empty" && branch.business_name.trim() !== "";
                        const hasClientId = branch.client_id && String(branch.client_id).trim() !== "" && String(branch.client_id).toLowerCase() !== "null" && branch.client_id !== 'empty';
                        
                        // --- NUEVA LÓGICA DE PRIORIDAD DE ESTADO ---
                        let statusLabel = "";
                        let statusClass = "";

                        if (!hasClientId) {
                            // Si no hay ID, siempre es Pendiente (Amarillo)
                            statusLabel = "Pendiente";
                            statusClass = "bg-yellow-500/20 text-yellow-400";
                        } else {
                            // Si hay ID, mostramos si está Activa o Pausada
                            statusLabel = branch.activo ? "Activa" : "Pausada";
                            statusClass = branch.activo ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400";
                        }
                        
                        // Tienen permiso para editar si tienen cantidad permitida > 0 O si les quedan días de periodo de gracia
                        const canUserEdit = (allowedQuantity > 0 || daysLeft > 0);
                
                        let actionButton = "";
                        if (!canUserEdit) {
                            actionButton = `<span class="text-gray-500 text-[10px] sm:text-xs uppercase font-bold tracking-widest block text-center py-2">Bloqueado</span>`;
                        } else if (!hasClientId) {
                            actionButton = `<button class="w-full sm:w-auto bg-yellow-400 text-black px-4 py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-yellow-300 transition" onclick="Portal.activateBranch('${branch.id}')">Activar</button>`;
                        } else {
                            actionButton = `<button class="w-full sm:w-auto border border-yellow-400 text-yellow-400 px-4 py-2 rounded-lg font-bold text-xs sm:text-sm hover:bg-yellow-400 hover:text-black transition" onclick="Portal.manageBranch('${branch.id}')">Gestionar</button>`;
                        }

                        // Estructura responsiva para Móvil y Desktop
                        return `
                            <div class="bg-white/5 border border-white/10 p-5 sm:p-6 rounded-2xl relative flex flex-col h-full overflow-hidden">
                                <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                                    <div class="flex-1 min-w-0 w-full">
                                        <span class="text-[10px] sm:text-xs font-bold tracking-widest text-yellow-400 uppercase block mb-1">Sucursal ${branch.branch_number}</span>
                                        <h3 class="text-base sm:text-lg font-bold text-white truncate w-full" title="${hasName ? branch.business_name : 'Pendiente de Activación'}">${hasName ? branch.business_name : "Pendiente de Activación"}</h3>
                                    </div>
                                    <span class="px-2 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider self-start shrink-0 ${statusClass}">
                                        ${statusLabel}
                                    </span>
                                </div>
                                <div class="mt-auto pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <span class="text-xs text-gray-400 truncate w-full sm:w-auto">ID: ${hasClientId ? branch.client_id : '---'}</span>
                                    <div class="w-full sm:w-auto">
                                        ${actionButton}
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        // --- Renderizar la Tabla de Sucursales ---
        if (table) {
            table.innerHTML = "";
            branches.forEach(branch => {
                
                const hasName = branch.business_name && branch.business_name !== "empty" && branch.business_name.trim() !== "";
                const hasClientId = branch.client_id && String(branch.client_id).trim() !== "" && String(branch.client_id).toLowerCase() !== "null" && branch.client_id !== 'empty';
                
                // Tienen permiso para editar si tienen cantidad permitida > 0 O si les quedan días de periodo de gracia
                const canUserEdit = (allowedQuantity > 0 || daysLeft > 0);

                const row = document.createElement("tr");
                row.className = "border-b border-white/5 hover:bg-white/5 transition-colors";
                
                let actionButtonHtml = "";
                if (!canUserEdit) {
                    actionButtonHtml = `<span class="text-gray-500 text-[10px] uppercase font-bold tracking-widest">Bloqueado</span>`;
                } else if (!hasClientId) {
                    actionButtonHtml = `<button class="bg-yellow-400 text-black px-4 py-1.5 rounded font-bold text-xs whitespace-nowrap" onclick="Portal.activateBranch('${branch.id}')">Activar</button>`;
                } else {
                    actionButtonHtml = `<button class="border border-yellow-400 text-yellow-400 px-4 py-1.5 rounded font-bold text-xs hover:bg-yellow-400 hover:text-black transition whitespace-nowrap" onclick="Portal.manageBranch('${branch.id}')">Gestionar</button>`;
                }

                row.innerHTML = `
                    <td class="py-4 px-2 min-w-[200px]">
                        <span class="block text-white font-medium">${hasName ? branch.business_name : 'Pendiente de Activación'}</span>
                        <span class="text-xs text-gray-500">Sucursal ${branch.branch_number}</span>
                    </td>
                    <td class="py-4 px-2 text-sm text-gray-300 min-w-[150px]">
                        ${hasClientId ? branch.client_id : '---'}
                    </td>
                    <td class="py-4 px-2 font-medium min-w-[100px] ${!hasClientId ? 'text-yellow-400' : (branch.activo ? 'text-green-400' : 'text-gray-400')}">
                        ${!hasClientId ? 'Pendiente' : (branch.activo ? 'Activa' : 'Pausada')}
                    </td>
                    <td class="py-4 px-2 text-right">
                        ${actionButtonHtml}
                    </td>
                `;
                table.appendChild(row);
            });
        }
    }

    function activateBranch(branchId) {
        // Usamos tu nuevo motor dinámico en lugar del link directo de Fillout
        const dynamicUrl = "https://go.kaezyn.com/activar-sucursal";
        window.open(`${dynamicUrl}?branch_id=${branchId}`, '_blank');
    }

    function manageBranch(branchId) {
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
            .eq("user_id", user.id) 
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
            .eq("user_id", user.id); 

        if (error) {
            console.error("Error actualizando sucursal:", error);
            return false;
        }
        return true;
    }

    /* ================= STRIPE PORTAL ================= */

    async function openStripePortal() {
        const user = await requireAuth();
        if (!user) return;

        const btn = document.getElementById("btnStripe");
        if(btn) {
            btn.innerText = "Redirigiendo a Stripe...";
            btn.disabled = true;
        }

        const stripePortalBaseUrl = "https://billing.stripe.com/p/login/test_cNi14n59bfvs5Vud7BabK00";
        const finalUrl = `${stripePortalBaseUrl}?prefilled_email=${encodeURIComponent(user.email)}`;

        window.open(finalUrl, '_blank');
        
        setTimeout(() => {
            if(btn) {
                btn.innerText = "Administrar Suscripción";
                btn.disabled = false;
            }
        }, 3000);
    }

    async function toggleAutoTopup(isAuto, branchId) {
        // En un esquema real, actualizarías el registro maestro del cliente
        await updateBranch(branchId, { auto_topup: isAuto });
        // Mostrar notificación visual opcional
        console.log("Auto Top-up actualizado a:", isAuto);
    }

    async function updateTopupAmount(amount, branchId) {
        await updateBranch(branchId, { topup_amount: Number(amount) });
        console.log("Paquete de expansión actualizado a:", amount);
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
        updateBranch,
        toggleAutoTopup,
        updateTopupAmount
    };

})();
