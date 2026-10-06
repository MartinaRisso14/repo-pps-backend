INSERT INTO public.funciones (funcion)
SELECT catalogo.funcion
FROM (VALUES
  ('OPERARIO'),
  ('MAESTRANZA'),
  ('CHOFER'),
  ('GUARDAVIDA'),
  ('GUARDAPARQUES'),
  ('GUIAS TURISTICOS'),
  ('INSPECTOR'),
  ('PROFESIONAL DE SALUD'),
  ('DOCENTE'),
  ('PROFESIONAL INFORMATICO'),
  ('PROFESIONAL EN GENERAL'),
  ('TECNICOS EN GRAL'),
  ('PERSONAL DE SEGURIDAD'),
  ('CAJERO'),
  ('JUEZ'),
  ('FISCAL'),
  ('CONCEJAL')
) AS catalogo(funcion)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.funciones existente
  WHERE LOWER(TRIM(existente.funcion)) = LOWER(TRIM(catalogo.funcion))
);
