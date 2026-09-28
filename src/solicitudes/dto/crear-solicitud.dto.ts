import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsArray, 
  ValidateNested 
} from 'class-validator';
import { Type } from 'class-transformer';

export class FamiliarDto {
  @IsString()
  parentesco: string;

  @IsString()
  apeNom: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;
}

export class CrearSolicitudDto {
  @IsOptional()
  @IsString()
  domicilio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  telefonos?: string[];

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  correoElectronico?: string;

  @IsOptional()
  @IsString()
  reparticion?: string;

  @IsOptional()
  @IsString()
  estadoCivil?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FamiliarDto)
  familiares?: FamiliarDto[];

  @IsOptional()
  @IsString()
  foto?: string;

  @IsOptional()
  @IsString()
  certificadoDiscapacidad?: string;

  @IsOptional()
  @IsString()
  funcion?: string;
}