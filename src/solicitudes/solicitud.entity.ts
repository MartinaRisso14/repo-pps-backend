import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from '../usuarios/entities/usuario.entity';

@Entity({ name: 'solicitudes_modificacion', schema: 'public' })
export class SolicitudModificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'usucodigo' })
  usuCodigo: number;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usucodigo' })
  usuario: Usuario;

  @Column({ type: 'jsonb', name: 'datos_solicitados' })
  datosSolicitados: Record<string, any>;

  @Column({ default: 'PENDIENTE', length: 20 })
  estado: string;

  @Column({ name: 'fecha_creacion', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  fechaCreacion: Date;

  @Column({ name: 'fecha_revision', type: 'timestamp', nullable: true })
  fechaRevision: Date;

  @Column({ name: 'revisado_por', nullable: true })
  revisadoPor: number;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'revisado_por' })
  revisor: Usuario;

  @Column({ name: 'motivo_rechazo', type: 'text', nullable: true })
  motivoRechazo: string;
}