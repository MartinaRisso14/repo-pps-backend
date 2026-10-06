ALTER TABLE public.empleados
  ADD COLUMN IF NOT EXISTS tipodocumento character varying(20) NOT NULL DEFAULT 'DNI';
