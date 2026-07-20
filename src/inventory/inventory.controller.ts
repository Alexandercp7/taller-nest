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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { RequirePermission } from '@common/decorators/require-permission.decorator';
import { RequestUser } from '@common/types/request-user.type';
import { imageUploadOptions } from '@common/uploads/image-upload.config';
import { InventoryService } from './inventory.service';
import { ArticleDto } from './dto/article.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { ListKardexQueryDto } from './dto/list-kardex-query.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('articles')
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Create a new inventory article' })
  createArticle(
    @Body() dto: CreateArticleDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ArticleDto> {
    return this.inventoryService.create(dto, actor);
  }

  @Get('low-stock')
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'Get all articles below minStock' })
  lowStock(@CurrentUser() actor: RequestUser): Promise<ArticleDto[]> {
    return this.inventoryService.lowStock(actor);
  }

  @Get('articles')
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'List inventory articles' })
  findAll(
    @Query() query: ListArticlesQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ArticleDto[]> {
    return this.inventoryService.findAll(query, actor);
  }

  @Get('articles/:id')
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'Get an inventory article by id' })
  findOneArticle(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<ArticleDto> {
    return this.inventoryService.findOneArticle(id, actor);
  }

  @Get('articles/:id/kardex')
  @RequirePermission('inventory:read')
  @ApiOperation({ summary: 'Get the movement kardex of an article' })
  kardex(
    @Param('id') id: string,
    @Query() query: ListKardexQueryDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<{
    data: StockMovementDto[];
    pageInfo: { nextCursor?: string; hasNextPage: boolean; limit: number };
  }> {
    return this.inventoryService.kardex(id, query, actor);
  }

  @Patch('articles/:id')
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Update an inventory article by id' })
  updateArticle(
    @Param('id') id: string,
    @Body() dto: UpdateArticleDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<ArticleDto> {
    return this.inventoryService.updateArticle(id, dto, actor);
  }

  @Post('articles/:id/photo')
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Upload a photo for an inventory article' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('photo', imageUploadOptions))
  setArticlePhoto(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ): Promise<ArticleDto> {
    return this.inventoryService.setArticlePhoto(id, file, actor);
  }

  @Delete('articles/:id')
  @RequirePermission('inventory:write')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete an inventory article by id' })
  async deactiveAricle(
    @Param('id') id: string,
    @CurrentUser() actor: RequestUser,
  ): Promise<void> {
    await this.inventoryService.removeArticle(id, actor);
  }

  @Post('movements')
  @RequirePermission('inventory:write')
  @ApiOperation({ summary: 'Register a new stock movement' })
  createMovement(
    @Body() dto: CreateStockMovementDto,
    @CurrentUser() actor: RequestUser,
  ): Promise<StockMovementDto> {
    return this.inventoryService.registerMovement(dto, actor);
  }
}
