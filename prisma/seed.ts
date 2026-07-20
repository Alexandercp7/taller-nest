import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as argon2 from 'argon2';
import 'dotenv/config';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({
  adapter,
});
console.log('=== INICIANDO SEED ===');

const PERMISSIONS = [
  { code: 'user:manage', label: 'Crear/editar/desactivar usuarios' },
  { code: 'client:read', label: 'Ver clientes' },
  { code: 'client:write', label: 'Crear y editar clientes' },
  { code: 'vehicle:read', label: 'Ver vehículos' },
  { code: 'vehicle:write', label: 'Crear y editar vehículos' },
  { code: 'work-order:read', label: 'Ver órdenes de trabajo' },
  { code: 'work-order:write', label: 'Crear y editar órdenes de trabajo' },
  { code: 'work-order:status', label: 'Cambiar estado operativo de OT' },
  { code: 'quotation:read', label: 'Ver cotizaciones' },
  { code: 'quotation:write', label: 'Crear y editar líneas de cotización' },
  { code: 'quotation:approve', label: 'Registrar aprobación del cliente' },
  { code: 'quotation:override-price', label: 'Ajustar precio con motivo' },
  { code: 'commercial-close:execute', label: 'Confirmar cierre comercial' },
  { code: 'payment:write', label: 'Registrar pagos y anticipos' },
  { code: 'invoice:read', label: 'Ver estado de facturación' },
  { code: 'invoice:write', label: 'Gestionar datos fiscales' },
  { code: 'inventory:read', label: 'Ver artículos y stock' },
  { code: 'inventory:write', label: 'Crear artículos y registrar movimientos' },
  { code: 'inventory:custody-read', label: 'Ver piezas en custodia' },
  { code: 'inventory:custody-write', label: 'Registrar y devolver piezas en custodia' },
  { code: 'price-list:read', label: 'Ver lista de precios' },
  { code: 'price-list:write', label: 'Crear y editar precios' },
  { code: 'supplier:read', label: 'Ver proveedores' },
  { code: 'supplier:write', label: 'Crear y editar proveedores' },
  { code: 'report:read', label: 'Ver reportes financieros y KPI' },
  { code: 'activity:write', label: 'Registrar actividades y tiempo' },
];

async function main(): Promise<void> {
  const workshopName = process.env['SEED_WORKSHOP_NAME'] ?? 'Taller Principal';
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@taller.com';
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin1234!Secure';

  const workshop = await prisma.workshop.upsert({
    where: { id: 'seed-workshop' },
    update: { name: workshopName },
    create: { id: 'seed-workshop', name: workshopName },
  });

  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: { label: perm.label },
      create: perm,
    });
  }

  const passwordHash = await argon2.hash(adminPassword, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, isActive: true },
    create: {
      workshopId: workshop.id,
      email: adminEmail,
      passwordHash,
      firstName: 'Admin',
      lastName: 'Principal',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('Seed completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
