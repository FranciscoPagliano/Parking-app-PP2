import { IsEnum } from 'class-validator';

enum EstadoEmpleadoDto {
  Activo = 'Activo',
  Inactivo = 'Inactivo',
}

export class ActualizarEstadoEmpleadoDto {
  @IsEnum(EstadoEmpleadoDto)
  estado: EstadoEmpleadoDto;
}
