import { useEffect, useState } from 'react';
import { Minus, Package, Plus, X } from 'lucide-react';

type Product = {
  id: number;
  nombre: string;
  descripcion?: string | null;
  categoria_nombre?: string;
  precio: number | string;
};

type TakeoutItem = Product & { cantidad: number };

interface PedidoLlevarModalProps {
  isOpen: boolean;
  productos: Product[];
  enviando: boolean;
  onClose: () => void;
  onSubmit: (items: TakeoutItem[]) => Promise<boolean>;
}

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function PedidoLlevarModal({ isOpen, productos, enviando, onClose, onSubmit }: PedidoLlevarModalProps) {
  const [items, setItems] = useState<TakeoutItem[]>([]);

  useEffect(() => {
    if (!isOpen) setItems([]);
  }, [isOpen]);

  if (!isOpen) return null;

  const agregar = (producto: Product) => {
    setItems(current => {
      const existing = current.find(item => item.id === producto.id);
      if (existing) return current.map(item => item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      return [...current, { ...producto, cantidad: 1 }];
    });
  };

  const cambiarCantidad = (productoId: number, cambio: number) => {
    setItems(current => current
      .map(item => item.id === productoId ? { ...item, cantidad: item.cantidad + cambio } : item)
      .filter(item => item.cantidad > 0));
  };

  const total = items.reduce((sum, item) => sum + Number(item.precio) * item.cantidad, 0);
  const categorias = productos.reduce<Record<string, Product[]>>((result, producto) => {
    const categoria = producto.categoria_nombre || 'Menú';
    (result[categoria] ||= []).push(producto);
    return result;
  }, {});

  const enviar = async () => {
    if (!items.length || enviando) return;
    if (await onSubmit(items)) {
      setItems([]);
      onClose();
    }
  };

  return (
    <div role="presentation" onMouseDown={event => { if (event.target === event.currentTarget && !enviando) onClose(); }} style={{ position: 'fixed', inset: 0, zIndex: 120, padding: '1rem', backgroundColor: 'rgba(0, 24, 48, 0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <section role="dialog" aria-modal="true" aria-labelledby="pedido-llevar-title" style={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '760px', maxHeight: 'min(90vh, 820px)', overflow: 'hidden', backgroundColor: COLORS.white, color: COLORS.navy, borderRadius: '10px', boxShadow: '0 24px 70px rgba(0, 0, 0, 0.28)' }}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1.25rem', borderBottom: `1px solid ${COLORS.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
            <Package size={21} />
            <div>
              <h2 id="pedido-llevar-title" style={{ margin: 0, color: COLORS.navy, fontSize: '1.15rem' }}>Pedido para llevar</h2>
              <p style={{ margin: '0.2rem 0 0', color: COLORS.textMuted, fontSize: '0.85rem' }}>Se agregará a la cuenta activa de esta mesa</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={enviando} aria-label="Cerrar pedido para llevar" title="Cerrar" style={{ display: 'grid', placeItems: 'center', width: '36px', height: '36px', border: `1px solid ${COLORS.border}`, borderRadius: '6px', color: COLORS.navy, background: COLORS.white, cursor: 'pointer' }}><X size={18} /></button>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(250px, 0.8fr)', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ overflowY: 'auto', padding: '1rem 1.25rem', borderRight: `1px solid ${COLORS.border}` }}>
            {Object.entries(categorias).map(([categoria, productosCategoria]) => <section key={categoria} style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ margin: '0 0 0.4rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${COLORS.border}`, color: COLORS.navy, fontSize: '0.9rem' }}>{categoria}</h3>
              {productosCategoria.map(producto => <article key={producto.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.65rem 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: COLORS.navy, fontSize: '0.9rem' }}>{producto.nombre}</strong>
                  <span style={{ color: COLORS.textMuted, fontSize: '0.85rem' }}>${Number(producto.precio).toFixed(2)}</span>
                </div>
                <button type="button" onClick={() => agregar(producto)} aria-label={`Agregar ${producto.nombre}`} title="Agregar al pedido para llevar" style={{ flexShrink: 0, display: 'grid', placeItems: 'center', width: '36px', height: '36px', border: 0, borderRadius: '6px', color: COLORS.white, background: COLORS.navy, cursor: 'pointer' }}><Plus size={18} /></button>
              </article>)}
            </section>)}
          </div>

          <aside style={{ display: 'flex', flexDirection: 'column', minHeight: '250px', maxHeight: 'min(70vh, 650px)', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.75rem', color: COLORS.navy, fontSize: '0.95rem' }}>Este pedido</h3>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {!items.length && <p style={{ color: COLORS.textMuted, fontSize: '0.9rem' }}>Agrega productos para llevar.</p>}
              {items.map(item => <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '0.5rem', alignItems: 'center', padding: '0.65rem 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: 'block', color: COLORS.navy, fontSize: '0.85rem' }}>{item.nombre}</strong>
                  <span style={{ color: COLORS.textMuted, fontSize: '0.8rem' }}>${(Number(item.precio) * item.cantidad).toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <button type="button" onClick={() => cambiarCantidad(item.id, -1)} aria-label={`Quitar una ${item.nombre}`} style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', border: `1px solid ${COLORS.border}`, borderRadius: '5px', color: COLORS.navy, background: COLORS.white, cursor: 'pointer' }}><Minus size={14} /></button>
                  <span style={{ minWidth: '18px', textAlign: 'center', color: COLORS.navy }}>{item.cantidad}</span>
                  <button type="button" onClick={() => cambiarCantidad(item.id, 1)} aria-label={`Agregar una ${item.nombre}`} style={{ display: 'grid', placeItems: 'center', width: '28px', height: '28px', border: `1px solid ${COLORS.border}`, borderRadius: '5px', color: COLORS.navy, background: COLORS.white, cursor: 'pointer' }}><Plus size={14} /></button>
                </div>
              </div>)}
            </div>
            <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: COLORS.navy, fontWeight: '700' }}><span>Total</span><span>${total.toFixed(2)}</span></div>
              <button type="button" onClick={enviar} disabled={!items.length || enviando} style={{ width: '100%', padding: '0.75rem', border: 0, borderRadius: '6px', color: COLORS.white, background: COLORS.navy, cursor: !items.length || enviando ? 'not-allowed' : 'pointer', opacity: !items.length || enviando ? 0.55 : 1, fontWeight: '600' }}>{enviando ? 'Enviando...' : 'Anexar a la cuenta'}</button>
            </div>
          </aside>
        </div>
      </section>
      <style>{`@media(max-width:620px){[role="dialog"]>div{grid-template-columns:1fr!important;overflow:auto}[role="dialog"] aside{max-height:32vh!important;min-height:180px!important;border-top:1px solid ${COLORS.border}}}`}</style>
    </div>
  );
}
