# Esquema de la base de datos

Base PostgreSQL de Pupusería Albi. La relación de una mesa con sus sesiones se guarda únicamente en `sesiones_mesa.mesa_id`; no hay una segunda FK circular en `mesas`.

## Diagrama de relaciones

```mermaid
erDiagram
    ROLES o|--o{ USUARIOS : asigna
    USUARIOS o|--o{ TURNOS_CAJA : abre
    MESAS o|--o{ SESIONES_MESA : recibe
    TURNOS_CAJA o|--o{ SESIONES_MESA : registra_cobro
    SESIONES_MESA o|--o{ PEDIDOS : agrupa
    USUARIOS o|--o{ PEDIDOS : atiende
    CATEGORIAS o|--o{ PRODUCTOS : clasifica
    PEDIDOS o|--o{ DETALLES_PEDIDO : contiene
    PRODUCTOS o|--o{ DETALLES_PEDIDO : se_vende_como
    PRODUCTOS ||--o{ RECETAS : utiliza
    INSUMOS ||--o{ RECETAS : compone
    INSUMOS ||--o{ MOVIMIENTOS_INVENTARIO : registra
    USUARIOS o|--o{ MOVIMIENTOS_INVENTARIO : realiza

    ROLES {
        int id PK
        varchar nombre UK
        text descripcion
    }
    USUARIOS {
        uuid id PK
        int rol_id FK
        varchar nombres
        varchar apellidos
        varchar usuario UK
        varchar password_hash
        boolean activo
    }
    TURNOS_CAJA {
        uuid id PK
        uuid usuario_id FK
        numeric monto_apertura
        numeric monto_cierre_esperado
        numeric monto_cierre_real
        varchar estado
        timestamp abierto_en
        timestamp cerrado_en
    }
    MESAS {
        int id PK
        int numero_mesa UK
        varchar codigo_qr UK
        varchar estado
    }
    CATEGORIAS {
        int id PK
        varchar nombre UK
        boolean activa
    }
    PRODUCTOS {
        int id PK
        int categoria_id FK
        varchar nombre
        numeric precio
        boolean disponible
    }
    SESIONES_MESA {
        uuid id PK
        int mesa_id FK
        uuid turno_caja_id FK
        varchar cliente_nombre
        varchar estado
        numeric total
        timestamp abierta_en
        timestamp cerrada_en
    }
    PEDIDOS {
        uuid id PK
        uuid sesion_mesa_id FK
        uuid usuario_id FK
        varchar estado
        varchar origen
        numeric total
        timestamp creado_en
    }
    DETALLES_PEDIDO {
        uuid id PK
        uuid pedido_id FK
        int producto_id FK
        int cantidad
        numeric precio_unitario
        numeric subtotal
        text observaciones
    }
    INSUMOS {
        int id PK
        varchar nombre UK
        varchar unidad_medida
        numeric cantidad_disponible
        numeric nivel_minimo
    }
    RECETAS {
        int producto_id PK, FK
        int insumo_id PK, FK
        numeric cantidad_requerida
    }
    MOVIMIENTOS_INVENTARIO {
        uuid id PK
        int insumo_id FK
        uuid usuario_id FK
        varchar tipo
        numeric cantidad
        timestamp fecha
    }
```

`UK` significa índice/clave única; las dos columnas de `RECETAS` forman juntas su clave primaria.

## Relaciones

- Un rol puede asignarse a varios usuarios. La FK `usuarios.rol_id` admite `NULL` en el esquema actual.
- Una mesa acumula sesiones históricas. Solo puede tener una sesión activa (`abierta` o `pidiendo_cuenta`) a la vez.
- Una sesión agrupa pedidos y puede quedar asociada al turno de caja que la cobró.
- Cada pedido contiene detalles; cada detalle conserva el precio unitario aplicado al momento de la compra.
- Productos e insumos se relacionan muchos a muchos mediante `recetas`.
- Los movimientos registran entradas/salidas de insumos y, opcionalmente, el usuario que las realizó.
- Solo se permite un turno de caja con estado `abierto` a la vez.

Los importes `subtotal`, `pedidos.total` y `sesiones_mesa.total` se conservan como totales operativos. Se verificó que coinciden con la cantidad/precio y los registros hijos antes de aplicar los índices de integridad.

Nota: varias FK del esquema permiten `NULL`; por eso las relaciones opcionales se muestran con cardinalidad cero-o-uno. Si el negocio requiere que todo usuario tenga rol, todo pedido pertenezca a sesión, etc., esas columnas se pueden endurecer con `NOT NULL` después de confirmar que no haya filas sin relación.

## Ver el diagrama en pgAdmin

1. Conecta pgAdmin a la misma instancia, base de datos y esquema que usa el backend. La configuración está en `backend/.env`, en `DATABASE_URL`; no compartas esa cadena porque contiene credenciales.
2. En el árbol de pgAdmin expande **Servers → tu servidor → Databases → pupuseria_albi → Schemas → public → Tables**. Si no aparecen las tablas, clic derecho en **Tables → Refresh**.
3. Para visualizar relaciones, selecciona **Tools → ERD Tool**, agrega las tablas de `public` y acomódalas. pgAdmin dibuja las líneas a partir de sus foreign keys.
4. También puedes ejecutar las consultas siguientes desde **Tools → Query Tool** conectado a la base correcta.

### Listar columnas y tipos

```sql
SELECT
    table_name,
    ordinal_position,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### Listar claves foráneas y relaciones

```sql
SELECT
    tc.table_name AS tabla,
    kcu.column_name AS columna,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada,
    tc.constraint_name AS restriccion
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
 AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

## ¿Debo ejecutar el SQL?

La base configurada actualmente para el backend ya tiene las tablas y relaciones; la migración de normalización ya se ejecutó allí. Si pgAdmin apunta a esa misma base, **no ejecutes nada**: solo actualiza el árbol y consulta el esquema.

Si vas a preparar **otra base vacía**, ejecuta `database/schema.sql` primero y luego `backend/database-updates.sql`, una sola vez, conectado a la base de destino. Después ejecuta los scripts de roles/datos indicados en [la guía de publicación](GUIA_SUPABASE_VERCEL.md). La migración de actualización es repetible; aun así, verifica con cuidado el nombre de la base seleccionada antes de ejecutar SQL.
