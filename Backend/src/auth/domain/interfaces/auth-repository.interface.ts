import { User } from '../entities/user.entity';

export interface IAuthRepository {
    findByUsername(username: string): Promise<User | null>;
    createUser(username: string, password_hash: string, role: 'admin' | 'agent'): Promise<{ id: number; username: string; role: string }>;
    updatePassword(id: number, password_hash: string): Promise<void>;
}