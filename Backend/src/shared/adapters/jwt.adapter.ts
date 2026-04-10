import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IJwtAdapter } from './interfaces/IJwtAdapter';

@Injectable()
export class JwtAdapter implements IJwtAdapter {
    constructor(private readonly jwtService: JwtService) {}

    sign(payload: Record<string, unknown>): string {
        return this.jwtService.sign(payload);
    }

    verify<T extends object>(token: string): T {
    return this.jwtService.verify<T>(token);
}
}