import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { IsString, IsNotEmpty, IsIn } from 'class-validator';
import type { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { BcryptAdapter } from '../../../shared/adapters/bcrypt.adapter';

export class CreateUserDto {
    @IsString() @IsNotEmpty() username: string;
    @IsString() @IsNotEmpty() password: string;
    @IsIn(['admin', 'agent']) role: 'admin' | 'agent';
}

@Injectable()
export class CreateUserUseCase {
    constructor(
        @Inject('IAuthRepository')
        private readonly authRepo: IAuthRepository,
        private readonly bcrypt:   BcryptAdapter,
    ) {}

    async execute(dto: CreateUserDto): Promise<{ id: number; username: string; role: string }> {
        const existing = await this.authRepo.findByUsername(dto.username);
        if (existing) throw new ConflictException('El usuario ya existe');

        const password_hash = await this.bcrypt.hash(dto.password);
        return this.authRepo.createUser(dto.username, password_hash, dto.role);
    }
}