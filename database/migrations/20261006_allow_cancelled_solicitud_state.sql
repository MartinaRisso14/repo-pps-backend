ALTER TABLE public.solicitudes_modificacion
  DROP CONSTRAINT IF EXISTS solicitudes_modificacion_estado_check;

ALTER TABLE public.solicitudes_modificacion
  ADD CONSTRAINT solicitudes_modificacion_estado_check
  CHECK ((estado)::text = ANY (
    ARRAY['PENDIENTE'::character varying, 'APROBADA'::character varying,
          'RECHAZADA'::character varying, 'CANCELADA'::character varying]
  ));
