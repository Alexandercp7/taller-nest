import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { UsersService } from './users.service';
import { UsersController } from './user.controller';

@Module({
  imports: [AuditModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UserModule {}
