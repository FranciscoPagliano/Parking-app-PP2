import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearPlayaDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @Transform(trim)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  @Transform(trim)
  direccion: string;

  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,20}$/)
  @Transform(trim)
  telefono: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaApertura: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  horaCierre: string;

  @IsInt()
  @Min(1)
  @Max(10000)
  capacidad: number;

  @IsBoolean()
  permiteReservas: boolean;
}
