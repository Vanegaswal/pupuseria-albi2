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

ALTER TABLE sesiones_mesa
    ADD COLUMN IF NOT EXISTS turno_caja_id UUID REFERENCES turnos_caja(id) ON DELETE SET NULL;
ALTER TABLE sesiones_mesa
    ADD COLUMN IF NOT EXISTS cliente_nombre VARCHAR(100);
ALTER TABLE pedidos
    ADD COLUMN IF NOT EXISTS tipo_pedido VARCHAR(20) NOT NULL DEFAULT 'mesa';
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'pedidos_tipo_pedido_check' AND conrelid = 'pedidos'::regclass
    ) THEN
        ALTER TABLE pedidos
            ADD CONSTRAINT pedidos_tipo_pedido_check CHECK (tipo_pedido IN ('mesa', 'llevar'));
    END IF;
END $$;

ALTER TABLE mesas DROP COLUMN IF EXISTS sesion_actual_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sesiones_mesa_una_activa
    ON sesiones_mesa(mesa_id)
    WHERE mesa_id IS NOT NULL AND estado IN ('abierta', 'pidiendo_cuenta');
CREATE UNIQUE INDEX IF NOT EXISTS idx_turnos_caja_uno_abierto
    ON turnos_caja(estado)
    WHERE estado = 'abierto';
