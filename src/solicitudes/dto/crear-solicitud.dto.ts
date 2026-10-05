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
  // Campos normalizados según la tabla direcciones
  @IsOptional()
  @IsString()
  calle?: string;

  @IsOptional()
  @IsString()
  callenro?: string;

  @IsOptional()
  @IsString()
  barrio?: string;

  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  provincia?: string;

  @IsOptional()
  @IsString()
  tel1?: string;

  @IsOptional()
  @IsString()
  tel2?: string;

  @IsOptional()
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  // Otros campos del legajo
  @IsOptional()
  @IsString()
  estadoCivil?: string;

  @IsOptional()
  @IsString()
  reparticion?: string;

  @IsOptional()
  @IsString()
  funcion?: string;

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
  cud?: any; 

  @IsOptional()
  datosSolicitados?: Record<string, any>;
}