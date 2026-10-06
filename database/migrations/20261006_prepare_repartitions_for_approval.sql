CREATE SEQUENCE IF NOT EXISTS public.reparticiones_idreparticion_seq;

ALTER SEQUENCE public.reparticiones_idreparticion_seq
  OWNED BY public.reparticiones.idreparticion;

ALTER TABLE public.reparticiones
  ALTER COLUMN idreparticion
  SET DEFAULT nextval('public.reparticiones_idreparticion_seq'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reparticiones_nombre_normalizado
  ON public.reparticiones (LOWER(TRIM(nombre)));

SELECT setval(
  'public.reparticiones_idreparticion_seq',
  COALESCE((SELECT MAX(idreparticion) FROM public.reparticiones), 0) + 1,
  false
);
