import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'success';
  onConfirm: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  hideCancel?: boolean;
  children?: ReactNode;
}

const COLORS = {
  navy: '#002855',
  white: '#ffffff',
  border: '#e2e8f0',
  textMuted: '#475569'
};

export default function ConfirmModal({ isOpen, title, message, type = 'info', onConfirm, onCancel, confirmText = 'Aceptar', cancelText = 'Cancelar', hideCancel = false, children }: ModalProps) {
  if (!isOpen) return null;

  const Icon = type === 'warning' ? AlertCircle : (type === 'success' ? CheckCircle2 : Info);
  const iconColor = type === 'warning' ? '#ea580c' : (type === 'success' ? '#16a34a' : COLORS.navy);

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 40, 85, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(2px)', padding: '1rem' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title" style={{ backgroundColor: COLORS.white, borderRadius: '8px', padding: '1.5rem', width: '100%', maxWidth: '420px', border: `1px solid ${COLORS.border}`, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1rem' }}>
          <Icon size={28} color={iconColor} />
          <h2 id="confirm-modal-title" style={{ margin: 0, color: COLORS.navy, fontSize: '1.2rem', fontWeight: '600' }}>{title}</h2>
        </div>
        <p style={{ margin: '0 0 2rem 0', color: COLORS.textMuted, fontSize: '1rem', lineHeight: '1.5' }}>{message}</p>
        {children}
        
        <div className="modal-actions" style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
          {!hideCancel && (
            <button onClick={onCancel} style={{ padding: '0.6rem 1.2rem', backgroundColor: COLORS.white, color: COLORS.navy, border: `1px solid ${COLORS.navy}`, borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
              {cancelText}
            </button>
          )}
          <button onClick={onConfirm} style={{ padding: '0.6rem 1.2rem', backgroundColor: COLORS.navy, color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer', fontSize: '0.95rem' }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
