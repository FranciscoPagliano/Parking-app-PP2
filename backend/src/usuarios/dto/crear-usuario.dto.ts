import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsByteLength,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearUsuarioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trim)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(trim)
  apellido: string;

  @IsString()
  @Matches(/^\d{7,10}$/)
  dni: string;

  @IsEmail()
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @MinLength(12)
  @MaxLength(72)
  @IsByteLength(12, 72)
  @Matches(/.*\S.*/s)
  contrasena: string;

  @IsString()
  @Matches(/^\+?[0-9 ()-]{7,20}$/)
  @Transform(trim)
  telefono: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(40)
  @Transform(trim)
  ciudad: string;
}
