import { Injectable, NotFoundException, UnauthorizedException, Inject } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import type { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { BcryptAdapter } from '../../../shared/adapters/bcrypt.adapter';

export class ChangePasswordDto {
    @IsString() @IsNotEmpty() username:     string;
    @IsString() @IsNotEmpty() old_password: string;
    @IsString() @IsNotEmpty() new_password: string;
}

@Injectable()
export class ChangePasswordUseCase {
    constructor(
        @Inject('IAuthRepository')
        private readonly authRepo: IAuthRepository,
        private readonly bcrypt:   BcryptAdapter,
    ) {}

    async execute(dto: ChangePasswordDto): Promise<{ message: string }> {
        const user = await this.authRepo.findByUsername(dto.username);
        if (!user) throw new NotFoundException('Usuario no encontrado');

        const valid = await this.bcrypt.compare(dto.old_password, user.password_hash);
        if (!valid) throw new UnauthorizedException('Contraseña actual incorrecta');

        const password_hash = await this.bcrypt.hash(dto.new_password);
        await this.authRepo.updatePassword(user.id, password_hash);

        return { message: 'Contraseña actualizada correctamente' };
    }
}