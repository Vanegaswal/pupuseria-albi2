import { useEffect, useMemo, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ChefHat, CheckCircle2, Clock, AlertCircle, LogOut, ArrowLeft, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COLORS = {
  ink: '#002855',
  rose: '#ffffff',
  emerald: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569',
  overdue: '#dc2626'
};

interface DetallePedido {
  cantidad: number;
  producto_nombre?: string;
  nombre?: string;
  observaciones?: string;
}

interface Pedido {
  id: number | string;
  mesa_id: number;
  numero_mesa: number | string;
  cliente_nombre?: string | null;
  tipo_pedido?: string;
  estado: string;
  creado_en: string;
  detalles: DetallePedido[];
}

export default function Cocina() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ahora, setAhora] = useState(() => Date.now());
  const [errorCarga, setErrorCarga] = useState('');
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    let activo = true;
    api.get<Pedido[]>('/pedidos')
      .then(res => {
        if (activo) {
          setPedidos(res.data.filter(p => p.estado === 'pendiente' || p.estado === 'en preparacion'));
          setErrorCarga('');
        }
      })
      .catch(error => {
        console.error('No se pudieron cargar los pedidos de cocina:', error);
        if (activo) setErrorCarga('No se pudieron cargar las órdenes. Intenta actualizar la página.');
      });

    const socket: Socket = io(new URL(api.defaults.baseURL as string).origin);
    socket.emit('join_cocina');

    socket.on('nuevo_pedido', (pedido: Pedido) => {
      setPedidos(prev => prev.some(actual => actual.id === pedido.id) ? prev : [...prev, pedido]);
    });

    socket.on('estado_pedido_actualizado', ({ id, estado }: { id: Pedido['id']; estado: string }) => {
      if (estado === 'listo' || estado === 'entregado' || estado === 'pagado') {
        setPedidos(prev => prev.filter(p => String(p.id) !== String(id)));
      } else {
        setPedidos(prev => prev.map(p => String(p.id) === String(id) ? { ...p, estado } : p));
      }
    });

    socket.on('sesion_pagada', ({ mesa_id }: { mesa_id: number }) => {
      setPedidos(prev => prev.filter(pedido => Number(pedido.mesa_id) !== Number(mesa_id)));
    });

    const timer = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      activo = false;
      window.clearInterval(timer);
      socket.disconnect();
    };
  }, []);

  const pedidosPorMesa = useMemo(() => {
    const grupos = new Map<number, Pedido[]>();
    pedidos.forEach(pedido => {
      const ordenesMesa = grupos.get(pedido.mesa_id) ?? [];
      ordenesMesa.push(pedido);
      grupos.set(pedido.mesa_id, ordenesMesa);
    });
    return [...grupos.entries()].map(([mesaId, ordenes]) => ({
      mesaId,
      numeroMesa: ordenes[0].numero_mesa,
      ordenes: [...ordenes].sort((a, b) => Date.parse(a.creado_en) - Date.parse(b.creado_en))
    }));
  }, [pedidos]);

  const actualizarEstado = async (id: Pedido['id'], nuevoEstado: string) => {
    try {
      await api.put(`/pedidos/${id}/estado`, { estado: nuevoEstado });
      if (nuevoEstado === 'listo') {
        setPedidos(prev => prev.filter(p => String(p.id) !== String(id)));
      } else {
        setPedidos(prev => prev.map(p => String(p.id) === String(id) ? { ...p, estado: nuevoEstado } : p));
      }
    } catch (error) {
      console.error('No se pudo actualizar el estado de la orden:', error);
      setErrorCarga('No se pudo actualizar la orden. Intenta de nuevo.');
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', color: COLORS.ink }}>
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.ink, color: COLORS.white, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.white}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.white }}>
            <ArrowLeft size={18} />
          </button>
          <ChefHat size={28} color={COLORS.white} strokeWidth={1.5} />
          <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '500' }}>Monitor de Cocina</h1>
          <span style={{ backgroundColor: COLORS.rose, color: COLORS.ink, padding: '0.2rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: '600' }}>
            {pedidosPorMesa.length} Mesas · {pedidos.length} Órdenes
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

      <div className="kitchen-orders" style={{ padding: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
        {errorCarga && <p role="alert" style={{ gridColumn: '1 / -1', margin: 0, padding: '0.85rem 1rem', borderRadius: '8px', backgroundColor: '#fff1f0', color: COLORS.overdue }}>{errorCarga}</p>}
        {pedidosPorMesa.map(({ mesaId, numeroMesa, ordenes }) => (
          <article key={mesaId} style={{ overflow: 'hidden', backgroundColor: COLORS.white, border: `1px solid ${COLORS.ink}`, borderRadius: '12px', boxShadow: '0 6px 20px rgba(0, 40, 85, 0.08)' }}>
            <header style={{ padding: '1rem 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', backgroundColor: COLORS.ink, color: COLORS.white }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Mesa {numeroMesa}</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: COLORS.rose }}>{ordenes[0].cliente_nombre || 'Cliente sin nombre'}</p>
              </div>
              <span style={{ flexShrink: 0, padding: '0.25rem 0.55rem', borderRadius: '999px', backgroundColor: COLORS.rose, color: COLORS.ink, fontSize: '0.75rem', fontWeight: 700 }}>
                {ordenes.length} {ordenes.length === 1 ? 'ORDEN' : 'ÓRDENES'}
              </span>
            </header>

            <div style={{ padding: '0 1rem' }}>
              {ordenes.map((pedido, orderIndex) => {
                const isPendiente = pedido.estado === 'pendiente';
                const isPreparando = pedido.estado === 'en preparacion';
                const creadoEn = Date.parse(pedido.creado_en);
                const tiempoValido = Number.isFinite(creadoEn);
                const retrasado = tiempoValido && ahora - creadoEn >= 15 * 60 * 1000;
                const colorEstado = retrasado
                  ? COLORS.overdue
                  : isPendiente ? COLORS.ink : isPreparando ? '#003a7a' : COLORS.ink;
                const fondoEstado = retrasado
                  ? '#fff1f0'
                  : isPendiente ? COLORS.rose : isPreparando ? '#f8fafc' : COLORS.white;

                return (
                  <section key={pedido.id} style={{ padding: '1rem 0', borderBottom: orderIndex < ordenes.length - 1 ? `1px dashed ${COLORS.border}` : 'none' }}>
                    <div style={{ marginBottom: '0.75rem', padding: '0.85rem', border: `1px solid ${colorEstado}`, borderLeft: `5px solid ${colorEstado}`, borderRadius: '8px', backgroundColor: fondoEstado }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', color: colorEstado }}>
                        <strong style={{ fontSize: '0.86rem', textTransform: 'uppercase' }}>
                          {retrasado ? 'Retrasada · ' : ''}{isPendiente ? 'Pendiente' : isPreparando ? 'En preparación' : pedido.estado}
                        </strong>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }} title={tiempoValido ? new Date(creadoEn).toLocaleTimeString() : undefined}>
                          <Clock size={14} />
                          {tiempoValido ? `${Math.floor(Math.max(0, ahora - creadoEn) / 60000)} min ${String(Math.floor(Math.max(0, ahora - creadoEn) / 1000) % 60).padStart(2, '0')} s` : 'Tiempo no disponible'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.45rem' }}>
                        {pedido.tipo_pedido === 'llevar' && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.18rem 0.4rem', borderRadius: '4px', backgroundColor: COLORS.white, color: COLORS.ink, fontSize: '0.7rem', fontWeight: 700 }}><Package size={12} /> PARA LLEVAR</span>}
                        <span style={{ color: COLORS.textMuted, fontSize: '0.75rem' }}>Pedido recibido {tiempoValido ? `a las ${new Date(creadoEn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</span>
                      </div>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {pedido.detalles.map((detalle, idx) => (
                        <li key={`${pedido.id}-${idx}`} style={{ marginBottom: '0.7rem' }}>
                          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.95rem', alignItems: 'flex-start' }}>
                            <span style={{ color: COLORS.white, backgroundColor: COLORS.ink, padding: '0.1rem 0.55rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 700 }}>{detalle.cantidad}</span>
                            <span style={{ fontWeight: 700, color: COLORS.ink, paddingTop: '0.1rem' }}>{detalle.producto_nombre || detalle.nombre}</span>
                          </div>
                          {detalle.observaciones && (
                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem', border: `1px solid ${COLORS.ink}`, padding: '0.55rem', borderRadius: '6px', color: COLORS.ink, fontSize: '0.82rem', alignItems: 'flex-start' }}>
                              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                              <span>{detalle.observaciones}</span>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>

                    <div style={{ marginTop: '0.85rem' }}>
                      {isPendiente ? (
                        <button onClick={() => actualizarEstado(pedido.id, 'en preparacion')} style={{ width: '100%', padding: '0.7rem', backgroundColor: COLORS.ink, color: COLORS.white, border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                          Preparar orden
                        </button>
                      ) : (
                        <button onClick={() => actualizarEstado(pedido.id, 'listo')} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', width: '100%', padding: '0.7rem', backgroundColor: COLORS.emerald, color: COLORS.white, border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}>
                          <CheckCircle2 size={18} />
                          Lista para servir
                        </button>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </article>
        ))}
        {pedidos.length === 0 && !errorCarga && (
          <div style={{ gridColumn: '1 / -1', padding: '3rem 1rem', textAlign: 'center', color: COLORS.ink }}>
            <ChefHat size={36} color={COLORS.emerald} />
            <p style={{ margin: '0.75rem 0 0' }}>No hay órdenes pendientes por preparar.</p>
          </div>
        )}
      </div>
    </div>
  );
}
