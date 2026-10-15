import { useEffect, useState } from 'react';
import api from '../../api/axios';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Estadisticas() {
  const [periodo, setPeriodo] = useState('dia'); // dia, semana, mes
  const [datos, setDatos] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get(`/estadisticas?periodo=${periodo}`).then(res => setDatos(res.data)).catch(console.error);
  }, [periodo]);

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.navy }}>
            <ArrowLeft size={18} />
          </button>
          <BarChart3 size={24} color={COLORS.navy} strokeWidth={1.5} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Estadísticas y Ventas</h2>
        </div>
      </header>

      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: '1.5rem', borderRadius: '8px', minWidth: '250px' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: COLORS.textMuted }}>Ingresos Totales</h3>
            <p style={{ margin: 0, fontSize: '2.5rem', fontWeight: '600', color: COLORS.navy }}>
              ${(datos?.ingresos_totales || 0).toFixed(2)}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', backgroundColor: '#f8fafc', padding: '0.4rem', borderRadius: '8px', border: `1px solid ${COLORS.border}` }}>
            {['dia', 'semana', 'mes'].map(p => (
              <button 
                key={p}
                onClick={() => setPeriodo(p)}
                style={{
                  padding: '0.6rem 1.2rem', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', textTransform: 'capitalize',
                  backgroundColor: periodo === p ? COLORS.navy : 'transparent',
                  color: periodo === p ? COLORS.white : COLORS.textMuted
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: '2rem', borderRadius: '8px' }}>
          <h3 style={{ margin: '0 0 2rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Productos Más Vendidos</h3>
          {datos?.productos_mas_vendidos?.length > 0 ? (
            <div style={{ height: '400px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={datos.productos_mas_vendidos}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.border} />
                  <XAxis dataKey="nombre" axisLine={false} tickLine={false} tick={{fill: COLORS.textMuted, fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: COLORS.textMuted, fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: `1px solid ${COLORS.border}`, color: COLORS.navy}} />
                  <Bar dataKey="cantidad" fill={COLORS.navy} radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p style={{ color: COLORS.textMuted, textAlign: 'center', padding: '2rem' }}>No hay datos suficientes para este período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
