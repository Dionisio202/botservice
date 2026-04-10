import { Injectable, Inject } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { unlink } from 'fs/promises';
import { join } from 'path';
import type { IMessageRepository } from '../../domain/interfaces/message-repository.interface';

@Injectable()
export class CleanExpiredUseCase {
    constructor(
        @Inject('IMessageRepository')
        private readonly messageRepo: IMessageRepository,
    ) {}

    @Cron('0 2 * * *')
    async execute(): Promise<void> {
        const expiredMessages = await this.messageRepo.findExpiredWithMedia();
        await this.deleteOrphanedFiles(expiredMessages.map((m) => m.media_url));
        await this.messageRepo.deleteExpired();
    }

    private async deleteOrphanedFiles(mediaUrls: (string | null)[]): Promise<void> {
        const deletions = mediaUrls
            .filter((url): url is string => !!url)
            .map((url) => {
                const filename = url.split('/media/').at(-1);
                if (!filename) return Promise.resolve();
                const filepath = join(process.cwd(), 'public', 'media', filename);
                return unlink(filepath).catch(() => {});
            });

        await Promise.allSettled(deletions);
    }
}