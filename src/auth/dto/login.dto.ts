import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'admin@taller.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin1234!Secure' })
  @IsString()
  @MinLength(8)
  password!: string;
}
