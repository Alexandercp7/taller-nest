import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import * as path from 'path';
import { AuditService } from '../audit/audit.service';
import { RequestUser } from '@common/types/request-user.type';
import { R2StorageService } from '@common/uploads/r2-storage.service';
import { assertWorkshopScoped } from '@common/utils/assert-workshop-scoped.util';
import { PrismaService } from '../prisma/prisma.service';
import { ArticleDto } from './dto/article.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { CreateStockMovementDto } from './dto/create-stock-movement.dto';
import { ListArticlesQueryDto } from './dto/list-articles-query.dto';
import { ListKardexQueryDto } from './dto/list-kardex-query.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { assertSalePriceRules } from './domain/article-price.validator';
import { computeNextStock } from './domain/stock.validator';
import {
  decodeKardexCursor,
  encodeKardexCursor,
} from './domain/kardex-cursor.util';

type ArticleRecord = Awaited<
  ReturnType<PrismaService['article']['findUniqueOrThrow']>
>;
type StockMovementRecord = Awaited<
  ReturnType<PrismaService['stockMovement']['findUniqueOrThrow']>
>;

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: R2StorageService,
  ) {}

  async create(
    dto: CreateArticleDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ArticleDto> {
    const db = tx ?? this.prisma;
    assertSalePriceRules(dto.type, dto.salePrice);

    const article = await db.article.create({
      data: {
        workshopId: actor.workshopId,
        sku: dto.sku,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        condition: dto.condition,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        stock: dto.stock ?? 0,
        minStock: dto.minStock ?? 0,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Article',
        entityId: article.id,
        action: 'ARTICLE_CREATED',
        actorId: actor.id,
        after: { name: article.name, type: article.type },
      },
      tx,
    );

    return this.toDto(article);
  }

  async findAll(
    query: ListArticlesQueryDto,
    actor: RequestUser,
  ): Promise<ArticleDto[]> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.ArticleWhereInput = {
      workshopId: actor.workshopId,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [sortField, sortDir] = (query.sort ?? 'createdAt:desc').split(
      ':',
    ) as ['name' | 'createdAt', 'asc' | 'desc'];

    const articles = await this.prisma.article.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortDir },
    });

    return articles.map((a) => this.toDto(a));
  }

  async lowStock(actor: RequestUser): Promise<ArticleDto[]> {
    const articles = await this.prisma.article.findMany({
      where: { workshopId: actor.workshopId, isActive: true },
      orderBy: { name: 'asc' },
    });

    return articles
      .filter((a) => a.stock < a.minStock)
      .map((a) => this.toDto(a));
  }

  async findOneArticle(id: string, actor: RequestUser): Promise<ArticleDto> {
    const article = await this.prisma.article.findUnique({ where: { id } });
    return this.toDto(
      assertWorkshopScoped(article, actor, 'Artículo no encontrado.'),
    );
  }

  async updateArticle(
    id: string,
    dto: UpdateArticleDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<ArticleDto> {
    const db = tx ?? this.prisma;
    const article = assertWorkshopScoped(
      await db.article.findUnique({ where: { id } }),
      actor,
      'Artículo no encontrado.',
    );

    const effectiveType = dto.type ?? article.type;
    const effectiveSalePrice =
      dto.salePrice !== undefined
        ? dto.salePrice
        : (article.salePrice?.toString() ?? undefined);
    assertSalePriceRules(effectiveType, effectiveSalePrice);

    const updated = await db.article.update({
      where: { id },
      data: {
        sku: dto.sku,
        type: dto.type,
        name: dto.name,
        description: dto.description,
        condition: dto.condition,
        purchasePrice: dto.purchasePrice,
        salePrice: dto.salePrice,
        minStock: dto.minStock,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Article',
        entityId: id,
        action: 'ARTICLE_UPDATED',
        actorId: actor.id,
        before: { name: article.name, type: article.type },
        after: { name: updated.name, type: updated.type },
      },
      tx,
    );

    return this.toDto(updated);
  }

  async setArticlePhoto(
    id: string,
    file: Express.Multer.File,
    actor: RequestUser,
  ): Promise<ArticleDto> {
    const article = assertWorkshopScoped(
      await this.prisma.article.findUnique({ where: { id } }),
      actor,
      'Artículo no encontrado.',
    );

    if (article.photoUrl) await this.storage.delete(article.photoUrl);

    const key = `articles/${randomUUID()}${path.extname(file.originalname)}`;
    const photoUrl = await this.storage.upload(key, file.buffer, file.mimetype);
    const updated = await this.prisma.article.update({
      where: { id },
      data: { photoUrl },
    });

    await this.audit.log({
      workshopId: actor.workshopId,
      entityType: 'Article',
      entityId: id,
      action: 'ARTICLE_PHOTO_UPDATED',
      actorId: actor.id,
      before: { photoUrl: article.photoUrl ?? null },
      after: { photoUrl },
    });

    return this.toDto(updated);
  }

  async removeArticle(
    id: string,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    const db = tx ?? this.prisma;
    assertWorkshopScoped(
      await db.article.findUnique({ where: { id } }),
      actor,
      'Artículo no encontrado.',
    );

    await db.article.update({ where: { id }, data: { isActive: false } });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'Article',
        entityId: id,
        action: 'ARTICLE_DEACTIVATED',
        actorId: actor.id,
        before: { isActive: true },
        after: { isActive: false },
      },
      tx,
    );
  }

  async registerMovement(
    dto: CreateStockMovementDto,
    actor: RequestUser,
    tx?: Prisma.TransactionClient,
  ): Promise<StockMovementDto> {
    const db = tx ?? this.prisma;

    const article = assertWorkshopScoped(
      await db.article.findUnique({ where: { id: dto.articleId } }),
      actor,
      'Artículo no encontrado.',
    );

    const before = article.stock;
    const after = computeNextStock(before, dto.qty, dto.type);

    await db.article.update({
      where: { id: article.id },
      data: { stock: after },
    });

    const movement = await db.stockMovement.create({
      data: {
        workshopId: actor.workshopId,
        articleId: article.id,
        type: dto.type,
        qty: dto.qty,
        before,
        after,
        reason: dto.reason,
        actorId: actor.id,
      },
    });

    await this.audit.log(
      {
        workshopId: actor.workshopId,
        entityType: 'StockMovement',
        entityId: movement.id,
        action: 'STOCK_MOVEMENT_REGISTERED',
        actorId: actor.id,
        after: { articleId: article.id, type: dto.type, before, after },
      },
      tx,
    );

    return this.toMovementDto(movement);
  }

  async kardex(
    id: string,
    query: ListKardexQueryDto,
    actor: RequestUser,
  ): Promise<{
    data: StockMovementDto[];
    pageInfo: { nextCursor?: string; hasNextPage: boolean; limit: number };
  }> {
    await this.findOneArticle(id, actor);

    const limit = query.limit ?? 20;
    const cursor = query.cursor ? decodeKardexCursor(query.cursor) : undefined;

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        articleId: id,
        ...(cursor
          ? {
              OR: [
                { createdAt: { lt: new Date(cursor.createdAt) } },
                {
                  createdAt: new Date(cursor.createdAt),
                  id: { lt: cursor.id },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });

    const hasNextPage = movements.length > limit;
    const page = hasNextPage ? movements.slice(0, limit) : movements;
    const last = page[page.length - 1];

    return {
      data: page.map((m) => this.toMovementDto(m)),
      pageInfo: {
        nextCursor:
          hasNextPage && last
            ? encodeKardexCursor({
                createdAt: last.createdAt.toISOString(),
                id: last.id,
              })
            : undefined,
        hasNextPage,
        limit,
      },
    };
  }

  private toDto(article: ArticleRecord): ArticleDto {
    return {
      id: article.id,
      workshopId: article.workshopId,
      sku: article.sku ?? undefined,
      type: article.type,
      name: article.name,
      description: article.description ?? undefined,
      condition: article.condition ?? undefined,
      purchasePrice: article.purchasePrice?.toString() ?? undefined,
      salePrice: article.salePrice?.toString() ?? undefined,
      photoUrl: article.photoUrl ?? undefined,
      stock: article.stock,
      minStock: article.minStock,
      isActive: article.isActive,
      createdAt: article.createdAt,
    };
  }

  private toMovementDto(movement: StockMovementRecord): StockMovementDto {
    return {
      id: movement.id,
      articleId: movement.articleId,
      workOrderId: movement.workOrderId ?? undefined,
      type: movement.type,
      qty: movement.qty,
      before: movement.before,
      after: movement.after,
      reason: movement.reason ?? undefined,
      actorId: movement.actorId,
      createdAt: movement.createdAt,
    };
  }
}
