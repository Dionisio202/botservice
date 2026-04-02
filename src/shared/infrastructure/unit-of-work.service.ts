import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class UnitOfWorkService {
    constructor(private readonly prisma: PrismaService) {}

    async run<T>(fn: (tx: PrismaService) => Promise<T>): Promise<T> {
        return this.prisma.$transaction((tx) => fn(tx as PrismaService));
    }
}