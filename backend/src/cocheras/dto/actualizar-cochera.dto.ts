import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { TipoVehiculoDto } from '../../vehiculos/dto/crear-vehiculo.dto';

enum EstadoCocheraDto {
  Disponible = 'Disponible',
  Ocupado = 'Ocupado',
  FueraDeServicio = 'FueraDeServicio',
}

export class ActualizarCocheraDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numero?: string;

  @IsOptional()
  @IsEnum(TipoVehiculoDto)
  tipoVehiculo?: TipoVehiculoDto;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ubicacion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  tarifaId?: number;

  @IsOptional()
  @IsEnum(EstadoCocheraDto)
  estado?: EstadoCocheraDto;
}
