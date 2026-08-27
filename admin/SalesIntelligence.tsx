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
      // Obtener la sesión actual del usuario autenticado
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('No estás autenticado. Inicia sesión en tu cuenta Master.');
      }
      
      // Llamar a la Edge Function usando tu URL específica
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

      // Escuchar cambios en tiempo real en Supabase hasta que Make termine el proceso
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

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8 font-sans">
      {/* Encabezado */}
      <div>
        <div className="inline-block px-3 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full mb-2">
          Uso Exclusivo Master
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Kaezyn Sales Intelligence™</h1>
        <p className="text-gray-600">Descubre la vulnerabilidad oculta del prospecto antes de hacer la primera llamada.</p>
      </div>

      {/* Formulario */}
      <form onSubmit={handleAnalyze} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Negocio</label>
            <input
              type="text"
              placeholder="Ej. Restaurante El Cardenal"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad / Ubicación</label>
            <input
              type="text"
              placeholder="Ej. CDMX"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-black outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
        >
          {loading ? 'Generando Radiografía...' : 'ANALIZAR NEGOCIO'}
        </button>
      </form>

      {/* Loader de Estado */}
      {loading && (
        <div className="p-8 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300 animate-pulse">
          <p className="text-sm font-semibold text-gray-700">{stepMessage}</p>
          <p className="text-xs text-gray-500 mt-2">Make está procesando la información. No cierres esta ventana.</p>
        </div>
      )}

      {/* RESULTADO: LA RADIOGRAFÍA HOLY SHIT */}
      {prospect && prospect.diagnosis && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden space-y-6 p-6 mt-8">
          
          {/* Header del Diagnóstico */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">{prospect.business_name}</h2>
              <p className="text-sm text-gray-500">{prospect.city}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg font-bold text-sm uppercase ${
              prospect.diagnosis.risk_level === 'CRÍTICO' || prospect.diagnosis.risk_level === 'ALTO'
                ? 'bg-red-100 text-red-700'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              Riesgo Operativo: {prospect.diagnosis.risk_level}
            </div>
          </div>

          {/* Calificación General vs Realidad (El Gancho) */}
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
            <h3 className="font-bold text-red-900 text-lg mb-1">{prospect.diagnosis.headline}</h3>
            <p className="text-sm text-red-800">{prospect.diagnosis.summary}</p>
          </div>

          {/* Patrones Negativos Ocultos */}
          <div>
            <h4 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">
              Patrones de Fricción Frecuentes Detectados por IA
            </h4>
            <div className="grid grid-cols-1 gap-3">
              {prospect.diagnosis.negative_patterns?.map((pat: any, idx: number) => (
                <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-800 text-sm">{pat.pattern}</span>
                    <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">
                      {pat.percentage}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 italic">"{pat.evidence}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* El Script de Ventas para el Vendedor */}
          <div className="bg-gray-900 text-white p-5 rounded-xl mt-6">
            <span className="text-xs font-bold tracking-widest text-gray-400 uppercase block mb-2">
              Script de Apertura (Qué decirle al cliente)
            </span>
            <p className="text-base font-medium leading-relaxed text-yellow-400">
              "{prospect.diagnosis.sales_hook}"
            </p>
          </div>

          {/* El Puente Kaezyn */}
          <div className="border-t pt-4 mt-6">
            <h4 className="font-bold text-gray-900 text-sm mb-2">💡 Cómo posicionar Kaezyn:</h4>
            <p className="text-sm text-gray-600 leading-relaxed bg-blue-50 p-4 rounded-lg border border-blue-100">
              {prospect.diagnosis.kaezyn_opportunity}
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
