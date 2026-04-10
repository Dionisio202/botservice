import 'dotenv/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { AppModule } from './app.module';
import { TransformInterceptor } from './shared/interceptors/transform.interceptor';
import { HttpExceptionFilter } from './shared/filters/http-exception.filter';
import { PrismaService } from './shared/database/prisma.service';
import { CreateUserUseCase } from './auth/application/usecases/create-user.usecase';

async function seedAdminIfNeeded(app: INestApplication): Promise<void> {
    const username = process.env.SEED_ADMIN_USERNAME;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!username || !password) return;

    const prisma     = app.get(PrismaService);
    const exists     = await prisma.panelUser.findUnique({ where: { username } });
    if (exists) return;

    const createUser = app.get(CreateUserUseCase);
    await createUser.execute({ username, password, role: 'admin' });
    console.log(`✅ Admin inicial creado: ${username}`);
}

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

    app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/media' });

    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    app.useGlobalInterceptors(new TransformInterceptor(new Reflector()));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.enableCors({ origin: process.env.CORS_ORIGIN });

    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('Ecuentrega Bot API')
            .setDescription('API del bot de WhatsApp para confirmación de pedidos')
            .setVersion('1.0')
            .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'JWT-auth')
            .build();

        const document = SwaggerModule.createDocument(app, config);

        Object.values(document.paths).forEach((path: any) => {
            Object.values(path).forEach((operation: any) => {
                operation.security = [{ 'JWT-auth': [] }];
            });
        });

        SwaggerModule.setup('api', app, document);
    }

    await seedAdminIfNeeded(app);
    await app.listen(process.env.PORT ?? 3000);
}

bootstrap();