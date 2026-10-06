# Diagrama entidad-relación de la implementación

Este DER complementa el diagrama recibido para la práctica: representa el esquema PostgreSQL de la implementación local, incluyendo sus extensiones. No reemplaza ni modifica el diseño original entregado por la institución.

El diagrama se basa en [`bootstrap/demo-schema.sql`](./bootstrap/demo-schema.sql), que contiene estructura sin datos de personas. GitHub representa el siguiente bloque Mermaid como diagrama visual al abrir este archivo.

```mermaid
erDiagram
    ROLES {
        int idrol PK
        varchar descripcion
    }

    USUARIOS {
        int usucodigo PK
        varchar usunombre UK
        varchar password_hash "adicional de la implementacion local"
        varchar apenom
        int idrol FK
        varchar estado
        varchar email
        timestamp fechamod
        int usuariomod
        boolean debe_cambiar_password "adicional de la implementacion local"
    }

    USUARIOSLEGAJOS {
        int idusuariolegajo PK
        int usucodigo FK
        int legajo FK
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    EMPLEADOS {
        int legajo PK
        varchar apellido
        varchar nombres
        varchar tipodocumento "agregado por la implementacion"
        varchar nrodocumento
        date f_nacimiento
        varchar nacionalidad
        varchar cuil
        varchar estadocivil
        int idfuncion FK
        int idreparticion FK
        int idarchivofoto FK
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    DIRECCIONES {
        int legajo PK, FK
        varchar calle
        varchar callenro
        varchar barrio
        varchar ciudad
        varchar provincia
        varchar tel1
        varchar tel2
        varchar email
        date f_actualiz
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    FAMILIARES {
        int id_familiar PK
        int legajo FK
        int numfamiliar
        varchar apellido
        varchar nombres
        varchar parentesco FK
        boolean discapacitado
        varchar estado
        timestamp fechamod
        int usuariomod
        varchar tipodocumento
        varchar nrodocumento
        varchar sexo
        date f_nacimiento
    }

    PARENTESCO {
        varchar parentesco PK
        timestamp fechamod
        int usuariomod
    }

    FUNCIONES {
        int idfuncion PK
        varchar funcion
        timestamp fechamod
        int usuariomod
    }

    REPARTICIONES {
        int idreparticion PK
        varchar nombre
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    ARCHIVOS {
        int idarchivo PK
        bytea contenido
        varchar tipoarchivo
        varchar nombrearchivo
        date fechacarga
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    EMP_CUD {
        int idcud PK
        int legajo FK
        date fechaemision
        date fechavencimiento
        int idarchivo FK
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    ESTUDIOS {
        varchar codestudio PK
        varchar estudio
        timestamp fechamod
        int usuariomod
    }

    EMPESTUDIOS {
        int id_empestudios PK
        int legajo FK
        varchar codestudio FK
        varchar titulo
        date f_graduado
        varchar institucion
        varchar ciudad
        varchar estado
        timestamp fechamod
        int usuariomod
    }

    SOLICITUDES_MODIFICACION {
        int id PK
        int usucodigo FK
        jsonb datos_solicitados
        varchar estado
        timestamp fecha_creacion
        timestamp fecha_revision
        int revisado_por FK
        text motivo_rechazo
    }

    ROLES o|--o{ USUARIOS : asigna
    USUARIOS o|--o{ USUARIOSLEGAJOS : vincula
    EMPLEADOS o|--o{ USUARIOSLEGAJOS : vincula
    EMPLEADOS ||--o| DIRECCIONES : tiene
    EMPLEADOS ||--o{ FAMILIARES : registra
    PARENTESCO o|--o{ FAMILIARES : clasifica
    FUNCIONES o|--o{ EMPLEADOS : asigna
    REPARTICIONES o|--o{ EMPLEADOS : asigna
    ARCHIVOS o|--o{ EMPLEADOS : foto
    EMPLEADOS ||--o{ EMP_CUD : registra
    ARCHIVOS o|--o{ EMP_CUD : adjunta
    EMPLEADOS ||--o{ EMPESTUDIOS : registra
    ESTUDIOS ||--o{ EMPESTUDIOS : clasifica
    USUARIOS ||--o{ SOLICITUDES_MODIFICACION : solicita
    USUARIOS o|--o{ SOLICITUDES_MODIFICACION : revisa
```

La comparación y explicación de las diferencias respecto del DER original están integradas en la sección **“Diferencias respecto del DER recibido”** de la [documentación funcional](../../frontend/DOCUMENTACION.md). Este diagrama refleja las claves foráneas declaradas en el esquema local de demostración; no reemplaza ni certifica el esquema institucional. Las secuencias que generan identificadores automáticamente se omiten por ser un detalle de implementación física.
