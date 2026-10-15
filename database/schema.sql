-- schema.sql
-- Base de Datos Pupusería Albi

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Usuarios y Roles
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(50) UNIQUE NOT NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    usuario VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol_id INT REFERENCES roles(id) ON DELETE RESTRICT,
    activo BOOLEAN DEFAULT true,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS turnos_caja (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    monto_apertura DECIMAL(10,2) NOT NULL CHECK (monto_apertura >= 0),
    monto_cierre_esperado DECIMAL(10,2),
    monto_cierre_real DECIMAL(10,2),
    estado VARCHAR(20) NOT NULL DEFAULT 'abierto',
    abierto_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cerrado_en TIMESTAMP
);

-- 2. Mesas y Códigos QR
CREATE TABLE IF NOT EXISTS mesas (
    id SERIAL PRIMARY KEY,
    numero_mesa INT UNIQUE NOT NULL,
    codigo_qr VARCHAR(255) UNIQUE NOT NULL,
    estado VARCHAR(20) DEFAULT 'disponible',
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Menú y Productos
CREATE TABLE IF NOT EXISTS categorias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    activa BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    categoria_id INT REFERENCES categorias(id) ON DELETE RESTRICT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    disponible BOOLEAN DEFAULT true,
    imagen_url VARCHAR(255),
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Pedidos y Detalles
CREATE TABLE IF NOT EXISTS sesiones_mesa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mesa_id INT REFERENCES mesas(id) ON DELETE SET NULL,
    turno_caja_id UUID REFERENCES turnos_caja(id) ON DELETE SET NULL,
    cliente_nombre VARCHAR(100),
    estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
    total DECIMAL(10,2) DEFAULT 0.00,
    abierta_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    cerrada_en TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sesion_mesa_id UUID REFERENCES sesiones_mesa(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    tipo_pedido VARCHAR(20) NOT NULL DEFAULT 'mesa' CHECK (tipo_pedido IN ('mesa', 'llevar')),
    estado VARCHAR(20) DEFAULT 'pendiente',
    origen VARCHAR(20) DEFAULT 'qr',
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS detalles_pedido (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pedido_id UUID REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INT REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    observaciones TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente'
);

-- 5. Inventario e Insumos
CREATE TABLE IF NOT EXISTS insumos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    unidad_medida VARCHAR(20) NOT NULL,
    cantidad_disponible DECIMAL(10,2) DEFAULT 0.00,
    nivel_minimo DECIMAL(10,2) DEFAULT 0.00,
    actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS recetas (
    producto_id INT REFERENCES productos(id) ON DELETE CASCADE,
    insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
    cantidad_requerida DECIMAL(10,4) NOT NULL,
    PRIMARY KEY (producto_id, insumo_id)
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insumo_id INT REFERENCES insumos(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL,
    motivo TEXT,
    usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pedidos_sesion ON pedidos(sesion_mesa_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_detalles_pedido ON detalles_pedido(pedido_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sesiones_mesa_una_activa
    ON sesiones_mesa(mesa_id)
    WHERE mesa_id IS NOT NULL AND estado IN ('abierta', 'pidiendo_cuenta');
CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_caja_uno_abierto
    ON turnos_caja(estado)
    WHERE estado = 'abierto';
