import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { CommercialCloseService } from './commercial-close.service';
import { CommercialCloseDto } from './dto/commercial-close.dto';
import { ExecuteCommercialCloseDto } from './dto/execute-commercial-close.dto';

@ApiTags('commercial-close')
@Controller('work-orders/:woId/commercial-close')
export class CommercialCloseController {
  constructor(
    private readonly commercialCloseService: CommercialCloseService,
  ) {}

  @Post()
  @RequirePermission('commercial-close:execute')
  @ApiOperation({
    summary:
      'Confirmar cierre comercial de la OT: congela el total, genera CxC, resuelve facturación y recalcula deuda',
  })
  executeClose(
    @Param('woId') woId: string,
    @Body() dto: ExecuteCommercialCloseDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<CommercialCloseDto> {
    return this.commercialCloseService.executeClose(woId, dto, actor);
  }

  @Get()
  @RequirePermission('finance:read')
  @ApiOperation({ summary: 'Consultar información de cierre comercial de la orden de trabajo' })
  async findByWorkOrder(
    @Param('woId') woId: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<CommercialCloseDto> {
    const res = await this.commercialCloseService.findByWorkOrder(woId, actor);
    if (!res) {
      throw new NotFoundException(
        `La orden de trabajo '${woId}' no cuenta con cierre comercial confirmado.`,
      );
    }
    return res;
  }
}
