import { useEffect, useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Pencil, Plus, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ConfirmModal from '../../components/ConfirmModal';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

type Category = { id: number; nombre: string; activa: boolean };
type Product = {
  id: number;
  categoria_id: number;
  categoria_nombre: string;
  categoria_activa: boolean;
  nombre: string;
  descripcion: string | null;
  precio: number | string;
  disponible: boolean;
};
type ProductForm = { id?: number; nombre: string; descripcion: string; precio: string; categoria_id: string };

const EMPTY_FORM: ProductForm = { nombre: '', descripcion: '', precio: '', categoria_id: '' };

export default function MenuAdmin() {
  const [categorias, setCategorias] = useState<Category[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
  const navigate = useNavigate();

  const cargarCatalogo = async () => {
    setCargando(true);
    try {
      const response = await api.get('/productos/admin/catalogo');
      setCategorias(response.data.categorias);
      setProductos(response.data.productos);
      setError('');
    } catch (requestError: any) {
      setError(requestError.response?.data?.message || 'No se pudo cargar el menú.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarCatalogo(); }, []);

  const mostrarResultado = (title: string, message: string, type: 'success' | 'warning' = 'success') => {
    setModalConfig({ isOpen: true, title, message, type, hideCancel: true, onConfirm: () => setModalConfig({ isOpen: false }) });
  };

  const guardarProducto = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio),
      categoria_id: Number(form.categoria_id)
    };
    if (!payload.nombre || !Number.isFinite(payload.precio) || payload.precio <= 0 || !payload.categoria_id) {
      mostrarResultado('Revisa los datos', 'Ingresa nombre, categoría y un precio mayor que cero.', 'warning');
      return;
    }

    setGuardando(true);
    try {
      if (form.id) {
        await api.put(`/productos/${form.id}`, payload);
        setForm(EMPTY_FORM);
        await cargarCatalogo();
        mostrarResultado('Producto actualizado', 'El cambio ya se refleja en los menús de todas las mesas.');
      } else {
        await api.post('/productos', payload);
        setForm(EMPTY_FORM);
        await cargarCatalogo();
        mostrarResultado('Producto agregado', 'El producto ya está disponible en los menús de todas las mesas.');
      }
    } catch (requestError: any) {
      mostrarResultado('No se pudo guardar', requestError.response?.data?.message || 'Verifica los datos e intenta nuevamente.', 'warning');
    } finally {
      setGuardando(false);
    }
  };

  const editarProducto = (product: Product) => {
    setForm({
      id: product.id,
      nombre: product.nombre,
      descripcion: product.descripcion || '',
      precio: String(product.precio),
      categoria_id: String(product.categoria_id)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cambiarDisponibilidad = (product: Product) => {
    const disponible = !product.disponible;
    setModalConfig({
      isOpen: true,
      title: disponible ? 'Volver a publicar producto' : 'Retirar producto del menú',
      message: disponible
        ? `¿Quieres volver a mostrar “${product.nombre}” en todos los menús?`
        : `“${product.nombre}” dejará de aparecer en todos los menús. Los pedidos anteriores se conservarán.`,
      confirmText: disponible ? 'Publicar' : 'Retirar',
      onCancel: () => setModalConfig({ isOpen: false }),
      onConfirm: async () => {
        try {
          await api.patch(`/productos/${product.id}/disponibilidad`, { disponible });
          await cargarCatalogo();
          mostrarResultado(disponible ? 'Producto publicado' : 'Producto retirado', 'Los menús de todas las mesas ya tienen el cambio.');
        } catch (requestError: any) {
          mostrarResultado('No se pudo actualizar', requestError.response?.data?.message || 'Intenta nuevamente.', 'warning');
        }
      }
    });
  };

  const crearCategoria = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      await api.post('/productos/categorias', { nombre: nuevaCategoria.trim() });
      setNuevaCategoria('');
      await cargarCatalogo();
      mostrarResultado('Categoría agregada', 'Ya puedes asignarle productos.');
    } catch (requestError: any) {
      mostrarResultado('No se pudo crear la categoría', requestError.response?.data?.message || 'Intenta nuevamente.', 'warning');
    }
  };

  const cambiarEstadoCategoria = (category: Category) => {
    const activa = !category.activa;
    setModalConfig({
      isOpen: true,
      title: activa ? 'Activar categoría' : 'Ocultar categoría',
      message: activa
        ? `¿Quieres mostrar de nuevo la categoría “${category.nombre}” y sus productos disponibles?`
        : `La categoría “${category.nombre}” y sus productos dejarán de mostrarse en todos los menús.`,
      confirmText: activa ? 'Activar' : 'Ocultar',
      onCancel: () => setModalConfig({ isOpen: false }),
      onConfirm: async () => {
        try {
          await api.patch(`/productos/categorias/${category.id}/estado`, { activa });
          await cargarCatalogo();
          mostrarResultado('Categoría actualizada', 'El cambio ya se refleja en los menús de todas las mesas.');
        } catch (requestError: any) {
          mostrarResultado('No se pudo actualizar', requestError.response?.data?.message || 'Intenta nuevamente.', 'warning');
        }
      }
    });
  };

  const inputStyle = { width: '100%', boxSizing: 'border-box' as const, marginTop: '0.35rem', padding: '0.7rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, backgroundColor: COLORS.white };
  const buttonStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', padding: '0.6rem 0.8rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', background: COLORS.white, color: COLORS.navy, cursor: 'pointer' };
  const categoriasActivas = categorias.filter(category => category.activa);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: COLORS.white, color: COLORS.navy, fontFamily: '"Inter", "Segoe UI", sans-serif' }}>
      <ConfirmModal {...modalConfig} />
      <header className="module-header" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 2rem', borderBottom: `1px solid ${COLORS.border}` }}>
        <button onClick={() => navigate('/admin')} aria-label="Regresar al panel" title="Regresar al panel" style={{ ...buttonStyle, width: '38px', height: '38px', padding: 0 }}><ArrowLeft size={18} /></button>
        <h1 style={{ margin: 0, fontSize: '1.25rem', color: COLORS.navy }}>Gestión del menú</h1>
      </header>

      <main className="page-content" style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem', boxSizing: 'border-box' }}>
        {error && <div role="alert" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '1rem', marginBottom: '1rem', color: '#9f2d2d', backgroundColor: '#fff1f0', border: '1px solid #f2c7c3', borderRadius: '6px' }}>
          <span>{error}</span><button onClick={cargarCatalogo} style={{ ...buttonStyle, color: '#7f1d1d' }}>Reintentar</button>
        </div>}

        <section style={{ marginBottom: '1.5rem', padding: '1.25rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 1rem', color: COLORS.navy, fontSize: '1.05rem' }}>{form.id ? `Editar: ${form.nombre}` : 'Agregar plato o pupusa'}</h2>
          <form onSubmit={guardarProducto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', alignItems: 'end' }}>
            <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Nombre
              <input required maxLength={100} value={form.nombre} onChange={event => setForm(current => ({ ...current, nombre: event.target.value }))} placeholder="Pupusa de queso" style={inputStyle} />
            </label>
            <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Categoría
              <select required value={form.categoria_id} onChange={event => setForm(current => ({ ...current, categoria_id: event.target.value }))} style={inputStyle}>
                <option value="">Seleccionar</option>
                {categoriasActivas.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
              </select>
            </label>
            <label style={{ color: COLORS.navy, fontSize: '0.9rem' }}>Precio ($)
              <input required type="number" min="0.01" step="0.01" value={form.precio} onChange={event => setForm(current => ({ ...current, precio: event.target.value }))} placeholder="0.75" style={inputStyle} />
            </label>
            <label style={{ color: COLORS.navy, fontSize: '0.9rem', gridColumn: '1 / -1' }}>Descripción
              <textarea maxLength={1000} rows={2} value={form.descripcion} onChange={event => setForm(current => ({ ...current, descripcion: event.target.value }))} placeholder="Ingredientes o descripción del plato" style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', gridColumn: '1 / -1' }}>
              <button type="submit" disabled={guardando || categoriasActivas.length === 0} style={{ ...buttonStyle, backgroundColor: COLORS.navy, color: COLORS.white, borderColor: COLORS.navy, opacity: guardando || categoriasActivas.length === 0 ? 0.6 : 1 }}>
                {form.id ? <Save size={16} /> : <Plus size={16} />}{guardando ? 'Guardando...' : form.id ? 'Guardar cambios' : 'Agregar al menú'}
              </button>
              {form.id && <button type="button" onClick={() => setForm(EMPTY_FORM)} style={buttonStyle}><X size={16} /> Cancelar edición</button>}
            </div>
          </form>
          {categoriasActivas.length === 0 && <p style={{ margin: '0.75rem 0 0', color: COLORS.textMuted }}>Agrega o activa una categoría para poder crear productos.</p>}
        </section>

        <section style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
          <h2 style={{ margin: '0 0 0.75rem', color: COLORS.navy, fontSize: '1.05rem' }}>Categorías</h2>
          <form className="category-form" onSubmit={crearCategoria} style={{ display: 'flex', gap: '0.6rem', maxWidth: '520px' }}>
            <input required maxLength={100} value={nuevaCategoria} onChange={event => setNuevaCategoria(event.target.value)} placeholder="Nueva categoría" style={{ ...inputStyle, marginTop: 0 }} />
            <button type="submit" style={{ ...buttonStyle, backgroundColor: COLORS.navy, color: COLORS.white, borderColor: COLORS.navy, whiteSpace: 'nowrap' }}><Plus size={16} /> Agregar</button>
          </form>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.8rem' }}>
            {categorias.map(category => <div key={category.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.45rem 0.35rem 0.7rem', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: category.activa ? COLORS.navy : COLORS.textMuted }}>
              <span>{category.nombre}{!category.activa && ' (oculta)'}</span>
              <button onClick={() => cambiarEstadoCategoria(category)} aria-label={category.activa ? `Ocultar ${category.nombre}` : `Activar ${category.nombre}`} title={category.activa ? 'Ocultar categoría' : 'Activar categoría'} style={{ ...buttonStyle, padding: '0.35rem', border: 0 }}>
                {category.activa ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>)}
          </div>
        </section>

        <section>
          <h2 style={{ margin: '0 0 0.75rem', color: COLORS.navy, fontSize: '1.05rem' }}>Productos del catálogo</h2>
          <div className="table-scroll" style={{ overflowX: 'auto', border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
            <table style={{ width: '100%', minWidth: '760px', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: COLORS.navy, color: COLORS.white }}><tr>
                {['Producto', 'Categoría', 'Precio', 'Estado', 'Acciones'].map(label => <th key={label} style={{ padding: '0.8rem', fontSize: '0.85rem' }}>{label}</th>)}
              </tr></thead>
              <tbody>
                {productos.map((product, index) => <tr key={product.id} style={{ borderBottom: index === productos.length - 1 ? 'none' : `1px solid ${COLORS.border}`, opacity: product.disponible && product.categoria_activa ? 1 : 0.65 }}>
                  <td style={{ padding: '0.8rem' }}><strong style={{ display: 'block', color: COLORS.navy }}>{product.nombre}</strong>{product.descripcion && <span style={{ color: COLORS.textMuted, fontSize: '0.85rem' }}>{product.descripcion}</span>}</td>
                  <td style={{ padding: '0.8rem' }}>{product.categoria_nombre || 'Sin categoría'}</td>
                  <td style={{ padding: '0.8rem', whiteSpace: 'nowrap' }}>${Number(product.precio).toFixed(2)}</td>
                  <td style={{ padding: '0.8rem' }}>{!product.categoria_activa ? 'Categoría oculta' : product.disponible ? 'Publicado' : 'Retirado'}</td>
                  <td style={{ padding: '0.8rem' }}><div style={{ display: 'flex', gap: '0.45rem' }}>
                    <button onClick={() => editarProducto(product)} aria-label={`Editar ${product.nombre}`} title="Editar producto" style={buttonStyle}><Pencil size={15} /> Editar</button>
                    <button onClick={() => cambiarDisponibilidad(product)} style={buttonStyle}>{product.disponible ? <><EyeOff size={15} /> Retirar</> : <><Eye size={15} /> Publicar</>}</button>
                  </div></td>
                </tr>)}
                {!cargando && productos.length === 0 && <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textMuted }}>Aún no hay productos. Agrega el primero desde el formulario.</td></tr>}
                {cargando && <tr><td colSpan={5} style={{ padding: '1.5rem', textAlign: 'center', color: COLORS.textMuted }}>Cargando catálogo...</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
