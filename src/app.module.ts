import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ClientsModule } from './clients/clients.module';
import { InventoryModule } from './inventory/inventory.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { SpecialOrderPartsModule } from './special-order-parts/special-order-parts.module';
import { ServicesModule } from './services/services.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { QuotationsModule } from './quotations/quotations.module';
import { FinanceModule } from './finance/finance.module';
import { PaymentsModule } from './payments/payments.module';
import { CommercialCloseModule } from './commercial-close/commercial-close.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    UserModule,
    AuthModule,
    VehiclesModule,
    ClientsModule,
    InventoryModule,
    SuppliersModule,
    SpecialOrderPartsModule,
    ServicesModule,
    WorkOrdersModule,
    QuotationsModule,
    FinanceModule,
    PaymentsModule,
    CommercialCloseModule,
  ],
  controllers: [],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
