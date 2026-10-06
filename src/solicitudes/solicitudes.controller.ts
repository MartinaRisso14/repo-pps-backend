import { 
  Controller,Post, Get, Delete, Body, Patch, UseGuards, Request, ParseIntPipe, Param} from '@nestjs/common';
import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard'; 
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RechazarSolicitudDto } from './dto/rechazar-solicitud.dto';

@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // 1. Crear una nueva solicitud (Cualquier usuario logueado)
  @Post()
  crearSolicitud(@Request() req:any, @Body() dto: CrearSolicitudDto) {
    // Extraemos el ID del usuario directamente del token decodificado
    const usuCodigo = req.user.sub || req.user.usuCodigo;
    return this.solicitudesService.crearSolicitud(usuCodigo, dto);
  }

  // 2. Ver el historial de MIS solicitudes
  @Get('mis-solicitudes')
  obtenerMisSolicitudes(@Request() req: any) {
    const usuCodigo = req.user.sub || req.user.usuCodigo;
    return this.solicitudesService.obtenerMisSolicitudes(usuCodigo);
  }

 // 3. Ver solicitudes de otros usuarios para autorizar/rechazar (Administrador)
  @UseGuards(RolesGuard)
  @Roles(1)
  @Get() // <-- Le quitás 'pendientes' y dejás solo @Get()
  obtenerTodas(@Request() req: any) {
    const usuCodigo = req.user.usuCodigo || req.user.sub;
    return this.solicitudesService.obtenerTodas(usuCodigo);
  }

  // 4. Aprobar una solicitud (Solo Administrador: rol 1)
  @UseGuards(RolesGuard)
  @Roles(1)
  @Patch(':id/aprobar')
  aprobarSolicitud(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: any,
  ) {
    const revisadoPor = req.user.usuCodigo || req.user.sub;
    return this.solicitudesService.aprobarSolicitud(id, revisadoPor);
  }

  // 5. Rechazar una solicitud (Solo Administrador: rol 1)
  @UseGuards(RolesGuard)
  @Roles(1)
  @Patch(':id/rechazar')
  rechazarSolicitud(
    @Param('id', ParseIntPipe) id: number, 
    @Request() req: any, 
    @Body() dto: RechazarSolicitudDto,
  ) {
    const revisadoPor = req.user.usuCodigo || req.user.sub;
    return this.solicitudesService.rechazarSolicitud(id, revisadoPor, dto);
  }

  // 6. Cancelar una solicitud pendiente (Solo el solicitante)
  @Delete(':id/cancelar')
  cancelarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const usuCodigo = req.user.sub || req.user.usuCodigo;
    return this.solicitudesService.cancelarSolicitud(id, usuCodigo);
  }

}
