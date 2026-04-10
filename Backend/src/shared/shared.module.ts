import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './database/prisma.service';
import { BcryptAdapter } from './adapters/bcrypt.adapter';
import { JwtAdapter } from './adapters/jwt.adapter';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UnitOfWorkService } from './infrastructure/unit-of-work.service';

@Global()
@Module({
    imports: [
      JwtModule.registerAsync({
    useFactory: () => ({
        secret:      process.env.JWT_SECRET,
        signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '8h') as '8h' },
    }),
}),
    ],
    providers: [
        PrismaService,
        UnitOfWorkService,
        BcryptAdapter,
        JwtAdapter,
        JwtAuthGuard,
        RolesGuard,
    ],
    exports: [
        PrismaService,
        UnitOfWorkService,
        BcryptAdapter,
        JwtAdapter,
        JwtAuthGuard,
        RolesGuard,
        JwtModule,
    ],
})
export class SharedModule {}