import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ChefHat, CheckCircle2, Clock, AlertCircle, LogOut, ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Cocina() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/pedidos').then(res => {
      setPedidos(res.data.filter((p: any) => p.estado === 'pendiente' || p.estado === 'en preparacion'));
    });

    const socket: Socket = io(new URL(api.defaults.baseURL as string).origin);
    socket.emit('join_cocina');

    socket.on('nuevo_pedido', (pedido) => {
      setPedidos(prev => [...prev, pedido]);
    });

    socket.on('estado_pedido_actualizado', ({ id, estado }) => {
      if (estado === 'listo' || estado === 'entregado' || estado === 'pagado') {
        setPedidos(prev => prev.filter(p => p.id !== id));
      } else {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado } : p));
      }
    });

    socket.on('sesion_pagada', ({ mesa_id }) => {
      setPedidos(prev => prev.filter(pedido => Number(pedido.mesa_id) !== Number(mesa_id)));
    });

    return () => { socket.disconnect(); };
  }, []);

  const actualizarEstado = async (id: string, nuevoEstado: string) => {
    try {
      await api.put(`/pedidos/${id}/estado`, { estado: nuevoEstado });
      if (nuevoEstado === 'listo') {
        setPedidos(prev => prev.filter(p => p.id !== id));
      } else {
        setPedidos(prev => prev.map(p => p.id === id ? { ...p, estado: nuevoEstado } : p));
      }
    } catch (e) { console.error(e); }
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', color: COLORS.navy, fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.navy, color: COLORS.white, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.white}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.white }}>
            <ArrowLeft size={18} />
          </button>
          <ChefHat size={28} color={COLORS.white} strokeWidth={1.5} />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '500' }}>Monitor de Cocina</h1>
          <span style={{ backgroundColor: COLORS.white, color: COLORS.navy, padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
            {pedidos.length} Órdenes
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem' }}>Cocinero: <strong style={{ fontWeight: '500' }}>{user?.nombre}</strong></span>
          <button onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'transparent', color: COLORS.white, border: `1px solid ${COLORS.white}`, padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
            <LogOut size={16} />
            Salir
          </button>
        </div>
      </header>

      <div style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {pedidos.map(pedido => {
          const isPendiente = pedido.estado === 'pendiente';
          return (
            <div key={pedido.id} style={{ backgroundColor: COLORS.white, borderRadius: '8px', border: `1px solid ${COLORS.navy}`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '1.2rem', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: isPendiente ? COLORS.white : COLORS.navy, color: isPendiente ? COLORS.navy : COLORS.white }}>
                <div style={{ minWidth: 0 }}>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Mesa {pedido.numero_mesa}</h2>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: isPendiente ? COLORS.textMuted : '#e2e8f0' }}>{pedido.cliente_nombre ? `Familia: ${pedido.cliente_nombre}` : 'Cliente sin nombre'}</p>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: '0.35rem', flexShrink: 0 }}>
                  {pedido.tipo_pedido === 'llevar' && <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.4rem', borderRadius: '4px', color: isPendiente ? COLORS.navy : COLORS.white, backgroundColor: isPendiente ? '#e2e8f0' : '#174b78', fontSize: '0.72rem', fontWeight: '700' }}><Package size={12} /> PARA LLEVAR</span>}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <Clock size={14} />
                    {new Date(pedido.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              
              <div style={{ padding: '1.2rem', flexGrow: 1 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {pedido.detalles.map((d: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '1rem', paddingBottom: '1rem', borderBottom: idx !== pedido.detalles.length -1 ? `1px solid ${COLORS.border}` : 'none' }}>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '1rem', alignItems: 'flex-start' }}>
                        <span style={{ color: COLORS.white, backgroundColor: COLORS.navy, padding: '0.1rem 0.6rem', borderRadius: '4px', fontSize: '0.9rem', fontWeight: '500' }}>{d.cantidad}</span>
                        <span style={{ fontWeight: '500', color: COLORS.navy, paddingTop: '0.1rem' }}>{d.producto_nombre || d.nombre}</span>
                      </div>
                      {d.observaciones && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.8rem', border: `1px solid ${COLORS.navy}`, padding: '0.6rem', borderRadius: '6px', color: COLORS.navy, fontSize: '0.85rem', alignItems: 'flex-start' }}>
                          <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                          <span>{d.observaciones}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>

              <div style={{ padding: '1.2rem', borderTop: `1px solid ${COLORS.border}` }}>
                {isPendiente ? (
                  <button onClick={() => actualizarEstado(pedido.id, 'en preparacion')} style={{ width: '100%', padding: '0.8rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `2px solid ${COLORS.navy}`, borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer' }}>
                    Preparar Orden
                  </button>
                ) : (
                  <button onClick={() => actualizarEstado(pedido.id, 'listo')} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.8rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '500', cursor: 'pointer' }}>
                    <CheckCircle2 size={18} />
                    Lista para Servir
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
