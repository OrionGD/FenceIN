import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Security & Request Bypass
  app.use(helmet());
  
  // Intercept and resolve /favicon.ico requests gracefully with 204 No Content
  app.use((req: any, res: any, next: any) => {
    if (req.originalUrl === '/favicon.ico') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.enableCors({
    origin: ['http://localhost:2345', 'http://127.0.0.1:2345'], // Frontend origins
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  
  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Global Filters & Interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());
  
  // API Versioning
  app.setGlobalPrefix('api/v1');

  // Swagger OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('FenceIn API')
    .setDescription('The Biometric Workforce Intelligence Enterprise API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3456);
}
bootstrap();
