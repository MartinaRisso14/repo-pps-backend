BEGIN;
--
-- PostgreSQL database dump
--

-- Dumped from database version 17.5
-- Dumped by pg_dump version 17.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: archivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.archivos (
    idarchivo integer NOT NULL,
    contenido bytea,
    tipoarchivo character varying(50),
    nombrearchivo character varying(255),
    fechacarga date DEFAULT CURRENT_DATE,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: archivos_idarchivo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.archivos_idarchivo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: archivos_idarchivo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.archivos_idarchivo_seq OWNED BY public.archivos.idarchivo;


--
-- Name: direcciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.direcciones (
    legajo integer NOT NULL,
    calle character varying(150),
    callenro character varying(20),
    barrio character varying(100),
    ciudad character varying(100),
    provincia character varying(100),
    tel1 character varying(50),
    tel2 character varying(50),
    email character varying(150),
    f_actualiz date,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: emp_cud; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.emp_cud (
    legajo integer NOT NULL,
    idcud integer NOT NULL,
    fechaemision date,
    fechavencimiento date,
    idarchivo integer,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: emp_cud_idcud_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.emp_cud_idcud_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: emp_cud_idcud_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.emp_cud_idcud_seq OWNED BY public.emp_cud.idcud;


--
-- Name: empestudios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empestudios (
    legajo integer NOT NULL,
    id_empestudios integer NOT NULL,
    codestudio character varying(20) NOT NULL,
    titulo character varying(150),
    f_graduado date,
    institucion character varying(150),
    ciudad character varying(100),
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: empestudios_id_empestudios_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.empestudios_id_empestudios_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: empestudios_id_empestudios_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.empestudios_id_empestudios_seq OWNED BY public.empestudios.id_empestudios;


--
-- Name: empleados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.empleados (
    legajo integer NOT NULL,
    apellido character varying(100),
    nombres character varying(100),
    nrodocumento character varying(20),
    f_nacimiento date,
    nacionalidad character varying(50),
    cuil character varying(20),
    estadocivil character varying(50),
    idfuncion integer,
    idreparticion integer,
    idarchivofoto integer,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer,
    tipodocumento character varying(20) DEFAULT 'DNI'::character varying NOT NULL,
    CONSTRAINT chk_estado_civil CHECK (((estadocivil)::text = ANY ((ARRAY['SOLTERO/A'::character varying, 'CASADO/A'::character varying, 'DIVORCIADO/A'::character varying, 'VIUDO/A'::character varying, 'UNION CONVIVENCIAL'::character varying])::text[])))
);


--
-- Name: estudios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estudios (
    codestudio character varying(20) NOT NULL,
    estudio character varying(150),
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: familiares; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.familiares (
    id_familiar integer NOT NULL,
    legajo integer NOT NULL,
    numfamiliar integer NOT NULL,
    apellido character varying(100),
    nombres character varying(100),
    parentesco character varying(50),
    discapacitado boolean,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer,
    tipodocumento character varying(10) DEFAULT 'DNI'::character varying,
    nrodocumento character varying(20),
    sexo character varying(15),
    f_nacimiento date
);


--
-- Name: familiares_id_familiar_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.familiares_id_familiar_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: familiares_id_familiar_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.familiares_id_familiar_seq OWNED BY public.familiares.id_familiar;


--
-- Name: funciones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.funciones (
    idfuncion integer NOT NULL,
    funcion character varying(100),
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: funciones_idfuncion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.funciones_idfuncion_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: funciones_idfuncion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.funciones_idfuncion_seq OWNED BY public.funciones.idfuncion;


--
-- Name: parentesco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parentesco (
    parentesco character varying(50) NOT NULL,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: reparticiones; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reparticiones (
    idreparticion integer NOT NULL,
    nombre character varying(150),
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: reparticiones_idreparticion_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reparticiones_idreparticion_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reparticiones_idreparticion_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reparticiones_idreparticion_seq OWNED BY public.reparticiones.idreparticion;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    idrol integer NOT NULL,
    descripcion character varying(100)
);


--
-- Name: roles_idrol_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_idrol_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_idrol_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_idrol_seq OWNED BY public.roles.idrol;


--
-- Name: solicitudes_modificacion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitudes_modificacion (
    id integer NOT NULL,
    usucodigo integer NOT NULL,
    datos_solicitados jsonb NOT NULL,
    estado character varying(20) DEFAULT 'PENDIENTE'::character varying,
    fecha_creacion timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    fecha_revision timestamp without time zone,
    revisado_por integer,
    motivo_rechazo text,
    CONSTRAINT solicitudes_modificacion_estado_check CHECK (((estado)::text = ANY ((ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying, 'RECHAZADA'::character varying, 'CANCELADA'::character varying])::text[])))
);


--
-- Name: solicitudes_modificacion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.solicitudes_modificacion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: solicitudes_modificacion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.solicitudes_modificacion_id_seq OWNED BY public.solicitudes_modificacion.id;


--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    usucodigo integer NOT NULL,
    usunombre character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    apenom character varying(150),
    idrol integer,
    estado character varying(20) DEFAULT 'AC'::character varying,
    email character varying(150),
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer,
    debe_cambiar_password boolean DEFAULT true
);


--
-- Name: usuarios_usucodigo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarios_usucodigo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_usucodigo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarios_usucodigo_seq OWNED BY public.usuarios.usucodigo;


--
-- Name: usuarioslegajos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarioslegajos (
    idusuariolegajo integer NOT NULL,
    usucodigo integer,
    legajo integer,
    estado character varying(20) DEFAULT 'AC'::character varying,
    fechamod timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    usuariomod integer
);


--
-- Name: usuarioslegajos_idusuariolegajo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usuarioslegajos_idusuariolegajo_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarioslegajos_idusuariolegajo_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usuarioslegajos_idusuariolegajo_seq OWNED BY public.usuarioslegajos.idusuariolegajo;


--
-- Name: archivos idarchivo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivos ALTER COLUMN idarchivo SET DEFAULT nextval('public.archivos_idarchivo_seq'::regclass);


--
-- Name: emp_cud idcud; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_cud ALTER COLUMN idcud SET DEFAULT nextval('public.emp_cud_idcud_seq'::regclass);


--
-- Name: empestudios id_empestudios; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empestudios ALTER COLUMN id_empestudios SET DEFAULT nextval('public.empestudios_id_empestudios_seq'::regclass);


--
-- Name: familiares id_familiar; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familiares ALTER COLUMN id_familiar SET DEFAULT nextval('public.familiares_id_familiar_seq'::regclass);


--
-- Name: funciones idfuncion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funciones ALTER COLUMN idfuncion SET DEFAULT nextval('public.funciones_idfuncion_seq'::regclass);


--
-- Name: reparticiones idreparticion; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reparticiones ALTER COLUMN idreparticion SET DEFAULT nextval('public.reparticiones_idreparticion_seq'::regclass);


--
-- Name: roles idrol; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN idrol SET DEFAULT nextval('public.roles_idrol_seq'::regclass);


--
-- Name: solicitudes_modificacion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_modificacion ALTER COLUMN id SET DEFAULT nextval('public.solicitudes_modificacion_id_seq'::regclass);


--
-- Name: usuarios usucodigo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios ALTER COLUMN usucodigo SET DEFAULT nextval('public.usuarios_usucodigo_seq'::regclass);


--
-- Name: usuarioslegajos idusuariolegajo; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarioslegajos ALTER COLUMN idusuariolegajo SET DEFAULT nextval('public.usuarioslegajos_idusuariolegajo_seq'::regclass);


--
-- Name: archivos pk_archivos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.archivos
    ADD CONSTRAINT pk_archivos PRIMARY KEY (idarchivo);


--
-- Name: direcciones pk_direcciones; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT pk_direcciones PRIMARY KEY (legajo);


--
-- Name: emp_cud pk_emp_cud; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_cud
    ADD CONSTRAINT pk_emp_cud PRIMARY KEY (idcud);


--
-- Name: empestudios pk_empestudios; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empestudios
    ADD CONSTRAINT pk_empestudios PRIMARY KEY (id_empestudios);


--
-- Name: empleados pk_empleados; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT pk_empleados PRIMARY KEY (legajo);


--
-- Name: estudios pk_estudios; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estudios
    ADD CONSTRAINT pk_estudios PRIMARY KEY (codestudio);


--
-- Name: familiares pk_familiares; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familiares
    ADD CONSTRAINT pk_familiares PRIMARY KEY (id_familiar);


--
-- Name: funciones pk_funciones; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.funciones
    ADD CONSTRAINT pk_funciones PRIMARY KEY (idfuncion);


--
-- Name: parentesco pk_parentesco; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT pk_parentesco PRIMARY KEY (parentesco);


--
-- Name: reparticiones pk_reparticiones; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reparticiones
    ADD CONSTRAINT pk_reparticiones PRIMARY KEY (idreparticion);


--
-- Name: roles pk_roles; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT pk_roles PRIMARY KEY (idrol);


--
-- Name: usuarios pk_usuarios; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT pk_usuarios PRIMARY KEY (usucodigo);


--
-- Name: usuarioslegajos pk_usuarioslegajos; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarioslegajos
    ADD CONSTRAINT pk_usuarioslegajos PRIMARY KEY (idusuariolegajo);


--
-- Name: solicitudes_modificacion solicitudes_modificacion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_modificacion
    ADD CONSTRAINT solicitudes_modificacion_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_usunombre_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_usunombre_key UNIQUE (usunombre);


--
-- Name: uq_reparticiones_nombre_normalizado; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_reparticiones_nombre_normalizado ON public.reparticiones USING btree (lower(TRIM(BOTH FROM nombre)));


--
-- Name: direcciones fk_direcciones_empleados; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.direcciones
    ADD CONSTRAINT fk_direcciones_empleados FOREIGN KEY (legajo) REFERENCES public.empleados(legajo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: emp_cud fk_emp_cud_archivos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_cud
    ADD CONSTRAINT fk_emp_cud_archivos FOREIGN KEY (idarchivo) REFERENCES public.archivos(idarchivo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: emp_cud fk_emp_cud_empleados; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.emp_cud
    ADD CONSTRAINT fk_emp_cud_empleados FOREIGN KEY (legajo) REFERENCES public.empleados(legajo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: empestudios fk_empestudios_empleados; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empestudios
    ADD CONSTRAINT fk_empestudios_empleados FOREIGN KEY (legajo) REFERENCES public.empleados(legajo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: empestudios fk_empestudios_estudios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empestudios
    ADD CONSTRAINT fk_empestudios_estudios FOREIGN KEY (codestudio) REFERENCES public.estudios(codestudio) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: empleados fk_empleados_archivos; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_archivos FOREIGN KEY (idarchivofoto) REFERENCES public.archivos(idarchivo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: empleados fk_empleados_funciones; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_funciones FOREIGN KEY (idfuncion) REFERENCES public.funciones(idfuncion) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: empleados fk_empleados_reparticiones; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.empleados
    ADD CONSTRAINT fk_empleados_reparticiones FOREIGN KEY (idreparticion) REFERENCES public.reparticiones(idreparticion) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: familiares fk_familiares_empleados; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familiares
    ADD CONSTRAINT fk_familiares_empleados FOREIGN KEY (legajo) REFERENCES public.empleados(legajo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: familiares fk_familiares_parentesco; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.familiares
    ADD CONSTRAINT fk_familiares_parentesco FOREIGN KEY (parentesco) REFERENCES public.parentesco(parentesco) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: usuarios fk_usuarios_roles; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT fk_usuarios_roles FOREIGN KEY (idrol) REFERENCES public.roles(idrol) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: usuarioslegajos fk_usuarioslegajos_empleados; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarioslegajos
    ADD CONSTRAINT fk_usuarioslegajos_empleados FOREIGN KEY (legajo) REFERENCES public.empleados(legajo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: usuarioslegajos fk_usuarioslegajos_usuarios; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarioslegajos
    ADD CONSTRAINT fk_usuarioslegajos_usuarios FOREIGN KEY (usucodigo) REFERENCES public.usuarios(usucodigo) ON UPDATE RESTRICT ON DELETE RESTRICT;


--
-- Name: solicitudes_modificacion solicitudes_modificacion_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_modificacion
    ADD CONSTRAINT solicitudes_modificacion_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuarios(usucodigo);


--
-- Name: solicitudes_modificacion solicitudes_modificacion_usucodigo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitudes_modificacion
    ADD CONSTRAINT solicitudes_modificacion_usucodigo_fkey FOREIGN KEY (usucodigo) REFERENCES public.usuarios(usucodigo);


--
-- PostgreSQL database dump complete
--
COMMIT;
