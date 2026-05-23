import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false, // disable default 100KB limit
  });

  // Allow large base64 image uploads (up to 10 MB)
  app.useBodyParser('json', { limit: '10mb' });
  app.useBodyParser('urlencoded', { limit: '10mb', extended: true });

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type,Authorization',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Mini-Jira backend running on port ${port}`);
}
bootstrap();
