import { IsInt, Min } from 'class-validator';

export class ReasignarEmpleadoDto {
  @IsInt()
  @Min(1)
  playaId: number;
}
