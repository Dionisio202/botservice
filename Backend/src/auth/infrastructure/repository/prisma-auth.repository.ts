import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import type { IAuthRepository } from '../../domain/interfaces/auth-repository.interface';
import { User } from '../../domain/entities/user.entity';

@Injectable()
export class PrismaAuthRepository implements IAuthRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findByUsername(username: string): Promise<User | null> {
        const row = await this.prisma.panelUser.findUnique({ where: { username } });
        if (!row) return null;
        return new User(row.id, row.username, row.password_hash, row.role, row.is_active);
    }

    async createUser(username: string, password_hash: string, role: 'admin' | 'agent'): Promise<{ id: number; username: string; role: string }> {
        const row = await this.prisma.panelUser.create({
            data: { username, password_hash, role },
        });
        return { id: row.id, username: row.username, role: row.role };
    }

    async updatePassword(id: number, password_hash: string): Promise<void> {
        await this.prisma.panelUser.update({
            where: { id },
            data:  { password_hash },
        });
    }
}