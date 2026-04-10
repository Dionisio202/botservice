import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { IBcryptAdapter } from './interfaces/IBcryptAdapter';

@Injectable()
export class BcryptAdapter implements IBcryptAdapter {
    private readonly rounds = 10;

    async hash(password: string): Promise<string> {
        return bcrypt.hash(password, this.rounds);
    }

    async compare(password: string, hash: string): Promise<boolean> {
        return bcrypt.compare(password, hash);
    }
}