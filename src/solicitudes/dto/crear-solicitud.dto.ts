import { 
  IsString, 
  IsEmail, 
  IsOptional, 
  IsArray, 
  ValidateNested,
  IsNumber,
  IsBoolean,
  MaxLength,
  IsObject,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';


export class FamiliarDto {
  @IsOptional()
  @IsNumber()
  idFamiliar?: number;

  @IsOptional()
  @IsBoolean()
  esNuevo?: boolean;

  @IsOptional()
  @IsBoolean()
  eliminado?: boolean;

  @IsOptional()
  @IsString()
  parentesco?: string;

  @IsOptional()
  @IsString()
  apeNom?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsOptional()
  @IsString()
  nombres?: string;

  @IsOptional()
  @IsString()
  tipoDocumento?: string;

  @IsOptional()
  @IsString()
  nroDocumento?: string;

  @IsOptional()
  @IsString()
  sexo?: string;

  @IsOptional()
  @IsString()
  dni?: string;

  @IsOptional()
  @IsString()
  fechaNacimiento?: string;

  @IsOptional()
  @IsBoolean()
  discapacitado?: boolean;

  @IsOptional()
  @IsString()
  archivoCud?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombreArchivoCud?: string;
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
  @ValidateIf((_object, value) => value !== '')
  @IsEmail({}, { message: 'El correo electrónico no es válido' })
  email?: string;

  // Otros campos del legajo
  @IsOptional()
  @IsString()
  estadoCivil?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
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
  @IsObject()
  cud?: {
    fechaEmision?: string;
    fechaVencimiento?: string;
    archivo?: string;
    nombreArchivo?: string;
  } | null;

  @IsOptional()
  datosSolicitados?: Record<string, any>;

  @IsOptional()
  @IsObject()
  valoresAnteriores?: Record<string, any>;
}