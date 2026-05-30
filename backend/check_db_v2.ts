import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const prisma = app.get(PrismaService);
  const users = await prisma.user.findMany();
  console.log(JSON.stringify(users.map(u => ({ email: u.email, tenantId: u.tenantId, role: u.userRole })), null, 2));
  await app.close();
}
bootstrap();
