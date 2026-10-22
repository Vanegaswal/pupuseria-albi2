--
-- PostgreSQL database dump
--

\restrict uZFz6oxKZt3NfI3h0M4WB5DlsZBJ6a2dOwpcHqspLWgbFplRdGf94FKjesR2eLf

-- Dumped from database version 15.19 (Debian 15.19-1.pgdg13+2)
-- Dumped by pg_dump version 15.19 (Debian 15.19-1.pgdg13+2)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: categorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categorias (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    activa boolean DEFAULT true
);


--
-- Name: categorias_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categorias_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categorias_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categorias_id_seq OWNED BY public.categorias.id;


--
-- Name: detalles_pedido; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.detalles_pedido (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pedido_id uuid,
    producto_id integer,
    cantidad integer DEFAULT 1 NOT NULL,
    precio_unitario numeric(10,2) NOT NULL,
    subtotal numeric(10,2) NOT NULL,
    observaciones text,
    estado character varying(20) DEFAULT 'pendiente'::character varying
);


--
-- Name: insumos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.insumos (
    id integer NOT NULL,
    nombre character varying(100) NOT NULL,
    unidad_medida character varying(20) NOT NULL,
    cantidad_disponible numeric(10,2) DEFAULT 0.00,
    nivel_minimo numeric(10,2) DEFAULT 0.00,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: insumos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.insumos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: insumos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.insumos_id_seq OWNED BY public.insumos.id;


--
-- Name: mesas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.mesas (
    id integer NOT NULL,
    numero_mesa integer NOT NULL,
    codigo_qr character varying(255) NOT NULL,
    estado character varying(20) DEFAULT 'disponible'::character varying,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: mesas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.mesas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: mesas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.mesas_id_seq OWNED BY public.mesas.id;


--
-- Name: movimientos_inventario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movimientos_inventario (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    insumo_id integer,
    tipo character varying(20) NOT NULL,
    cantidad numeric(10,2) NOT NULL,
    motivo text,
    usuario_id uuid,
    fecha timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pedidos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    sesion_mesa_id uuid,
    usuario_id uuid,
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    origen character varying(20) DEFAULT 'qr'::character varying,
    total numeric(10,2) DEFAULT 0.00 NOT NULL,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    actualizado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tipo_pedido character varying(20) DEFAULT 'mesa'::character varying NOT NULL,
    CONSTRAINT pedidos_tipo_pedido_check CHECK (((tipo_pedido)::text = ANY ((ARRAY['mesa'::character varying, 'llevar'::character varying])::text[])))
);


--
-- Name: productos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.productos (
    id integer NOT NULL,
    categoria_id integer,
    nombre character varying(100) NOT NULL,
    descripcion text,
    precio numeric(10,2) NOT NULL,
    disponible boolean DEFAULT true,
    imagen_url character varying(255),
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: productos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.productos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: productos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.productos_id_seq OWNED BY public.productos.id;


--
-- Name: recetas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recetas (
    producto_id integer NOT NULL,
    insumo_id integer NOT NULL,
    cantidad_requerida numeric(10,4) NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    nombre character varying(50) NOT NULL,
    descripcion text
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: sesiones_mesa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sesiones_mesa (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    mesa_id integer,
    estado character varying(20) DEFAULT 'abierta'::character varying,
    total numeric(10,2) DEFAULT 0.00,
    abierta_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cerrada_en timestamp without time zone,
    turno_caja_id uuid,
    cliente_nombre character varying(100)
);


--
-- Name: turnos_caja; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.turnos_caja (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_id uuid,
    monto_apertura numeric(10,2) NOT NULL,
    monto_cierre_esperado numeric(10,2),
    monto_cierre_real numeric(10,2),
    estado character varying(20) DEFAULT 'abierto'::character varying,
    abierto_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cerrado_en timestamp without time zone
);


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombres character varying(100) NOT NULL,
    apellidos character varying(100) NOT NULL,
    usuario character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    rol_id integer,
    activo boolean DEFAULT true,
    creado_en timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: categorias id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias ALTER COLUMN id SET DEFAULT nextval('public.categorias_id_seq'::regclass);


--
-- Name: insumos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos ALTER COLUMN id SET DEFAULT nextval('public.insumos_id_seq'::regclass);


--
-- Name: mesas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas ALTER COLUMN id SET DEFAULT nextval('public.mesas_id_seq'::regclass);


--
-- Name: productos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos ALTER COLUMN id SET DEFAULT nextval('public.productos_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: categorias categorias_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_nombre_key UNIQUE (nombre);


--
-- Name: categorias categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categorias
    ADD CONSTRAINT categorias_pkey PRIMARY KEY (id);


--
-- Name: detalles_pedido detalles_pedido_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_pedido
    ADD CONSTRAINT detalles_pedido_pkey PRIMARY KEY (id);


--
-- Name: insumos insumos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_nombre_key UNIQUE (nombre);


--
-- Name: insumos insumos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.insumos
    ADD CONSTRAINT insumos_pkey PRIMARY KEY (id);


--
-- Name: mesas mesas_codigo_qr_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_codigo_qr_key UNIQUE (codigo_qr);


--
-- Name: mesas mesas_numero_mesa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_numero_mesa_key UNIQUE (numero_mesa);


--
-- Name: mesas mesas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.mesas
    ADD CONSTRAINT mesas_pkey PRIMARY KEY (id);


--
-- Name: movimientos_inventario movimientos_inventario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_pkey PRIMARY KEY (id);


--
-- Name: pedidos pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_pkey PRIMARY KEY (id);


--
-- Name: productos productos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_pkey PRIMARY KEY (id);


--
-- Name: recetas recetas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_pkey PRIMARY KEY (producto_id, insumo_id);


--
-- Name: roles roles_nombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_nombre_key UNIQUE (nombre);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: sesiones_mesa sesiones_mesa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_mesa
    ADD CONSTRAINT sesiones_mesa_pkey PRIMARY KEY (id);


--
-- Name: turnos_caja turnos_caja_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_caja
    ADD CONSTRAINT turnos_caja_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_usuario_key UNIQUE (usuario);


--
-- Name: idx_detalles_pedido; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_detalles_pedido ON public.detalles_pedido USING btree (pedido_id);


--
-- Name: idx_pedidos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_estado ON public.pedidos USING btree (estado);


--
-- Name: idx_pedidos_sesion; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pedidos_sesion ON public.pedidos USING btree (sesion_mesa_id);


--
-- Name: idx_sesiones_mesa_una_activa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_sesiones_mesa_una_activa ON public.sesiones_mesa USING btree (mesa_id) WHERE ((mesa_id IS NOT NULL) AND ((estado)::text = ANY ((ARRAY['abierta'::character varying, 'pidiendo_cuenta'::character varying])::text[])));


--
-- Name: idx_turnos_caja_uno_abierto; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_turnos_caja_uno_abierto ON public.turnos_caja USING btree (estado) WHERE ((estado)::text = 'abierto'::text);


--
-- Name: detalles_pedido detalles_pedido_pedido_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_pedido
    ADD CONSTRAINT detalles_pedido_pedido_id_fkey FOREIGN KEY (pedido_id) REFERENCES public.pedidos(id) ON DELETE CASCADE;


--
-- Name: detalles_pedido detalles_pedido_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.detalles_pedido
    ADD CONSTRAINT detalles_pedido_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE RESTRICT;


--
-- Name: movimientos_inventario movimientos_inventario_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE CASCADE;


--
-- Name: movimientos_inventario movimientos_inventario_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movimientos_inventario
    ADD CONSTRAINT movimientos_inventario_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: pedidos pedidos_sesion_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_sesion_mesa_id_fkey FOREIGN KEY (sesion_mesa_id) REFERENCES public.sesiones_mesa(id) ON DELETE CASCADE;


--
-- Name: pedidos pedidos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pedidos
    ADD CONSTRAINT pedidos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE SET NULL;


--
-- Name: productos productos_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.productos
    ADD CONSTRAINT productos_categoria_id_fkey FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE RESTRICT;


--
-- Name: recetas recetas_insumo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_insumo_id_fkey FOREIGN KEY (insumo_id) REFERENCES public.insumos(id) ON DELETE CASCADE;


--
-- Name: recetas recetas_producto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recetas
    ADD CONSTRAINT recetas_producto_id_fkey FOREIGN KEY (producto_id) REFERENCES public.productos(id) ON DELETE CASCADE;


--
-- Name: sesiones_mesa sesiones_mesa_mesa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_mesa
    ADD CONSTRAINT sesiones_mesa_mesa_id_fkey FOREIGN KEY (mesa_id) REFERENCES public.mesas(id) ON DELETE SET NULL;


--
-- Name: sesiones_mesa sesiones_mesa_turno_caja_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sesiones_mesa
    ADD CONSTRAINT sesiones_mesa_turno_caja_id_fkey FOREIGN KEY (turno_caja_id) REFERENCES public.turnos_caja(id);


--
-- Name: turnos_caja turnos_caja_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.turnos_caja
    ADD CONSTRAINT turnos_caja_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id);


--
-- Name: usuarios usuarios_rol_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_rol_id_fkey FOREIGN KEY (rol_id) REFERENCES public.roles(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict uZFz6oxKZt3NfI3h0M4WB5DlsZBJ6a2dOwpcHqspLWgbFplRdGf94FKjesR2eLf

