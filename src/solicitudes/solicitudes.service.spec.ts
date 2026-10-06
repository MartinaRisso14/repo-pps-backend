import { BadRequestException } from '@nestjs/common';
import { expect, it, jest, describe } from '@jest/globals';
import type { DataSource, QueryRunner, Repository } from 'typeorm';
import { SolicitudModificacion } from './solicitud.entity';
import { SolicitudesService } from './solicitudes.service';
import { Usuario } from '../usuarios/entities/usuario.entity';

describe('SolicitudesService family removal', () => {
  const createService = (familyIsActive: boolean) => {
    const query = jest.fn(async (sql: string, values?: unknown[]) => {
      if (sql.includes('UPDATE public.familiares')) {
        return familyIsActive
          && values?.[0] === 9
          && values?.[1] === 4
          && values?.[2] === 77
          ? [{ id_familiar: 4 }]
          : [];
      }
      if (sql.includes('SELECT legajo FROM public.usuarioslegajos')) {
        return [{ legajo: 77 }];
      }
      if (sql.includes('SELECT idfuncion')) {
        return [{ idfuncion: 8 }];
      }
      if (sql.includes('INSERT INTO public.reparticiones')) {
        return [{ idreparticion: 13 }];
      }
      return [];
    });
    const queryRunner = {
      manager: { query },
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
    } as unknown as QueryRunner;
    const solicitudRepo = {
      findOne: jest.fn().mockResolvedValue({
        id: 12,
        usuCodigo: 5,
        datosSolicitados: {
          familiares: [{ idFamiliar: 4, eliminado: true }],
        },
        estado: 'PENDIENTE',
      }),
    } as unknown as Repository<SolicitudModificacion>;
    const dataSource = {
      createQueryRunner: jest.fn(() => queryRunner),
    } as unknown as DataSource;
    const service = new SolicitudesService(
      solicitudRepo,
      {} as unknown as Repository<Usuario>,
      dataSource,
    );

    return { service, query, queryRunner };
  };

  it('marks the active family record as logically removed in the approval transaction', async () => {
    const { service, query, queryRunner } = createService(true);

    await service.aprobarSolicitud(12, 9);

    const bajaQuery = query.mock.calls.find(([sql]) => sql.includes('UPDATE public.familiares'));
    expect(bajaQuery?.[0]).toContain("SET estado = 'BA'");
    expect(bajaQuery?.[0]).toContain("AND estado = 'AC'");
    expect(bajaQuery?.[1]).toEqual([9, 4, 77]);
    expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
  });

  it('rejects the approval and rolls back when the family record is not active on that employee', async () => {
    const { service, queryRunner } = createService(false);

    await expect(service.aprobarSolicitud(12, 9)).rejects.toThrow(BadRequestException);

    expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('resolves the requested function against the catalog and updates the employee assignment', async () => {
    const { service, query } = createService(true);
    const solicitudRepo = (service as unknown as {
      solicitudRepo: Repository<SolicitudModificacion>;
    }).solicitudRepo;
    jest.mocked(solicitudRepo.findOne).mockResolvedValue({
      id: 12,
      usuCodigo: 5,
      datosSolicitados: { funcion: 'CHOFER' },
      estado: 'PENDIENTE',
    } as SolicitudModificacion);

    await service.aprobarSolicitud(12, 9);

    const actualizacion = query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE public.empleados') && sql.includes('idfuncion = $1'),
    );
    expect(actualizacion?.[1]).toEqual([8, 9, 77]);
  });

  it('creates a repartition only when an administrator approves a new requested value', async () => {
    const { service, query } = createService(true);
    const solicitudRepo = (service as unknown as {
      solicitudRepo: Repository<SolicitudModificacion>;
    }).solicitudRepo;
    jest.mocked(solicitudRepo.findOne).mockResolvedValue({
      id: 12,
      usuCodigo: 5,
      datosSolicitados: { reparticion: 'NUEVA REPARTICION' },
      estado: 'PENDIENTE',
    } as SolicitudModificacion);

    await service.aprobarSolicitud(12, 9);

    const insercion = query.mock.calls.find(([sql]) => sql.includes('INSERT INTO public.reparticiones'));
    expect(insercion?.[0]).toContain('ON CONFLICT');
    expect(insercion?.[1]).toEqual(['NUEVA REPARTICION', 9]);
    const actualizacion = query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE public.empleados') && sql.includes('idreparticion = $1'),
    );
    expect(actualizacion?.[1]).toEqual([13, 9, 77]);
  });

  it('clears estadoCivil when an empty value is explicitly requested', async () => {
    const { service, query } = createService(true);
    const solicitudRepo = (service as unknown as {
      solicitudRepo: Repository<SolicitudModificacion>;
    }).solicitudRepo;
    jest.mocked(solicitudRepo.findOne).mockResolvedValue({
      id: 12,
      usuCodigo: 5,
      datosSolicitados: { estadoCivil: '' },
      estado: 'PENDIENTE',
    } as SolicitudModificacion);

    await service.aprobarSolicitud(12, 9);

    const actualizacion = query.mock.calls.find(([sql]) =>
      sql.includes('UPDATE public.empleados') && sql.includes('estadocivil = CASE'),
    );
    expect(actualizacion?.[0]).toContain("NULLIF($2, '')");
    expect(actualizacion?.[1]).toEqual([true, '', false, undefined, 9, 77]);
  });
});
