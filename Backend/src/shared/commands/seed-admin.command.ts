import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { CreateUserUseCase } from '../../auth/application/usecases/create-user.usecase';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const createUser = app.get(CreateUserUseCase);

    const username = process.env.SEED_ADMIN_USERNAME;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!username || !password) {
        console.error('❌ SEED_ADMIN_USERNAME y SEED_ADMIN_PASSWORD son requeridos');
        await app.close();
        process.exit(1);
    }

    await createUser.execute({ username, password, role: 'admin' });

    
    await app.close();
}

bootstrap().catch(console.error);