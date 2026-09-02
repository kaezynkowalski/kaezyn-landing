import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// 1. Inicializar cliente de Supabase (React / Vite)
const SUPABASE_URL = 'https://douynvwqijrlqzhbllcv.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdXludndxaWpybHF6aGJsbGN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkxOTM0MDMsImV4cCI6MjA4NDc2OTQwM30.F_xAB9DUqmcy84I57693q63NY1chlQxPTOK6FtQkAkQ'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function SalesIntelligence() {
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const [stepMessage, setStepMessage] = useState('');
  const [prospect, setProspect] = useState<any>(null);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName) return;

    setLoading(true);
    setProspect(null);
    setStepMessage('Iniciando auditoría inteligente...');

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No estás autenticado. Inicia sesión en tu cuenta Master.');
      }
      
      const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-prospect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ business_name: businessName, city })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar análisis');

      setStepMessage('Scrapeando reseñas y analizando patrones con IA (aprox 30 seg)...');
      
      const channel = supabase
        .channel(`prospect-${data.prospect_id}`)
        .on(
          'postgres_changes',
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'sales_prospects', 
            filter: `id=eq.${data.prospect_id}` 
          },
          (payload) => {
            if (payload.new.status === 'completed') {
              setProspect(payload.new);
              setLoading(false);
              supabase.removeChannel(channel);
            }
          }
        )
        .subscribe();

    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setLoading(false);
    }
  };

  // Función para cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/'; // Redirige al login (ajusta la ruta si es necesario)
  };

  return (
    <div 
      className="min-h-screen bg-[#0b0f2a] text-[#EAEAEA] pb-12" 
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* HEADER SUPERIOR FULL-WIDTH */}
      <div className="px-6 md:px-8 py-5 border-b border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0b0f2a]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Asegúrate de que la ruta de la imagen sea la correcta en tu proyecto React */}
          <img src="/assets/KAEZYN LOGO.png" className="h-8 md:h-10" alt="Kaezyn Logo" />
          <div className="px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] md:text-xs font-semibold rounded-full uppercase tracking-wider hidden sm:block">
            Uso Exclusivo Master
          </div>
        </div>

        <div className="flex items-center">
          <button 
            onClick={handleLogout} 
            className="text-xs text-gray-400 hover:text-white transition-colors uppercase tracking-widest flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/5"
          >
            <i className="fas fa-sign-out-alt"></i> Cerrar sesión
          </button>
        </div>
      </div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="max-w-4xl mx-auto p-6 space-y-10 mt-6">
        
        {/* Título de Sección */}
        <div className="text-center space-y-3">
          <div className="inline-block sm:hidden px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold rounded-full uppercase tracking-wider mb-2">
            Uso Exclusivo Master
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-wide">
            Kaezyn <span className="text-[#FFD700]">Sales Intelligence™</span>
          </h1>
          <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto">
            Descubre la vulnerabilidad oculta del prospecto antes de hacer la primera llamada. Analiza sus reseñas y obtén un ángulo de venta imbatible.
          </p>
        </div>

        {/* Formulario Estilo Glassmorphism */}
        <form 
          onSubmit={handleAnalyze} 
          className="bg-white/5 border border-white/10 backdrop-blur-xl p-6 md:p-8 rounded-2xl shadow-2xl space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300 tracking-wide">
                Nombre del Negocio
              </label>
              <input
                type="text"
                placeholder="Ej. Restaurante El Cardenal"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full bg-[#0b0f2a]/50 border border-white/20 text-white placeholder-gray-500 rounded-xl p-3.5 text-sm focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] outline-none transition-all"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-300 tracking-wide">
                Ciudad / Ubicación
              </label>
              <input
                type="text"
                placeholder="Ej. CDMX"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-[#0b0f2a]/50 border border-white/20 text-white placeholder-gray-500 rounded-xl p-3.5 text-sm focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] outline-none transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 rounded-xl font-bold text-sm uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2
              ${loading 
                ? 'bg-white/10 text-gray-400 cursor-not-allowed border border-white/20' 
                : 'bg-gradient-to-r from-[#FFD700] to-[#d4af37] text-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(255,215,0,0.4)] hover:scale-[1.01]'
              }`}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin"></i> Generando Radiografía...
              </>
            ) : (
              <>
                <i className="fas fa-search"></i> ANALIZAR NEGOCIO
              </>
            )}
          </button>
        </form>

        {/* Loader de Estado (Estilo Scanning) */}
        {loading && (
          <div className="p-8 text-center bg-[#4d2a7a]/10 rounded-2xl border border-[#4d2a7a]/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent animate-pulse"></div>
            <i className="fas fa-robot text-3xl text-[#FFD700] mb-4 animate-bounce"></i>
            <p className="text-sm font-semibold text-white tracking-wide">{stepMessage}</p>
            <p className="text-xs text-gray-400 mt-2">La IA está extrayendo y procesando patrones de fricción. No cierres la ventana.</p>
          </div>
        )}

        {/* RESULTADO: LA RADIOGRAFÍA (Rediseñada a Dark Mode) */}
        {prospect && prospect.diagnosis && (
          <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden mt-8 animate-fade-in-up">
            
            {/* Header del Diagnóstico */}
            <div className="p-6 md:p-8 border-b border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/[0.02]">
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-white">{prospect.business_name}</h2>
                <p className="text-sm text-gray-400 flex items-center gap-2 mt-1">
                  <i className="fas fa-map-marker-alt text-[#FFD700]"></i> {prospect.city}
                </p>
              </div>
              <div className={`px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider border shadow-inner flex items-center gap-2 ${
                prospect.diagnosis.risk_level === 'CRÍTICO' || prospect.diagnosis.risk_level === 'ALTO'
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
              }`}>
                <i className="fas fa-exclamation-triangle"></i>
                Riesgo Operativo: {prospect.diagnosis.risk_level}
              </div>
            </div>

            <div className="p-6 md:p-8 space-y-8">
              {/* Calificación General vs Realidad (El Gancho) */}
              <div className="bg-red-500/10 border-l-4 border-red-500 p-5 rounded-r-xl">
                <h3 className="font-bold text-red-400 text-lg md:text-xl mb-2 flex items-center gap-2">
                  <i className="fas fa-fire-alt"></i> {prospect.diagnosis.headline}
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed">{prospect.diagnosis.summary}</p>
              </div>

              {/* Patrones Negativos Ocultos */}
              <div>
                <h4 className="font-bold text-[#EAEAEA] mb-4 text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-chart-line text-[#4d2a7a]"></i> Patrones de Fricción Detectados
                </h4>
                <div className="grid grid-cols-1 gap-4">
                  {prospect.diagnosis.negative_patterns?.map((pat: any, idx: number) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-5 rounded-xl hover:bg-white/10 transition-colors duration-300">
                      <div className="flex justify-between items-start md:items-center mb-3 flex-col md:flex-row gap-2">
                        <span className="font-semibold text-white text-sm">{pat.pattern}</span>
                        <span className="text-xs font-bold bg-red-500/20 border border-red-500/30 text-red-400 px-3 py-1 rounded-full whitespace-nowrap">
                          {pat.percentage}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 italic bg-[#0b0f2a]/50 p-3 rounded-lg border border-white/5">
                        "{pat.evidence}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* El Script de Ventas para el Vendedor */}
              <div className="bg-[#0b0f2a] border border-[#FFD700]/30 p-6 rounded-xl relative overflow-hidden shadow-lg shadow-[#FFD700]/5">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFD700]/5 rounded-full blur-3xl"></div>
                <span className="text-xs font-bold tracking-widest text-[#FFD700] uppercase flex items-center gap-2 mb-3">
                  <i className="fas fa-comment-dots"></i> Script de Apertura (Icebreaker)
                </span>
                <p className="text-base md:text-lg font-medium leading-relaxed text-white relative z-10 italic">
                  "{prospect.diagnosis.sales_hook}"
                </p>
              </div>

              {/* El Puente Kaezyn */}
              <div className="border-t border-white/10 pt-6">
                <h4 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                  <i className="fas fa-lightbulb text-[#FFD700]"></i> Cómo posicionar Kaezyn:
                </h4>
                <div className="bg-[#4d2a7a]/20 border border-[#4d2a7a]/50 p-5 rounded-xl">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {prospect.diagnosis.kaezyn_opportunity}
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
      
      <style>{`
        /* Animación suave para la aparición de resultados */
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
