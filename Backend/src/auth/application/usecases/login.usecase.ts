import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import type { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { BcryptAdapter } from '../../../shared/adapters/bcrypt.adapter';
import { JwtAdapter } from '../../../shared/adapters/jwt.adapter';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUseCase {
    constructor(
        @Inject('IAuthRepository')
        private readonly authRepo: IAuthRepository,
        private readonly bcrypt:   BcryptAdapter,
        private readonly jwt:      JwtAdapter,
    ) {}

    async execute(dto: LoginDto): Promise<{ accessToken: string }> {
        const user = await this.authRepo.findByUsername(dto.username);

        if (!user || !user.isActive()) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const valid = await this.bcrypt.compare(dto.password, user.password_hash);
        if (!valid) {
            throw new UnauthorizedException('Credenciales inválidas');
        }

        const accessToken = this.jwt.sign({
            sub:      user.id,
            username: user.username,
            role:     user.role,
        });

        return { accessToken };
    }
}