import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { LayoutDashboard, ChefHat, Banknote, Smartphone, LogOut, PackageSearch, BarChart3, Utensils, BookOpen } from 'lucide-react';
import api from '../api/axios';

// Paleta Minimalista: Blanco y Azul Navy
const COLORS = {
  navy: '#002855',
  navyLight: '#003a7a',
  white: '#ffffff',
  offWhite: '#f8fafc',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Dashboard({ title }: { title: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [llamadasCuenta, setLlamadasCuenta] = useState<any[]>([]);

  useEffect(() => {
    if (user?.rol !== 'Administrador' && user?.rol !== 'Mesero') return;
    const fetchLlamadasCuenta = async () => {
      try {
        const response = await api.get('/caja/cuentas');
        setLlamadasCuenta(response.data.filter((cuenta: any) => cuenta.estado_sesion === 'pidiendo_cuenta'));
      } catch (error) {
        console.error('Error al consultar solicitudes de cuenta', error);
      }
    };
    fetchLlamadasCuenta();
    const interval = setInterval(fetchLlamadasCuenta, 5000);
    return () => clearInterval(interval);
  }, [user?.rol]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const cardStyle = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2.5rem 1.5rem',
    backgroundColor: COLORS.white,
    color: COLORS.navy,
    textDecoration: 'none',
    borderRadius: '8px',
    textAlign: 'center' as const,
    fontWeight: '500',
    fontSize: '1.1rem',
    border: `1px solid ${COLORS.border}`,
    transition: 'all 0.2s ease',
    minHeight: '180px'
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', padding: '2rem', color: COLORS.navy, fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: '600', color: COLORS.navy }}>{title}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '1rem', color: COLORS.navy }}>{user?.nombre} <span style={{ color: COLORS.textMuted }}>({user?.rol})</span></span>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', cursor: 'pointer', background: 'transparent', color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', fontWeight: '500', fontSize: '0.9rem', transition: 'all 0.2s' }}>
              <LogOut size={16} />
              Salir
            </button>
          </div>
        </header>

        <main>
          {llamadasCuenta.length > 0 && (
            <Link to="/monitor" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1.25rem 1.5rem', marginBottom: '1.5rem', backgroundColor: '#fff7ed', color: '#7c2d12', border: '1px solid #fed7aa', borderLeft: '5px solid #ea580c', borderRadius: '8px', textDecoration: 'none' }}>
              <div>
                <strong style={{ display: 'block', fontSize: '1rem' }}>{llamadasCuenta.length} {llamadasCuenta.length === 1 ? 'mesa solicita' : 'mesas solicitan'} la cuenta</strong>
                <span style={{ fontSize: '0.9rem' }}>{llamadasCuenta.map(cuenta => `Mesa ${cuenta.numero_mesa}`).join(' · ')}</span>
              </div>
              <span style={{ fontWeight: '600', whiteSpace: 'nowrap' }}>Ver mesas</span>
            </Link>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            
            {(user?.rol === 'Administrador') && (
              <Link to="/admin/mesas" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <LayoutDashboard size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Gestión de Mesas y QR
              </Link>
            )}

            {(user?.rol === 'Administrador' || user?.rol === 'Cocina') && (
              <Link to="/cocina" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <ChefHat size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Monitor de Cocina
              </Link>
            )}

            {(user?.rol === 'Administrador' || user?.rol === 'Cajero' || user?.rol === 'Mesero') && (
              <Link to="/caja" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <Banknote size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Punto de Venta / Caja
              </Link>
            )}

            {(user?.rol === 'Administrador') && (
              <Link to="/menu" target="_blank" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <Smartphone size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Vista Menú Cliente
              </Link>
            )}

            {(user?.rol === 'Administrador' || user?.rol === 'Mesero') && (
              <Link to="/monitor" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <Utensils size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Monitor de Mesas
              </Link>
            )}

            {(user?.rol === 'Administrador') && (
              <Link to="/admin/inventario" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <PackageSearch size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Control de Inventario
              </Link>
            )}

            {(user?.rol === 'Administrador') && (
              <Link to="/admin/menu" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <BookOpen size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Gestión del Menú
              </Link>
            )}

            {(user?.rol === 'Administrador') && (
              <Link to="/admin/estadisticas" style={cardStyle} onMouseOver={e => { e.currentTarget.style.backgroundColor = COLORS.navy; e.currentTarget.style.color = COLORS.white; }} onMouseOut={e => { e.currentTarget.style.backgroundColor = COLORS.white; e.currentTarget.style.color = COLORS.navy; }}>
                <BarChart3 size={40} strokeWidth={1.5} style={{ marginBottom: '1rem' }} />
                Estadísticas de Ventas
              </Link>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
