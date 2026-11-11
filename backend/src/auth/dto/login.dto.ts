import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export enum TipoCuenta {
  Cliente = 'Cliente',
  Empleado = 'Empleado',
  Dueno = 'Dueno',
}

export class LoginDto {
  @IsEmail()
  @MaxLength(100)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  contrasena: string;

  @IsEnum(TipoCuenta)
  tipoCuenta: TipoCuenta;
}
