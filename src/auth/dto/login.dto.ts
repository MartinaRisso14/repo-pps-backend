import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'El nombre de usuario o CUIL es requerido' })
  @IsString()
  usuNombre: string;

  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @IsString()
  password: string;
}