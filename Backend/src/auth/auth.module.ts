import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SharedModule } from '../shared/shared.module';
import { AuthController } from './presentation/controller/auth.controller';
import { LoginUseCase } from './application/usecases/login.usecase';
import { CreateUserUseCase } from './application/usecases/create-user.usecase';
import { ChangePasswordUseCase } from './application/usecases/change-password.usecase';
import { PrismaAuthRepository } from './infrastructure/repository/prisma-auth.repository';
import { JwtStrategy } from './infrastructure/jwt.strategy';

@Module({
    imports:     [SharedModule, PassportModule],
    controllers: [AuthController],
    providers: [
        LoginUseCase,
        CreateUserUseCase,
        ChangePasswordUseCase,
        JwtStrategy,
        { provide: 'IAuthRepository', useClass: PrismaAuthRepository },
    ],
    exports: [LoginUseCase],
})
export class AuthModule {}