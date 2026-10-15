import { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Wallet, ArrowLeft, LockKeyhole, RefreshCw, Receipt } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Caja() {
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [turno, setTurno] = useState<any>(null);
  const [montoApertura, setMontoApertura] = useState('');
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [errorCuentas, setErrorCuentas] = useState('');
  const [historial, setHistorial] = useState<any[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [errorHistorial, setErrorHistorial] = useState('');
  const [procesandoTurno, setProcesandoTurno] = useState(false);
  const { user } = useAuth();
  const puedeGestionarTurno = user?.rol === 'Administrador' || user?.rol === 'Cajero';
  const navigate = useNavigate();

  // Modal State
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });

  const fetchEstado = async () => {
    try {
      const res = await api.get('/caja/turno');
      setTurno(res.data);
      setErrorCarga('');
      if (res.data.activo) {
        await fetchCuentas();
      } else {
        setCuentas([]);
      }
    } catch (error: any) {
      console.error(error);
      setErrorCarga(error.response?.data?.message || 'No se pudo consultar el estado de caja.');
    } finally {
      setCargando(false);
    }
  };

  const fetchCuentas = async () => {
    try {
      const res = await api.get('/caja/cuentas');
      setCuentas(res.data);
      setErrorCuentas('');
    } catch (error: any) {
      console.error(error);
      setErrorCuentas(error.response?.data?.message || 'No se pudieron cargar las cuentas pendientes.');
    }
  };

  const fetchHistorial = async () => {
    if (!puedeGestionarTurno) return;
    setCargandoHistorial(true);
    try {
      const res = await api.get('/caja/turnos/historial');
      setHistorial(res.data);
      setErrorHistorial('');
    } catch (error: any) {
      console.error(error);
      setErrorHistorial(error.response?.data?.message || 'No se pudo cargar el historial de caja.');
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    fetchEstado();
    fetchHistorial();
  }, []);

  const abrirTurno = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setProcesandoTurno(true);
      await api.post('/caja/turno/abrir', { monto_apertura: Number(montoApertura) });
      await Promise.all([fetchEstado(), fetchHistorial()]);
      setMontoApertura('');
      setModalConfig({ isOpen: true, title: 'Caja abierta correctamente', message: 'El turno de caja está activo y ya puedes procesar cobros.', type: 'success', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'No se pudo abrir la caja', message: error.response?.data?.message || 'Verifica el monto inicial e intenta nuevamente.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    } finally {
      setProcesandoTurno(false);
    }
  };

  const intentarCerrarTurno = () => {
    setModalConfig({
      isOpen: true,
      title: 'Cierre de Caja',
      message: `¿Confirmas cerrar caja? El monto final calculado es de $${Number(turno.esperado).toFixed(2)}.`,
      type: 'info',
      onConfirm: ejecutarCerrarTurno,
      onCancel: () => setModalConfig({ isOpen: false }),
      confirmText: 'Cerrar Caja'
    });
  };

  const ejecutarCerrarTurno = async () => {
    setProcesandoTurno(true);
    try {
      const response = await api.post('/caja/turno/cerrar');
      await Promise.all([fetchEstado(), fetchHistorial()]);
      const cierre = response.data.turno;
      setModalConfig({
        isOpen: true,
        title: 'Caja cerrada correctamente',
        message: `Monto inicial: $${Number(cierre.monto_apertura).toFixed(2)}. Ventas totales: $${Number(cierre.ventas_totales).toFixed(2)}. Monto final: $${Number(cierre.monto_final).toFixed(2)}.`,
        type: 'success',
        hideCancel: true,
        onConfirm: () => setModalConfig({ isOpen: false })
      });
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'No se pudo cerrar la caja', message: error.response?.data?.message || 'Ocurrió un error al cerrar el turno.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    } finally {
      setProcesandoTurno(false);
    }
  };

  const manejarCobro = async (sesion_id: string, numero_mesa: number, total: number | string) => {
    const monto = Number(total);
    if (!Number.isFinite(monto) || monto < 0) {
      setModalConfig({ isOpen: true, title: 'Total inválido', message: 'No se puede procesar el cobro porque el total de la cuenta no es válido.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
      return;
    }

    setModalConfig({
      isOpen: true,
      title: 'Confirmar Cobro',
      message: `¿Deseas cobrar $${monto.toFixed(2)} a la Mesa ${numero_mesa}?`,
      onConfirm: () => ejecutarCobro(sesion_id, numero_mesa, monto),
      onCancel: () => setModalConfig({ isOpen: false })
    });
  };

  const revisarPedido = async (cuenta: any) => {
    try {
      const response = await api.get(`/caja/cuentas/${cuenta.sesion_id}/detalles`);
      const detalle = response.data;
      setModalConfig({
        isOpen: true,
        title: `Detalle de Mesa ${detalle.numero_mesa}`,
        message: `${detalle.cliente_nombre ? `Cliente: ${detalle.cliente_nombre}. ` : ''}Revisa cada pedido antes de continuar al cobro.`,
        confirmText: 'Continuar al cobro',
        onCancel: () => setModalConfig({ isOpen: false }),
        onConfirm: () => manejarCobro(detalle.sesion_id, detalle.numero_mesa, detalle.total),
        children: <div style={{ display: 'grid', gap: '0.85rem', maxHeight: '45vh', overflowY: 'auto', marginBottom: '1.5rem' }}>
          {detalle.pedidos.map((pedido: any, index: number) => (
            <section key={pedido.id} style={{ padding: '0.8rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px' }}>
              <h3 style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', margin: '0 0 0.5rem', color: COLORS.navy, fontSize: '0.9rem' }}>
                <span>Pedido {index + 1} · {pedido.tipo_pedido === 'llevar' ? 'Para llevar' : 'En mesa'}</span>
                <span>{new Date(pedido.creado_en).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </h3>
              {pedido.detalles.map((item: any) => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem', padding: '0.35rem 0', color: COLORS.textMuted, fontSize: '0.88rem' }}>
                <span><strong style={{ color: COLORS.navy }}>{item.cantidad} × {item.producto}</strong>{item.observaciones && <small style={{ display: 'block', color: COLORS.textMuted }}>{item.observaciones}</small>}</span>
                <span style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>${Number(item.precio_unitario).toFixed(2)} c/u<br /><strong style={{ color: COLORS.navy }}>${Number(item.subtotal).toFixed(2)}</strong></span>
              </div>)}
              <p style={{ margin: '0.5rem 0 0', textAlign: 'right', color: COLORS.navy, fontWeight: '700' }}>Subtotal: ${Number(pedido.total).toFixed(2)}</p>
            </section>
          ))}
          <p style={{ margin: 0, paddingTop: '0.65rem', borderTop: `1px solid ${COLORS.border}`, textAlign: 'right', color: COLORS.navy, fontSize: '1.05rem', fontWeight: '700' }}>Total de la cuenta: ${Number(detalle.total).toFixed(2)}</p>
        </div>
      });
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'No se pudo cargar el detalle', message: error.response?.data?.message || 'Intenta nuevamente.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    }
  };

  const ejecutarCobro = async (sesion_id: string, numero_mesa: number, total: number) => {
    const ticket = window.open('', 'Comprobante', 'width=420,height=700');
    if (!ticket) {
      setModalConfig({ isOpen: true, title: 'Habilita el comprobante', message: 'Permite las ventanas emergentes para imprimir el comprobante antes de procesar el cobro.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
      return;
    }

    try {
      const response = await api.post(`/caja/cobrar/${sesion_id}`);
      setModalConfig({ isOpen: false });
      const recibo = response.data.recibo;
      const escaparHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
      const detalleHTML = recibo.detalles.map((detalle: any) => `
        <tr>
          <td><small>${detalle.tipo_pedido === 'llevar' ? 'PARA LLEVAR' : 'EN MESA'}</small><strong>${escaparHTML(detalle.producto)}</strong>${detalle.observaciones ? `<small>${escaparHTML(detalle.observaciones)}</small>` : ''}</td>
          <td class="number">${detalle.cantidad}</td>
          <td class="number">$${Number(detalle.precio_unitario).toFixed(2)}</td>
          <td class="number">$${Number(detalle.subtotal).toFixed(2)}</td>
        </tr>
      `).join('');
      ticket?.document.write(`
        <html><head><title>Comprobante</title><style>
          body{font-family:monospace;padding:18px;color:#111;max-width:390px;margin:0 auto;font-size:12px}
          h2,p{margin:4px 0}h2{text-align:center;color:#002855;font-size:18px}
          .center{text-align:center}.rule{border:0;border-top:1px dashed #555;margin:12px 0}
          table{width:100%;border-collapse:collapse;margin:12px 0}th,td{padding:5px 2px;text-align:left;vertical-align:top}
          th{border-bottom:1px solid #555}.number{text-align:right;white-space:nowrap}
          small{display:block;color:#555;margin-top:3px}.total{font-size:15px;font-weight:bold;text-align:right}
          @media print{body{padding:0}}
        </style></head><body>
          <h2>PUPUSERÍA ALBI</h2>
          <p class="center">Comprobante de pago</p>
          <hr class="rule"/>
          <p><strong>MESA:</strong> ${escaparHTML(recibo.numero_mesa ?? numero_mesa)}</p>
          ${recibo.cliente_nombre ? `<p><strong>CLIENTE:</strong> ${escaparHTML(recibo.cliente_nombre)}</p>` : ''}
          <p><strong>FECHA:</strong> ${new Date().toLocaleString()}</p>
          <table><thead><tr><th>Producto</th><th class="number">Cant.</th><th class="number">Unit.</th><th class="number">Subtotal</th></tr></thead>
          <tbody>${detalleHTML}</tbody></table>
          <hr class="rule"/>
          <p class="total">TOTAL: $${Number(recibo.total ?? total).toFixed(2)}</p>
          <hr class="rule"/><p class="center">Gracias por su visita</p>
        </body></html>
      `);
      ticket.document.close();
      ticket.focus();
      ticket.print();
      ticket.close();

      fetchEstado();
    } catch (e) { 
      ticket.close();
      setModalConfig({ isOpen: true, title: 'Error', message: 'Error al cobrar la cuenta', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({isOpen: false}) });
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <ConfirmModal {...modalConfig} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.navy }}>
            <ArrowLeft size={18} />
          </button>
          <Wallet size={24} color={COLORS.navy} strokeWidth={1.5} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500', color: COLORS.navy }}>Punto de Venta / Caja</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {turno?.activo && <span style={{ fontSize: '0.9rem', color: COLORS.textMuted }}>Esperado en caja: <strong style={{ color: COLORS.navy }}>${Number(turno.esperado).toFixed(2)}</strong></span>}
          {turno?.activo && puedeGestionarTurno && <button onClick={intentarCerrarTurno} disabled={procesandoTurno} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', padding: '0.6rem 1.2rem', borderRadius: '6px', cursor: procesandoTurno ? 'wait' : 'pointer', fontSize: '0.9rem', fontWeight: '500', opacity: procesandoTurno ? 0.65 : 1 }}>
            <LockKeyhole size={16} /> Cerrar Caja
          </button>}
        </div>
      </header>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
        {cargando && <p role="status" style={{ padding: '1rem', color: COLORS.textMuted }}>Cargando estado de caja...</p>}
        {errorCarga && <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem', marginBottom: '1rem', color: '#9f2d2d', backgroundColor: '#fff1f0', border: '1px solid #f2c7c3', borderRadius: '6px' }}>
          <span>{errorCarga}</span>
          <button onClick={fetchEstado} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.75rem', border: '1px solid #9f2d2d', borderRadius: '6px', color: '#7f1d1d', background: '#fff', cursor: 'pointer' }}><RefreshCw size={15} /> Reintentar</button>
        </div>}

        {!cargando && !errorCarga && !turno?.activo && <section style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 0' }}>
          <div style={{ width: '100%', maxWidth: '430px', boxSizing: 'border-box', border: `1px solid ${COLORS.border}`, padding: '2rem', borderRadius: '8px', textAlign: 'center' }}>
            <Wallet size={42} strokeWidth={1.3} style={{ marginBottom: '0.75rem', color: COLORS.navy }} />
            <h2 style={{ margin: '0 0 1.25rem', color: COLORS.navy }}>{puedeGestionarTurno ? 'Apertura de Caja' : 'Caja cerrada'}</h2>
            {puedeGestionarTurno ? <form onSubmit={abrirTurno}>
              <label style={{ display: 'block', marginBottom: '1rem', textAlign: 'left', color: COLORS.navy }}>Monto inicial en caja ($)
                <input type="number" min="0" step="0.01" value={montoApertura} onChange={event => setMontoApertura(event.target.value)} required style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.4rem', padding: '0.8rem', borderRadius: '6px', border: `1px solid ${COLORS.border}`, color: COLORS.navy, backgroundColor: COLORS.white }} />
              </label>
              <button type="submit" disabled={procesandoTurno} style={{ width: '100%', padding: '0.85rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', fontSize: '1rem', cursor: procesandoTurno ? 'wait' : 'pointer', opacity: procesandoTurno ? 0.65 : 1 }}>{procesandoTurno ? 'Abriendo...' : 'Abrir Turno'}</button>
            </form> : <p style={{ color: COLORS.textMuted }}>Solicita a un cajero que abra un turno para poder cobrar.</p>}
          </div>
        </section>}

        {turno?.activo && <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ margin: '0 0 1rem', color: COLORS.navy, fontSize: '1.15rem' }}>Cuentas pendientes</h2>
          {errorCuentas && <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem', marginBottom: '1rem', color: '#9f2d2d', backgroundColor: '#fff1f0', borderRadius: '6px' }}><span>{errorCuentas}</span><button onClick={fetchCuentas} style={{ background: 'transparent', border: 0, color: '#7f1d1d', textDecoration: 'underline', cursor: 'pointer' }}>Reintentar</button></div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
            {cuentas.map(c => (
              <article key={c.sesion_id} style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: '1.25rem', borderRadius: '8px', display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ margin: '0 0 0.5rem', color: COLORS.navy, fontSize: '1.05rem' }}>Mesa {c.numero_mesa}</h3>
                {c.cliente_nombre && <p style={{ margin: '0 0 0.75rem', color: COLORS.textMuted, fontSize: '0.9rem' }}>Cliente: {c.cliente_nombre}</p>}
                <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '1.8rem', color: COLORS.navy }}>${Number(c.total).toFixed(2)}</p>
                <button onClick={() => revisarPedido(c)} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.75rem', marginTop: 'auto', background: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Receipt size={16} /> Ver pedido y cobrar</button>
              </article>
            ))}
          </div>
          {!errorCuentas && cuentas.length === 0 && <p style={{ padding: '1rem', color: COLORS.textMuted }}>No hay cuentas pendientes de cobro.</p>}
        </section>}

        {puedeGestionarTurno && <section>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.75rem' }}>
            <h2 style={{ margin: 0, color: COLORS.navy, fontSize: '1.15rem' }}>Historial de caja</h2>
            <span style={{ color: COLORS.textMuted, fontSize: '0.85rem' }}>Ventas brutas; no descuenta costos de productos</span>
          </div>
          {errorHistorial && <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem', marginBottom: '1rem', color: '#9f2d2d', backgroundColor: '#fff1f0', borderRadius: '6px' }}><span>{errorHistorial}</span><button onClick={fetchHistorial} style={{ background: 'transparent', border: 0, color: '#7f1d1d', textDecoration: 'underline', cursor: 'pointer' }}>Reintentar</button></div>}
          <div style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: COLORS.navy, color: COLORS.white }}><tr>
                {['Estado', 'Apertura', 'Cierre', 'Monto inicial', 'Ventas brutas', 'Monto final', 'Responsable'].map(label => <th key={label} style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {historial.map((registro, index) => <tr key={registro.id} style={{ borderBottom: index === historial.length - 1 ? 'none' : `1px solid ${COLORS.border}` }}>
                  <td style={{ padding: '0.8rem' }}><span style={{ color: registro.estado === 'abierto' ? '#166534' : COLORS.textMuted, fontWeight: '600' }}>{registro.estado === 'abierto' ? 'Abierta' : 'Cerrada'}</span></td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{new Date(registro.abierto_en).toLocaleString()}</td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>{registro.cerrado_en ? new Date(registro.cerrado_en).toLocaleString() : 'En curso'}</td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>${Number(registro.monto_apertura).toFixed(2)}</td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>${Number(registro.ventas_totales).toFixed(2)}</td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>${Number(registro.monto_final).toFixed(2)}</td>
                  <td style={{ padding: '0.8rem' }}>{registro.usuario_nombre || 'No disponible'}</td>
                </tr>)}
                {!cargandoHistorial && historial.length === 0 && !errorHistorial && <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textMuted }}>Todavía no hay turnos registrados.</td></tr>}
                {cargandoHistorial && <tr><td colSpan={7} style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textMuted }}>Cargando historial...</td></tr>}
              </tbody>
            </table>
          </div>
        </section>}
      </main>
    </div>
  );
}
