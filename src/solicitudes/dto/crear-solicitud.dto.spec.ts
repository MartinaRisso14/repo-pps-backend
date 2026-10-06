import 'reflect-metadata';
import { validate } from 'class-validator';
import { expect, it, describe } from '@jest/globals';
import { CrearSolicitudDto } from './crear-solicitud.dto';

describe('CrearSolicitudDto email', () => {
  it('accepts an empty email so approval can clear both email fields', async () => {
    const dto = Object.assign(new CrearSolicitudDto(), { email: '' });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects a non-empty email with invalid format', async () => {
    const dto = Object.assign(new CrearSolicitudDto(), { email: 'not-an-email' });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });
});
