import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await api.post('/auth/login', { usuario, password });
      login(response.data.token, response.data.usuario);
      
      // Redirigir según rol
      const rol = response.data.usuario.rol;
      if (rol === 'Administrador') navigate('/admin');
      else if (rol === 'Cocina') navigate('/cocina');
      else navigate('/caja'); // Mesero/Cajero
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100svh', padding: '1.25rem', boxSizing: 'border-box', backgroundColor: '#edf4f0' }}>
      <div className="login-card" style={{ padding: '2.25rem', backgroundColor: '#ffffff', border: '1px solid #d6e3dc', borderTop: '4px solid #2f6f56', borderRadius: '8px', boxShadow: '0 18px 48px rgba(0, 40, 85, 0.10)', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }}>
        <h1 style={{ textAlign: 'center', margin: '0 0 0.5rem', color: '#002855', fontSize: '1.65rem', fontWeight: '700' }}>Pupusería Albi</h1>
        <p style={{ textAlign: 'center', margin: '0 0 1.75rem', color: '#52665d', fontSize: '0.95rem' }}>Acceso al sistema</p>
        {error && <div role="alert" style={{ color: '#9f2d2d', backgroundColor: '#fff1f0', border: '1px solid #f2c7c3', borderRadius: '6px', padding: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#193b5a', fontWeight: '600' }}>Usuario</label>
            <input 
              type="text" 
              value={usuario} 
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #b8cbc1', color: '#16324f', backgroundColor: '#ffffff', outlineColor: '#2f6f56' }}
              required 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#193b5a', fontWeight: '600' }}>Contraseña</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              style={{ width: '100%', boxSizing: 'border-box', padding: '0.75rem', borderRadius: '6px', border: '1px solid #b8cbc1', color: '#16324f', backgroundColor: '#ffffff', outlineColor: '#2f6f56' }}
              required 
            />
          </div>
          <button type="submit" style={{ marginTop: '0.35rem', padding: '0.8rem', backgroundColor: '#2f6f56', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '700' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}
