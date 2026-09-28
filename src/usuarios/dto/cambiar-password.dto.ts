import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarClaveDto {
  @IsString()
  @IsNotEmpty({ message: 'La clave actual es requerida' })
  claveActual: string;

  @IsString()
  @IsNotEmpty({ message: 'La nueva clave es requerida' })
  @MinLength(6, { message: 'La nueva clave debe tener al menos 6 caracteres' })
  nuevaClave: string;
}