import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { UserDto } from './dto/user.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { RequestUser } from '@common/types/request-user.type';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Perfil del usuario autenticado' })
  getMe(@CurrentUser() user: RequestUser): Promise<UserProfileDto> {
    return this.usersService.findMe(user.id);
  }

  @Post()
  @RequirePermission('user:manage')
  @ApiOperation({ summary: 'Crear usuario (solo ADMIN)' })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<UserDto> {
    return this.usersService.create(dto, actor);
  }

  @Get()
  @RequirePermission('user:manage')
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll(
    @Query() query: ListUsersQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{ data: UserDto[]; total: number }> {
    return this.usersService.findAll(query, actor);
  }

  @Patch(':id')
  @RequirePermission('user:manage')
  @ApiOperation({ summary: 'Actualizar usuario' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<UserDto> {
    return this.usersService.update(id, dto, actor);
  }

  @Put(':id/permissions')
  @RequirePermission('user:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Reemplazar permisos del usuario' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() dto: UpdatePermissionsDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.usersService.updatePermissions(id, dto, actor);
  }

  @Delete(':id')
  @RequirePermission('user:manage')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desactivar usuario (soft-delete)' })
  async deactivate(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.usersService.deactivate(id, actor);
  }
}
