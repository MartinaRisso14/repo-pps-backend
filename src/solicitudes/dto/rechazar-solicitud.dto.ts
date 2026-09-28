import { IsNotEmpty, IsString } from 'class-validator';

export class RechazarSolicitudDto {
  @IsString({ message: 'El motivo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'Debe ingresar un motivo de rechazo' })
  motivoRechazo: string;
}
