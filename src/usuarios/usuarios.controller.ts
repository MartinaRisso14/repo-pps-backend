import { Controller, Get, Param, Patch, Body, ParseIntPipe } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CambiarClaveDto } from './dto/cambiar-password.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get(':usuNombre')
  async findOne(@Param('usuNombre') usuNombre: string) {
    return await this.usuariosService.findOneByNombre(usuNombre);
  }
  
  @Patch(':id/cambiar-password')
  cambiarPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarClaveDto,
  ) {
    return this.usuariosService.cambiarClave(id, dto);
  }


}