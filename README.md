# Sistema de Legajo Único — API

API del Sistema de Legajo Único, construida con NestJS, TypeORM y PostgreSQL. La documentación funcional integral está en [`../frontend/DOCUMENTACION.md`](../frontend/DOCUMENTACION.md).

El DER complementario de la implementación y sus diferencias con el esquema recibido están en [`database/DIAGRAMA_ENTIDAD_RELACION.md`](./database/DIAGRAMA_ENTIDAD_RELACION.md).

## Despliegue

El archivo `render.yaml` propone Render con una base PostgreSQL vacía y aislada para datos ficticios. El comando de inicio de demostración crea el esquema solo cuando la base no tiene tablas, carga catálogos y genera cuentas con claves definidas como secretos del servicio (`DEMO_ADMIN_PASSWORD` y `DEMO_USER_PASSWORD`). No copia información de la base local. No uses este modo con una base institucional ni de producción.

Configurar en el proveedor las variables `DATABASE_URL` (PostgreSQL alojado), `DATABASE_SSL=true` cuando el proveedor requiera TLS con certificado confiable, `JWT_SECRET` (aleatorio y de al menos 32 caracteres), `CORS_ORIGINS` (origen HTTPS exacto del frontend) y `NODE_ENV=production`. El servidor escucha el puerto indicado por `PORT`. También se puede configurar la base mediante `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` y `DB_DATABASE`.

Comandos habituales del servicio Node: build `npm ci && npm run build`; inicio `npm run start:prod`. Aplicar las migraciones requeridas al esquema de la base antes de iniciar el servicio. No subir `.env` ni valores reales de secretos al repositorio.

Para una demo autocontenida en Railway, crear un PostgreSQL vacío y conectar sus `DATABASE_URL` y `DATABASE_SSL=false` al servicio de API. Configurar `DEMO_MODE=true`, `DEMO_SEED_ENABLED=true`, `JWT_SECRET`, `NODE_ENV=production`, dos usuarios y contraseñas demo distintos, y `CORS_ORIGINS` con el dominio HTTPS del frontend. Usar `npm run build` para compilar y `npm run start:demo` como comando de inicio: este crea el esquema únicamente si la base está vacía, carga catálogos y prepara cuentas ficticias. No conectar una base institucional o con datos reales.

El frontend se despliega desde el repositorio `frontend` como servicio separado; sus instrucciones y referencias de variables Railway están en [`../frontend/README.md`](../frontend/README.md).

## Solicitudes de modificación

- El login consulta `public.usuarios`, verifica el hash de contraseña en el backend y emite un JWT propio. Para usar las cuentas del sistema existente, ambos sistemas deben apuntar a la misma base/esquema y compartir el formato de hash; también deben coincidir los IDs de rol (el backend trata `idRol: 1` como administrador). El hash se usa solo para verificar credenciales y no se devuelve al cliente.
- La aplicación solo consulta las credenciales para autenticar. La creación, el cambio y la recuperación de contraseñas quedan a cargo del sistema que administra usuarios; el backend de legajos no expone operaciones para escribir esos datos.
- `GET /solicitudes` requiere autenticación y el rol de administrador (`idRol: 1`). Devuelve las solicitudes de otros usuarios, incluidas las creadas por otros administradores, pero excluye las del administrador autenticado.
- `GET /solicitudes/mis-solicitudes` devuelve el historial de solicitudes del usuario autenticado, incluidas las propias solicitudes de modificación de un administrador.
- La identidad para estos filtros se obtiene del token de acceso; no depende del identificador guardado en el navegador.
- En el historial, `fechaCreacion` es la fecha de envío y `fechaRevision` la fecha en que se aprobó o rechazó; son eventos distintos y la interfaz muestra ambas cuando existe revisión. Los timestamps sin zona se interpretan como UTC y se muestran en la zona horaria de Argentina.
- Al aprobar, los familiares existentes se identifican por `idFamiliar` y los nuevos se envían con `esNuevo: true`. El DTO acepta sus datos personales y `discapacitado`; el backend actualiza los primeros, inserta los segundos en `public.familiares` y marca con `estado = 'BA'` los familiares quitados, asignando el siguiente `numfamiliar` disponible para el legajo. También admite solicitudes anteriores que solo incluyen `apeNom` y `parentesco`.
- El detalle y el PDF del historial desglosan los familiares incluidos en la solicitud con vínculo, nombre, documento, sexo, fecha de nacimiento y discapacidad, sin imprimir datos binarios de archivos o fotos.
- El formulario envía solo los campos distintos de los valores originales y solo incluye familiares nuevos o editados; los familiares editados se aplican parcialmente para conservar sus demás datos.
- Para solicitudes antiguas que guardaron el formulario completo, el historial y la bandeja priorizan los familiares marcados con `esNuevo`, evitando presentar campos no modificados como parte del cambio.
- La bandeja de administración muestra enlaces separados para la foto, el CUD del agente y los CUD de familiares incluidos en la solicitud; si no trae archivos válidos, informa que no hay adjuntos y no muestra enlaces.
- Los adjuntos se validan al crear la solicitud y se conservan en su JSONB. Al aprobar, la foto se guarda en `public.archivos` y se relaciona mediante `empleados.idarchivofoto`; el CUD del agente se vincula desde `emp_cud.idarchivo`. `GET /archivos/:id` entrega el archivo con autorización del dueño del legajo o de un administrador.
- La consulta al esquema confirmó que `archivos.idarchivo` y `emp_cud.idcud` tienen secuencias automáticas y que ambas tablas tienen `estado` (`AC` activo, `BA` baja). El perfil y la descarga filtran por registros activos.
- El esquema mostrado no relaciona archivos con `familiares`; sus CUD permanecen asociados al historial de la solicitud y no se copian al legajo familiar.
- Al aprobar una solicitud, los campos de domicilio y teléfonos enviados se aplican a la dirección activa (`direcciones.estado = 'AC'`); si no existe, se crea una nueva sin reactivar registros históricos. El correo se sincroniza en `direcciones.email` y `usuarios.email`.
- `public.empleados.tipodocumento` se agrega mediante `database/migrations/20261006_add_employees_document_type.sql`; la API devuelve ese valor como `tipoDocumento` para el perfil.
- El catálogo de `public.funciones` se completa con las opciones ya aprobadas del formulario mediante `database/migrations/20261006_seed_functions.sql`. `GET /usuarios/catalogos/funciones` entrega opciones e IDs; al aprobar, `funcion` se resuelve contra el catálogo y se actualiza `empleados.idfuncion`.
- La repartición se propone como texto libre (máximo 150 caracteres) en una solicitud; recién al aprobar se crea o reutiliza una entrada de `public.reparticiones` y se actualiza `empleados.idreparticion`. `database/migrations/20261006_prepare_repartitions_for_approval.sql` configura el ID automático y evita duplicados por diferencias de mayúsculas/espacios.
