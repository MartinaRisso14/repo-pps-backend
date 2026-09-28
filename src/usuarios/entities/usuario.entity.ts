import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'usuarios', schema: 'public' })
export class Usuario {
  @PrimaryGeneratedColumn({ name: 'usucodigo' })
  usuCodigo: number;

  @Column({ name: 'usunombre', length: 100, unique: true })
  usuNombre: string;

  @Column({ name: 'password_hash', length: 255, select: false })
  password_hash: string;

  @Column({ name: 'apenom', length: 150, nullable: true })
  apeNom: string;

  @Column({ name: 'idrol', nullable: true })
  idRol: number;

  @Column({ name: 'estado', length: 20, default: 'AC' })
  estado: string;

  @Column({ name: 'email', length: 150, nullable: true })
  email: string;

  @Column({ name: 'fechamod', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaMod: Date;

  @Column({ name: 'usuariomod', nullable: true })
  usuarioMod: number;

  @Column({ name: 'debe_cambiar_password', default: true })
  debeCambiarPassword: boolean;
}