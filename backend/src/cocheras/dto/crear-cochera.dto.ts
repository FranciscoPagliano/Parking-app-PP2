import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsString, MaxLength, Min } from 'class-validator';
import { TipoVehiculoDto } from '../../vehiculos/dto/crear-vehiculo.dto';

export class CrearCocheraDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  numero: string;

  @IsEnum(TipoVehiculoDto)
  tipoVehiculo: TipoVehiculoDto;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  ubicacion: string;

  @IsInt()
  @Min(1)
  tarifaId: number;
}
