import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findUnique({ where: { email: 'superadmin@fencein.app' } });
  console.log('USER:', user);
  await prisma.$disconnect();
})();
