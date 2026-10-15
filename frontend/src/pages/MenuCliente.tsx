import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { io } from 'socket.io-client';
import { Plus, Minus, ShoppingCart, MessageSquare, UtensilsCrossed, ArrowLeft, Receipt, User, Package } from 'lucide-react';
import ConfirmModal from '../components/ConfirmModal';
import PedidoLlevarModal from '../components/PedidoLlevarModal';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function MenuCliente() {
  const { mesaId } = useParams();
  const navigate = useNavigate();
  const [mesas, setMesas] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [carrito, setCarrito] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [carritoExpandido, setCarritoExpandido] = useState(false);
  const [showLlevarModal, setShowLlevarModal] = useState(false);
  const [tipoPedidoPendiente, setTipoPedidoPendiente] = useState<'mesa' | 'llevar'>('mesa');
  const [cuentaSolicitada, setCuentaSolicitada] = useState(false);
  
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cantidad, setCantidad] = useState(1);
  const [observaciones, setObservaciones] = useState('');
  
  const [nombreCliente, setNombreCliente] = useState(localStorage.getItem(`cliente_${mesaId}`) || '');
  const [showNombreModal, setShowNombreModal] = useState(false);

  // Custom Modal
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });

  useEffect(() => {
    const cargarProductos = async () => {
      const response = await api.get('/productos');
      setProductos(response.data);
    };

    const socket = io(new URL(api.defaults.baseURL as string).origin);
    socket.on('catalogo_actualizado', () => {
      cargarProductos().catch(error => console.error('No se pudo actualizar el menú:', error));
    });
    socket.on('sesion_pagada', ({ mesa_id: mesaPagada }) => {
      if (String(mesaPagada) === String(mesaId)) {
        localStorage.removeItem(`cliente_${mesaId}`);
        setNombreCliente('');
        setCuentaSolicitada(false);
      }
    });

    const sesionRequest = mesaId
      ? api.get(`/mesas/${mesaId}/sesion-publica`)
      : Promise.resolve({ data: { activa: false } });

    Promise.all([cargarProductos(), api.get('/mesas/publicas'), sesionRequest])
      .then(([, mesasRes, sesionRes]) => {
        setMesas(mesasRes.data);
        if (mesaId && sesionRes.data.activa) {
          const nombre = sesionRes.data.sesion.cliente_nombre || localStorage.getItem(`cliente_${mesaId}`) || '';
          setNombreCliente(nombre);
          setCuentaSolicitada(sesionRes.data.sesion.estado === 'pidiendo_cuenta');
          if (nombre) localStorage.setItem(`cliente_${mesaId}`, nombre);
        } else if (mesaId) {
          localStorage.removeItem(`cliente_${mesaId}`);
          setNombreCliente('');
          setCuentaSolicitada(false);
        }
      })
      .catch(() => setModalConfig({
        isOpen: true,
        title: 'No se pudo cargar el menú',
        message: 'Verifica tu conexión e intenta nuevamente.',
        type: 'warning',
        hideCancel: true,
        onConfirm: () => setModalConfig({ isOpen: false })
      }))
      .finally(() => setLoading(false));

    return () => {
      socket.disconnect();
    };
  }, [mesaId]);

  const categorias = productos.reduce((acc: any, p: any) => {
    if (!acc[p.categoria_nombre]) acc[p.categoria_nombre] = [];
    acc[p.categoria_nombre].push(p);
    return acc;
  }, {});

  const openModal = (producto: any) => {
    setSelectedProduct(producto);
    setCantidad(1);
    setObservaciones('');
  };

  const confirmAddToCart = () => {
    if (!selectedProduct) return;
    setCarrito([...carrito, { 
      ...selectedProduct, 
      cantidad, 
      observaciones,
      uuid: Math.random().toString(36).substr(2, 9)
    }]);
    setSelectedProduct(null);
  };

  const cambiarCantidadCarrito = (uuid: string, cambio: number) => {
    setCarrito(current => current
      .map(item => item.uuid === uuid ? { ...item, cantidad: item.cantidad + cambio } : item)
      .filter(item => item.cantidad > 0));
  };

  const abrirPedidoLlevar = () => {
    if (!nombreCliente) {
      setTipoPedidoPendiente('llevar');
      setShowNombreModal(true);
    } else {
      setShowLlevarModal(true);
    }
  };

  const handleEnviarClick = () => {
    if (!nombreCliente) {
      setTipoPedidoPendiente('mesa');
      setShowNombreModal(true);
    } else {
      enviarPedido('mesa', carrito);
    }
  };

  const confirmarNombreCliente = async () => {
    if (!nombreCliente.trim()) return;
    setShowNombreModal(false);
    if (tipoPedidoPendiente === 'llevar') {
      setShowLlevarModal(true);
      return;
    }
    await enviarPedido('mesa', carrito);
  };

  const enviarPedido = async (tipoPedido: 'mesa' | 'llevar', itemsPedido: any[]): Promise<boolean> => {
    if (itemsPedido.length === 0 || enviando) return false;
    setEnviando(true);
    try {
      const detalles = itemsPedido.map(item => ({
        producto_id: item.id,
        cantidad: item.cantidad,
        observaciones: item.observaciones
      }));

      await api.post('/pedidos', { mesa_id: mesaId, origen: 'qr', tipo_pedido: tipoPedido, detalles, cliente_nombre: nombreCliente.trim() });
      localStorage.setItem(`cliente_${mesaId}`, nombreCliente.trim());
      if (tipoPedido === 'mesa') setCarrito([]);
      
      setModalConfig({
        isOpen: true,
        title: tipoPedido === 'llevar' ? '¡Pedido para llevar enviado!' : '¡Pedido enviado!',
        message: tipoPedido === 'llevar' ? 'El pedido para llevar se agregó a la cuenta de esta mesa y se envió a cocina.' : 'El pedido se agregó a la cuenta de esta mesa y se envió a cocina.',
        type: 'success',
        hideCancel: true,
        onConfirm: () => setModalConfig({isOpen: false})
      });
      return true;
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'No se pudo enviar el pedido', message: error.response?.data?.message || 'Verifica tu conexión e intenta nuevamente. Los productos siguen en tu carrito.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
      return false;
    } finally {
      setEnviando(false);
    }
  };

  const solicitarCuenta = async () => {
    setModalConfig({
      isOpen: true,
      title: 'Pedir Cuenta',
      message: '¿Estás seguro que deseas pedir la cuenta al mesero?',
      onConfirm: async () => {
        try {
          await api.post(`/mesas/${mesaId}/solicitar-cuenta`);
          setCuentaSolicitada(true);
          setModalConfig({
            isOpen: true, title: 'Cuenta Solicitada', message: 'El mesero ya fue notificado. Puedes agregar productos a esta misma cuenta; el nombre y la mesa seguirán activos hasta que Caja registre el cobro.', type: 'success', hideCancel: true,
            onConfirm: () => setModalConfig({ isOpen: false })
          });
        } catch (e) {
          setModalConfig({ isOpen: true, title: 'Error', message: 'Error al solicitar la cuenta.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({isOpen: false}) });
        }
      },
      onCancel: () => setModalConfig({ isOpen: false })
    });
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '4rem', color: COLORS.textMuted, fontFamily: 'sans-serif' }}>Cargando menú...</div>;

  if (!mesaId) {
    return (
      <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
        <ConfirmModal {...modalConfig} />
        <header style={{ position: 'relative', padding: '2rem 1.5rem', textAlign: 'center', backgroundColor: COLORS.navy, color: COLORS.white }}>
          <button onClick={() => navigate('/admin')} aria-label="Regresar al panel principal" title="Regresar al panel principal" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.white}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.white }}>
            <ArrowLeft size={18} />
          </button>
          <UtensilsCrossed size={32} color={COLORS.white} strokeWidth={1} style={{ margin: '0 auto 1rem auto' }} />
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '500' }}>Pupusería Albi</h1>
          <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', color: '#e0e7ff' }}>Selecciona tu mesa</p>
        </header>
        <main style={{ maxWidth: '760px', margin: '0 auto', padding: '2rem 1.5rem' }}>
          {mesas.length === 0 ? (
            <p style={{ textAlign: 'center', color: COLORS.textMuted }}>No hay mesas disponibles.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
              {mesas.map(mesa => (
                <button key={mesa.id} onClick={() => navigate(`/menu/${mesa.id}`)} style={{ minHeight: '100px', padding: '1rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', fontSize: '1.1rem', fontWeight: '600' }}>
                  Mesa {mesa.numero_mesa}
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', paddingBottom: '120px', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <ConfirmModal {...modalConfig} />
      
      <header style={{ padding: '2rem 1.5rem', textAlign: 'center', borderBottom: `1px solid ${COLORS.border}`, backgroundColor: COLORS.navy, color: COLORS.white, position: 'relative' }}>
        <button onClick={() => navigate('/menu')} aria-label="Volver a seleccionar mesa" title="Volver a seleccionar mesa" style={{ position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.white}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.white }}>
          <ArrowLeft size={18} />
        </button>
        <button onClick={solicitarCuenta} disabled={cuentaSolicitada} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.5rem', backgroundColor: 'transparent', border: `1px solid ${COLORS.white}`, borderRadius: '8px', cursor: cuentaSolicitada ? 'default' : 'pointer', opacity: cuentaSolicitada ? 0.8 : 1, color: COLORS.white, gap: '0.4rem', fontSize: '0.8rem' }}>
          <Receipt size={16} /> {cuentaSolicitada ? 'Cuenta solicitada' : 'Pedir Cuenta'}
        </button>
        <UtensilsCrossed size={32} color={COLORS.white} strokeWidth={1} style={{ margin: '0 auto 1rem auto' }} />
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '500', letterSpacing: '0.5px' }}>Pupusería Albi</h1>
        <p style={{ margin: '0.4rem 0 0 0', fontSize: '0.9rem', color: '#e0e7ff' }}>Mesa {mesaId}</p>
        {nombreCliente && <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.85rem', color: '#cbd5e1' }}>Mesa a nombre de: {nombreCliente}</p>}
      </header>

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '1.5rem' }}>
        <button onClick={abrirPedidoLlevar} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', width: '100%', padding: '0.8rem', marginBottom: '2rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', cursor: 'pointer', fontWeight: '600' }}>
          <Package size={17} /> Anexar productos para llevar
        </button>
        {Object.keys(categorias).map(catName => (
          <div key={catName} style={{ marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', color: COLORS.navy, borderBottom: `2px solid ${COLORS.navy}`, paddingBottom: '0.8rem', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {catName}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.2rem' }}>
              {categorias[catName].map((p: any) => (
                <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.2rem', borderBottom: `1px dashed ${COLORS.border}` }}>
                  <div style={{ paddingRight: '1rem' }}>
                    <h3 style={{ margin: '0 0 0.3rem 0', color: COLORS.navy, fontSize: '1.1rem', fontWeight: '500' }}>{p.nombre}</h3>
                    <p style={{ margin: '0 0 0.5rem 0', color: COLORS.textMuted, fontSize: '0.85rem', lineHeight: '1.4' }}>{p.descripcion}</p>
                    <span style={{ fontWeight: '600', fontSize: '1rem', color: COLORS.navy }}>${Number(p.precio).toFixed(2)}</span>
                  </div>
                  <button 
                    onClick={() => openModal(p)}
                    style={{ backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
                  >
                    <Plus size={16} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {carrito.length > 0 && (
        <section style={{ position: 'fixed', bottom: '1rem', left: '1rem', right: '1rem', maxWidth: '600px', margin: '0 auto', backgroundColor: COLORS.navy, borderRadius: '8px', color: COLORS.white, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.25)', zIndex: 10, overflow: 'hidden' }}>
          {carritoExpandido && <div style={{ maxHeight: 'min(55vh, 440px)', overflowY: 'auto', padding: '0.5rem 1rem' }}>
            {carrito.map((item, index) => <article key={item.uuid} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.75rem', alignItems: 'center', padding: '0.8rem 0', borderBottom: index === carrito.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ minWidth: 0 }}>
                <strong style={{ display: 'block', color: COLORS.white, fontSize: '0.95rem' }}>{item.nombre}</strong>
                {item.observaciones && <span style={{ display: 'block', marginTop: '0.2rem', color: '#cbd5e1', fontSize: '0.8rem' }}>{item.observaciones}</span>}
                <span style={{ display: 'block', marginTop: '0.25rem', color: '#e2e8f0', fontSize: '0.82rem' }}>${Number(item.precio).toFixed(2)} c/u · Subtotal ${(Number(item.precio) * item.cantidad).toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <button type="button" onClick={() => cambiarCantidadCarrito(item.uuid, -1)} aria-label={`Quitar una unidad de ${item.nombre}`} style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.55)', borderRadius: '5px', background: 'transparent', color: COLORS.white, cursor: 'pointer' }}>−</button>
                <span style={{ minWidth: '20px', textAlign: 'center', color: COLORS.white, fontWeight: '600' }}>{item.cantidad}</span>
                <button type="button" onClick={() => cambiarCantidadCarrito(item.uuid, 1)} aria-label={`Agregar una unidad de ${item.nombre}`} style={{ width: '32px', height: '32px', border: '1px solid rgba(255,255,255,0.55)', borderRadius: '5px', background: 'transparent', color: COLORS.white, cursor: 'pointer' }}>+</button>
              </div>
            </article>)}
          </div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.8rem 1rem' }}>
            <button type="button" onClick={() => setCarritoExpandido(value => !value)} aria-expanded={carritoExpandido} style={{ minWidth: 0, flex: 1, textAlign: 'left', border: 0, background: 'transparent', color: COLORS.white, cursor: 'pointer' }}>
              <span style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600' }}>{carritoExpandido ? 'Ocultar detalle' : 'Ver detalle del pedido'} ({carrito.reduce((acc, item) => acc + item.cantidad, 0)})</span>
              <span style={{ display: 'block', marginTop: '0.15rem', color: '#e2e8f0', fontSize: '0.85rem' }}>Total: ${carrito.reduce((acc, item) => acc + Number(item.precio) * item.cantidad, 0).toFixed(2)}</span>
            </button>
            <button onClick={handleEnviarClick} disabled={enviando} style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0, backgroundColor: COLORS.white, color: COLORS.navy, padding: '0.65rem 0.9rem', border: 'none', borderRadius: '6px', fontWeight: '600', fontSize: '0.9rem', cursor: enviando ? 'wait' : 'pointer', opacity: enviando ? 0.7 : 1 }}>
              <ShoppingCart size={16} /> {enviando ? 'Enviando...' : 'Ordenar'}
            </button>
          </div>
        </section>
      )}

      {showNombreModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 40, 85, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '400px', border: `1px solid ${COLORS.navy}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)' }}>
            <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User color={COLORS.navy} />
              <h2 style={{ margin: 0, color: COLORS.navy, fontSize: '1.2rem', fontWeight: '600' }}>Datos del Pedido</h2>
            </div>
            <p style={{ color: COLORS.textMuted, fontSize: '0.95rem', marginBottom: '1rem' }}>Por favor, ingresa tu nombre para identificar la mesa.</p>
            <input 
              type="text" 
              placeholder="Ej. Juan Pérez" 
              value={nombreCliente}
              onChange={(e) => setNombreCliente(e.target.value)}
              style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: `1px solid ${COLORS.navy}`, fontSize: '1rem', outline: 'none', color: COLORS.navy, backgroundColor: COLORS.white, marginBottom: '2rem', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => setShowNombreModal(false)} style={{ padding: '0.8rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>Cancelar</button>
              <button onClick={confirmarNombreCliente} disabled={!nombreCliente.trim() || enviando} style={{ padding: '0.8rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: '600', cursor: enviando ? 'wait' : 'pointer', fontSize: '1rem', opacity: nombreCliente.trim() && !enviando ? 1 : 0.5 }}>Continuar</button>
            </div>
          </div>
        </div>
      )}

      <PedidoLlevarModal
        isOpen={showLlevarModal}
        productos={productos}
        enviando={enviando}
        onClose={() => setShowLlevarModal(false)}
        onSubmit={items => enviarPedido('llevar', items)}
      />

      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 40, 85, 0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 50, padding: '1rem', backdropFilter: 'blur(2px)' }}>
          <div style={{ backgroundColor: COLORS.white, borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '500px', border: `1px solid ${COLORS.navy}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', boxSizing: 'border-box' }}>
            <div style={{ borderBottom: `1px solid ${COLORS.border}`, paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <h2 style={{ margin: '0 0 0.3rem 0', color: COLORS.navy, fontSize: '1.3rem', fontWeight: '600' }}>{selectedProduct.nombre}</h2>
              <p style={{ color: COLORS.textMuted, margin: 0, fontSize: '1rem' }}>${Number(selectedProduct.precio).toFixed(2)}</p>
            </div>
            
            <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '1rem', color: COLORS.navy, fontWeight: '500' }}>Cantidad</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <button onClick={() => setCantidad(Math.max(1, cantidad - 1))} style={{ width: '40px', height: '40px', borderRadius: '50%', border: `1px solid ${COLORS.navy}`, backgroundColor: COLORS.white, color: COLORS.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Minus size={18} />
                </button>
                <span style={{ fontSize: '1.2rem', fontWeight: '600', minWidth: '24px', textAlign: 'center', color: COLORS.navy }}>{cantidad}</span>
                <button onClick={() => setCantidad(cantidad + 1)} style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', backgroundColor: COLORS.navy, color: COLORS.white, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Plus size={18} />
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.8rem' }}>
                <MessageSquare size={16} color={COLORS.navy} />
                <label style={{ fontSize: '1rem', color: COLORS.navy, fontWeight: '500' }}>Notas adicionales</label>
              </div>
              <textarea 
                placeholder="Ej. Sin curtido, tostada..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '1rem', borderRadius: '8px', border: `1px solid ${COLORS.border}`, minHeight: '80px', fontFamily: 'inherit', resize: 'none', fontSize: '0.95rem', outline: 'none', color: COLORS.navy, backgroundColor: COLORS.white }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <button onClick={() => setSelectedProduct(null)} style={{ padding: '0.8rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>Cancelar</button>
              <button onClick={confirmAddToCart} style={{ padding: '0.8rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>Añadir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
