import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import { ArrowLeft, PackageSearch, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Inventario() {
  const [insumos, setInsumos] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [nuevoInsumo, setNuevoInsumo] = useState({ nombre: '', unidad_medida: '', cantidad_disponible: '0', nivel_minimo: '0' });
  const ajusteInput = useRef<HTMLInputElement>(null);
  const motivoInput = useRef<HTMLInputElement>(null);
  const tipoAjusteRef = useRef<'agregar' | 'descontar'>('agregar');
  const [insumoEnAjuste, setInsumoEnAjuste] = useState<any>(null);
  const [tipoAjuste, setTipoAjuste] = useState<'agregar' | 'descontar'>('agregar');
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
  const navigate = useNavigate();

  const fetchInsumos = async () => {
    try {
      const res = await api.get('/inventario');
      setInsumos(res.data);
      setErrorCarga('');
    } catch (e) {
      console.error(e);
      setErrorCarga('No se pudo cargar el inventario. Verifica la conexión e intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { fetchInsumos(); }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      await api.post('/inventario', {
        nombre: nuevoInsumo.nombre.trim(),
        unidad_medida: nuevoInsumo.unidad_medida.trim(),
        cantidad_disponible: Number(nuevoInsumo.cantidad_disponible),
        nivel_minimo: Number(nuevoInsumo.nivel_minimo)
      });
      setNuevoInsumo({ nombre: '', unidad_medida: '', cantidad_disponible: '0', nivel_minimo: '0' });
      await fetchInsumos();
      setModalConfig({ isOpen: true, title: 'Insumo creado', message: 'El insumo y su existencia inicial se registraron correctamente.', type: 'success', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    } catch (error: any) {
      setModalConfig({ isOpen: true, title: 'No se pudo crear el insumo', message: error.response?.data?.message || 'Verifica los datos y vuelve a intentarlo.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    }
  };

  const handleAjuste = async (id: string, nombre: string, cantidad: number, motivo: string, tipo: 'agregar' | 'descontar') => {
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      setModalConfig({ isOpen: true, title: 'Cantidad inválida', message: 'Ingresa una cantidad mayor que cero.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
      return;
    }
    try {
      const motivoFinal = motivo.trim() || (tipo === 'agregar' ? 'Entrada de inventario' : 'Salida de inventario');
      await api.post(`/inventario/${id}/ajustar`, { cantidad, tipo, motivo: motivoFinal });
      await fetchInsumos();
      setInsumoEnAjuste(null);
      setModalConfig({ isOpen: true, title: 'Inventario actualizado', message: `El ajuste de ${nombre} se guardó correctamente.`, type: 'success', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    } catch (error: any) {
      setInsumoEnAjuste(null);
      setModalConfig({ isOpen: true, title: 'No se pudo ajustar', message: error.response?.data?.message || 'Ocurrió un error al actualizar el inventario.', type: 'warning', hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <ConfirmModal {...modalConfig}>
        {insumoEnAjuste && modalConfig.isOpen && <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ padding: '0.75rem', backgroundColor: '#f8fafc', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy }}>
            Existencia actual: <strong>{Number(insumoEnAjuste.cantidad_disponible).toFixed(2)} {insumoEnAjuste.unidad_medida}</strong>
          </div>
          <div role="group" aria-label="Tipo de movimiento" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button type="button" aria-pressed={tipoAjuste === 'agregar'} onClick={() => { tipoAjusteRef.current = 'agregar'; setTipoAjuste('agregar'); }} style={{ padding: '0.7rem', border: `1px solid ${tipoAjuste === 'agregar' ? COLORS.navy : COLORS.border}`, borderRadius: '6px', backgroundColor: tipoAjuste === 'agregar' ? COLORS.navy : COLORS.white, color: tipoAjuste === 'agregar' ? COLORS.white : COLORS.navy, cursor: 'pointer', fontWeight: '600' }}>Agregar</button>
            <button type="button" aria-pressed={tipoAjuste === 'descontar'} onClick={() => { tipoAjusteRef.current = 'descontar'; setTipoAjuste('descontar'); }} style={{ padding: '0.7rem', border: `1px solid ${tipoAjuste === 'descontar' ? '#b91c1c' : COLORS.border}`, borderRadius: '6px', backgroundColor: tipoAjuste === 'descontar' ? '#b91c1c' : COLORS.white, color: tipoAjuste === 'descontar' ? COLORS.white : COLORS.navy, cursor: 'pointer', fontWeight: '600' }}>Descontar</button>
          </div>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Cantidad a {tipoAjuste === 'agregar' ? 'agregar' : 'descontar'}
            <input ref={ajusteInput} key={insumoEnAjuste.id} type="number" min="0.01" step="0.01" defaultValue="" placeholder={`Cantidad en ${insumoEnAjuste.unidad_medida}`} aria-label="Cantidad del movimiento" style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', marginTop: '0.35rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Motivo (opcional)
            <input ref={motivoInput} key={`motivo-${insumoEnAjuste.id}`} type="text" defaultValue="" aria-label="Motivo del movimiento" placeholder={tipoAjuste === 'agregar' ? 'Ej. Compra de insumos' : 'Ej. Merma o consumo'} style={{ width: '100%', boxSizing: 'border-box', padding: '0.7rem', marginTop: '0.35rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
        </div>}
      </ConfirmModal>
      <header className="module-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.navy }}>
            <ArrowLeft size={18} />
          </button>
          <PackageSearch size={24} color={COLORS.navy} strokeWidth={1.5} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Control de Inventario</h2>
        </div>
      </header>

      <div className="page-content" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', alignItems: 'end', padding: '1.25rem', marginBottom: '1.25rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Insumo
            <input required maxLength={100} value={nuevoInsumo.nombre} onChange={event => setNuevoInsumo(current => ({ ...current, nombre: event.target.value }))} placeholder="Nombre del insumo" style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.35rem', padding: '0.65rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Unidad de medida
            <input required maxLength={20} value={nuevoInsumo.unidad_medida} onChange={event => setNuevoInsumo(current => ({ ...current, unidad_medida: event.target.value }))} placeholder="kg, unidad, litro..." style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.35rem', padding: '0.65rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Existencia inicial
            <input type="number" min="0" step="0.01" value={nuevoInsumo.cantidad_disponible} onChange={event => setNuevoInsumo(current => ({ ...current, cantidad_disponible: event.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.35rem', padding: '0.65rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
          <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Nivel mínimo
            <input type="number" min="0" step="0.01" value={nuevoInsumo.nivel_minimo} onChange={event => setNuevoInsumo(current => ({ ...current, nivel_minimo: event.target.value }))} style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: '0.35rem', padding: '0.65rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white }} />
          </label>
          <button type="submit" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', padding: '0.7rem 1rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', cursor: 'pointer' }}><Plus size={16} /> Agregar insumo</button>
        </form>

        {errorCarga && <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem', marginBottom: '1rem', color: '#9f2d2d', backgroundColor: '#fff1f0', border: '1px solid #f2c7c3', borderRadius: '6px' }}>
          <span>{errorCarga}</span>
          <button onClick={fetchInsumos} style={{ color: '#7f1d1d', background: 'transparent', border: 0, textDecoration: 'underline', cursor: 'pointer' }}>Reintentar</button>
        </div>}

        <div className="table-scroll" style={{ backgroundColor: COLORS.white, borderRadius: '8px', border: `1px solid ${COLORS.border}`, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: COLORS.navy, color: COLORS.white, textAlign: 'left' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Insumo</th>
                <th style={{ padding: '1rem' }}>Unidad</th>
                <th style={{ padding: '1rem' }}>Disponible</th>
                <th style={{ padding: '1rem' }}>Nivel Mínimo</th>
                <th style={{ padding: '1rem' }}>Estado</th>
                <th style={{ padding: '1rem' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((item, idx) => {
                const isBajo = Number(item.cantidad_disponible) <= Number(item.nivel_minimo);
                return (
                  <tr key={item.id} style={{ borderBottom: idx === insumos.length - 1 ? 'none' : `1px solid ${COLORS.border}` }}>
                    <td style={{ padding: '1rem', fontWeight: '500' }}>{item.nombre}</td>
                    <td style={{ padding: '1rem', color: COLORS.textMuted }}>{item.unidad_medida}</td>
                    <td style={{ padding: '1rem', fontWeight: '600' }}>{Number(item.cantidad_disponible).toFixed(2)}</td>
                    <td style={{ padding: '1rem', color: COLORS.textMuted }}>{item.nivel_minimo}</td>
                    <td style={{ padding: '1rem' }}>
                      {isBajo ?
                        <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '0.9rem' }}>Bajo Stock</span> : 
                        <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '0.9rem' }}>Óptimo</span>
                      }
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <button 
                        onClick={() => {
                          setModalConfig({
                            isOpen: true,
                            title: `Ajustar ${item.nombre}`,
                            message: 'Selecciona la operación e ingresa cuántas unidades deseas mover.',
                            confirmText: 'Guardar movimiento',
                            onConfirm: () => handleAjuste(item.id, item.nombre, Number(ajusteInput.current?.value ?? 0), motivoInput.current?.value ?? '', tipoAjusteRef.current),
                            onCancel: () => { setInsumoEnAjuste(null); setModalConfig({ isOpen: false }); }
                          });
                          setInsumoEnAjuste(item);
                          tipoAjusteRef.current = 'agregar';
                          setTipoAjuste('agregar');
                        }}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.8rem', backgroundColor: 'transparent', border: `1px solid ${COLORS.navy}`, color: COLORS.navy, borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}
                      >
                        <Plus size={14} /> Ajustar
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!cargando && insumos.length === 0 && !errorCarga && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: COLORS.textMuted }}>No hay insumos registrados</td></tr>
              )}
              {cargando && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: COLORS.textMuted }}>Cargando inventario...</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
