import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength, Matches } from 'class-validator';

export enum TipoVehiculoDto {
  Auto = 'Auto',
  Moto = 'Moto',
  Camioneta = 'Camioneta',
}

export class CrearVehiculoDto {
  @IsString()
  @Matches(/^[A-Z0-9]{6,9}$/)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '').toUpperCase() : value,
  )
  patente: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  modelo: string;

  @IsEnum(TipoVehiculoDto)
  tipo: TipoVehiculoDto;
}
