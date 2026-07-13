import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional, IsString, Length, MaxLength, MinLength, IsInt, Max, IsIn } from "class-validator";

const  currentYear = new Date().getFullYear()
const upper = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateVehicleDto {
    @ApiProperty()
    @IsString()
    clientId!: string;

    
    @ApiProperty({
        description: ' No es unico, para que hayan varios vehiculos con las mismas placas'
    })
    @IsString()
    @MinLength(5)
    @MaxLength(10)
    @Transform(upper)
    plate!:string;

    @ApiPropertyOptional()
    @IsString()
    @Length(11,17)
    @IsOptional()
    @Transform(upper)
    vin?: string;

    @ApiProperty()
    @IsString()
    make!:string;
    
    @ApiProperty()
    @IsString()
    model!:string;

    @ApiProperty({ maximum: currentYear +1})
    @IsInt()
    @Max(currentYear + 1)
    year!: number;

    @ApiProperty()
    @IsInt()
    km!: number;

}
