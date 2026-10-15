import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../../api/axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LayoutDashboard, Plus, Printer } from 'lucide-react';
import ConfirmModal from '../../components/ConfirmModal';

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function Mesas() {
  const [mesas, setMesas] = useState<any[]>([]);
  const [numeroMesa, setNumeroMesa] = useState('');
  const [modalConfig, setModalConfig] = useState<any>({ isOpen: false });
  const navigate = useNavigate();
  const menuBaseUrl = (import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin).replace(/\/+$/, '');

  const fetchMesas = async () => {
    try {
      const res = await api.get('/mesas');
      setMesas(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMesas(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/mesas', { numero_mesa: Number(numeroMesa) });
      setNumeroMesa('');
      fetchMesas();
    } catch (e) { console.error(e); }
  };

  const handlePrintQr = (mesa: any) => {
    const qrSvg = document.getElementById(`qr-mesa-${mesa.id}`)?.querySelector('svg');
    const printWindow = window.open('', '_blank', 'width=720,height=960');
    if (!qrSvg || !printWindow) {
      setModalConfig({
        isOpen: true,
        title: 'No se pudo abrir la impresión',
        message: 'Permite las ventanas emergentes e intenta imprimir nuevamente.',
        type: 'warning',
        hideCancel: true,
        onConfirm: () => setModalConfig({ isOpen: false })
      });
      return;
    }

    const escaparHTML = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character] ?? character));
    const mesaLabel = escaparHTML(mesa.numero_mesa);
    const menuUrl = escaparHTML(`${menuBaseUrl}/menu/${mesa.id}`);
    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>QR Mesa ${mesaLabel} - Pupusería Albi</title>
          <style>
            @page { size: A5 portrait; margin: 0; }
            * { box-sizing: border-box; }
            html, body { width: 148mm; height: 210mm; margin: 0; background: #fff; color: #102a43; font-family: Arial, sans-serif; }
            .sign { width: 100%; height: 100%; padding: 12mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; }
            .brand { margin: 0; color: #002855; font-size: 17pt; font-weight: 700; letter-spacing: 1px; }
            .mesa { margin: 8mm 0 0; color: #002855; font-size: 34pt; font-weight: 700; }
            .instruction { margin: 5mm 0 0; color: #334e68; font-size: 14pt; line-height: 1.4; }
            .qr { width: 112mm; height: 112mm; padding: 4mm; border: 1px solid #d9e2ec; }
            .qr svg { display: block; width: 100%; height: 100%; }
            .url { max-width: 100%; margin: 4mm 0 0; color: #52606d; font-size: 8pt; overflow-wrap: anywhere; }
            .footer { width: 100%; padding-top: 5mm; border-top: 1px solid #d9e2ec; color: #52606d; font-size: 9pt; }
            @media screen { body { margin: 16px auto; box-shadow: 0 2px 18px #0002; } }
          </style>
        </head>
        <body>
          <main class="sign">
            <header>
              <p class="brand">PUPUSERÍA ALBI</p>
              <h1 class="mesa">Mesa ${mesaLabel}</h1>
              <p class="instruction">Escanea este código para ver el menú<br />y realizar tu pedido.</p>
            </header>
            <div class="qr">${qrSvg.outerHTML}</div>
            <footer class="footer">
              <p>¡Gracias por visitarnos!</p>
              <p class="url">${menuUrl}</p>
            </footer>
          </main>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.addEventListener('afterprint', () => printWindow.close(), { once: true });
    printWindow.addEventListener('load', () => {
      printWindow.focus();
      printWindow.print();
    }, { once: true });
  };

  return (
    <div style={{ backgroundColor: COLORS.white, minHeight: '100vh', fontFamily: '"Inter", "Segoe UI", sans-serif', color: COLORS.navy }}>
      <ConfirmModal {...modalConfig} />
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.white, borderBottom: `1px solid ${COLORS.border}`, padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => navigate('/admin')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', backgroundColor: 'transparent', border: `1px solid ${COLORS.border}`, borderRadius: '8px', cursor: 'pointer', color: COLORS.navy }}>
            <ArrowLeft size={18} />
          </button>
          <LayoutDashboard size={24} color={COLORS.navy} strokeWidth={1.5} />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '500' }}>Gestión de Mesas y QR</h2>
        </div>
      </header>

      <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ backgroundColor: COLORS.white, padding: '1.5rem', borderRadius: '8px', border: `1px solid ${COLORS.navy}`, marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Agregar Nueva Mesa</h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.textMuted }}>Crea una mesa para generar su código QR único.</p>
          </div>
          <form onSubmit={handleCreate} style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="number" 
              placeholder="Número ej. 5" 
              value={numeroMesa} 
              onChange={(e) => setNumeroMesa(e.target.value)} 
              required 
              style={{ padding: '0.6rem 1rem', borderRadius: '6px', border: `1px solid ${COLORS.border}`, outline: 'none', width: '120px', color: COLORS.navy }}
            />
            <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
              <Plus size={16} />
              Crear
            </button>
          </form>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.5rem' }}>
          {mesas.map(mesa => (
            <div key={mesa.id} style={{ backgroundColor: COLORS.white, border: `1px solid ${COLORS.border}`, padding: '1.5rem', borderRadius: '8px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', fontWeight: '500' }}>Mesa {mesa.numero_mesa}</h3>
              
              <div id={`qr-mesa-${mesa.id}`} style={{ padding: '1rem', border: `1px solid ${COLORS.border}`, borderRadius: '8px', marginBottom: '1.5rem' }}>
                <QRCodeSVG value={`${menuBaseUrl}/menu/${mesa.id}`} size={140} fgColor={COLORS.navy} />
              </div>

              <button onClick={() => handlePrintQr(mesa)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.65rem 0.8rem', marginBottom: '1rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '500' }}>
                <Printer size={16} /> Imprimir QR
              </button>
              
              <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: `1px solid ${COLORS.border}`, paddingTop: '1rem', marginTop: 'auto' }}>
                <span style={{ fontSize: '0.85rem', color: COLORS.textMuted }}>Estado: </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '500', color: COLORS.navy }}>
                  {mesa.estado.charAt(0).toUpperCase() + mesa.estado.slice(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
