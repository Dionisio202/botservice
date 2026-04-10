export interface IJwtAdapter {
    sign(payload: Record<string, unknown>): string;
    verify<T extends object>(token: string): T;
}