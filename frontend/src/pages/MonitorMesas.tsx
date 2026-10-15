import { useEffect, useState } from 'react';
import api from '../api/axios';
import { Utensils, ArrowLeft, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569',
  free: '#16a34a',
  occupied: '#dc2626',
  requesting: '#ea580c'
};

export default function MonitorMesas() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [sesiones, setSesiones] = useState<any[]>([]);
  const [selectedMesa, setSelectedMesa] = useState<any>(null);
  const navigate = useNavigate();

  const fetchEstado = async () => {
    try {
      const resMesas = await api.get('/mesas');
      const resCuentas = await api.get('/caja/cuentas'); // This gives active sessions
      setMesas(resMesas.data);
      setSesiones(resCuentas.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchEstado();
    const interval = setInterval(fetchEstado, 5000); // refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const openModal = (mesa: any) => {
    const sesion = sesiones.find(s => s.mesa_id === mesa.id);
    setSelectedMesa({ ...mesa, sesion });
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.navy }}>
            <ArrowLeft size={18} />
          </button>
          <Utensils size={24} color={COLORS.navy} strokeWidth={1.5} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Monitor de Mesas en Tiempo Real</h2>
        </div>
      </header>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '2rem' }}>
          {mesas.map(mesa => {
            const sesion = sesiones.find(s => s.mesa_id === mesa.id);
            // Si la mesa no tiene sesión en cuentas, chequear estado de la mesa real. 
            // Podría ser que está pidiendo cuenta, o libre.
            const isOcupada = mesa.estado !== 'disponible';
            const isPidiendoCuenta = sesion?.estado_sesion === 'pidiendo_cuenta';
            const color = isPidiendoCuenta ? COLORS.requesting : (isOcupada ? COLORS.occupied : COLORS.free);
            
            return (
              <div 
                key={mesa.id} 
                onClick={() => openModal(mesa)}
                style={{ 
                  backgroundColor: COLORS.white, border: `2px solid ${color}`, borderRadius: '12px', padding: '1.5rem', 
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                  cursor: 'pointer', transition: 'transform 0.2s',
                  boxShadow: isOcupada ? '0 4px 10px rgba(220, 38, 38, 0.1)' : '0 4px 10px rgba(22, 163, 74, 0.1)'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'none'}
              >
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', backgroundColor: color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: COLORS.white }}>
                  <Users size={30} />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: COLORS.navy }}>Mesa {mesa.numero_mesa}</h3>
                <span style={{ fontSize: '0.85rem', color: color, fontWeight: '600', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                  {isPidiendoCuenta ? 'Pidiendo Cuenta' : (isOcupada ? 'Ocupada' : 'Libre')}
                </span>
                {sesion && <span style={{ fontSize: '0.85rem', color: COLORS.textMuted, marginTop: '0.2rem' }}>Acumulado: ${Number(sesion.total).toFixed(2)}</span>}
              </div>
            );
          })}
        </div>
      </div>

      {selectedMesa && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 40, 85, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', border: `1px solid ${COLORS.navy}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, color: COLORS.navy, fontSize: '1.3rem', fontWeight: '600' }}>Detalle - Mesa {selectedMesa.numero_mesa}</h2>
              {selectedMesa.sesion?.cliente_nombre && <p style={{margin: 0, fontSize: '1rem', color: COLORS.textMuted}}>Cliente: {selectedMesa.sesion.cliente_nombre}</p>}
              <span style={{ padding: '0.3rem 0.8rem', borderRadius: '4px', backgroundColor: selectedMesa.estado === 'disponible' ? COLORS.free : COLORS.occupied, color: COLORS.white, fontSize: '0.85rem', fontWeight: 'bold' }}>
                {selectedMesa.estado.toUpperCase()}
              </span>
            </div>
            
            {selectedMesa.sesion ? (
              <div>
                <p style={{ margin: '0 0 0.5rem 0', color: COLORS.textMuted }}>Total consumido: <strong style={{ color: COLORS.navy, fontSize: '1.2rem' }}>${Number(selectedMesa.sesion.total).toFixed(2)}</strong></p>
                <p style={{ margin: '0 0 1.5rem 0', color: COLORS.textMuted, fontSize: '0.9rem' }}>Abierta a las: {new Date(selectedMesa.sesion.abierta_en).toLocaleTimeString()}</p>
                
                <div style={{ backgroundColor: '#f8fafc', padding: '1rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, marginBottom: '1.5rem' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.textMuted }}>* Los pedidos se gestionan desde el módulo de Cocina, y el cobro desde el Punto de Venta.</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '2rem 0', textAlign: 'center', color: COLORS.textMuted }}>
                Mesa disponible. No hay clientes activos ni cuentas por cobrar.
              </div>
            )}

            <button onClick={() => setSelectedMesa(null)} style={{ width: '100%', padding: '0.8rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  );
}
