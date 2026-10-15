import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { ReactElement } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Caja from './pages/Caja';
import Mesas from './pages/admin/Mesas';
import Inventario from './pages/admin/Inventario';
import MenuAdmin from './pages/admin/Menu';
import Estadisticas from './pages/admin/Estadisticas';
import MonitorMesas from './pages/MonitorMesas';
import Cocina from './pages/Cocina';
import MenuCliente from './pages/MenuCliente';
import './App.css';

const ProtectedRoute = ({ children, allowedRoles }: { children: ReactElement, allowedRoles?: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) return <Navigate to="/admin" replace />;

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['Administrador', 'Mesero', 'Cajero', 'Cocina']}>
          <Dashboard title="Panel Principal" />
        </ProtectedRoute>
      } />
      <Route path="/admin/mesas" element={
        <ProtectedRoute allowedRoles={['Administrador']}>
          <Mesas />
        </ProtectedRoute>
      } />
      <Route path="/admin/inventario" element={
        <ProtectedRoute allowedRoles={['Administrador']}>
          <Inventario />
        </ProtectedRoute>
      } />
      <Route path="/admin/menu" element={
        <ProtectedRoute allowedRoles={['Administrador']}>
          <MenuAdmin />
        </ProtectedRoute>
      } />
      <Route path="/admin/estadisticas" element={
        <ProtectedRoute allowedRoles={['Administrador']}>
          <Estadisticas />
        </ProtectedRoute>
      } />
      <Route path="/monitor" element={
        <ProtectedRoute allowedRoles={['Administrador', 'Mesero']}>
          <MonitorMesas />
        </ProtectedRoute>
      } />
      <Route path="/cocina" element={
        <ProtectedRoute allowedRoles={['Administrador', 'Cocina']}>
          <Cocina />
        </ProtectedRoute>
      } />
      <Route path="/caja" element={
        <ProtectedRoute allowedRoles={['Administrador', 'Cajero', 'Mesero']}>
          <Caja />
        </ProtectedRoute>
      } />
      <Route path="/menu/:mesaId" element={<MenuCliente />} />
      <Route path="/menu" element={<MenuCliente />} />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
