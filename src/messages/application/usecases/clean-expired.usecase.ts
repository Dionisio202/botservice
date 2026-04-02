import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';

@Injectable()
export class CleanExpiredUseCase {
    constructor(
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    @Cron('0 2 * * *')
    async execute(): Promise<void> {
        await this.messageRepo.deleteExpired();
    }
}