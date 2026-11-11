import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { TipoVehiculoDto } from './crear-vehiculo.dto';

export class ActualizarVehiculoDto {
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9]{6,9}$/)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : value,
  )
  patente?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  modelo?: string;

  @IsOptional()
  @IsEnum(TipoVehiculoDto)
  tipo?: TipoVehiculoDto;
}
