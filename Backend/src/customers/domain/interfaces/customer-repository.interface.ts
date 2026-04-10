import { Customer } from '../entities/customer.entity';

export interface ICustomerRepository {
    findByPhone(phone: string): Promise<Customer | null>;
    create(phone: string, name?: string): Promise<Customer>;
    blacklist(id: number, reason: string, adminId: number): Promise<void>;
    unblacklist(id: number): Promise<void>;
    recordCancelled(phone: string): Promise<void>;
    recordConfirmed(phone: string): Promise<void>;
    recordExpired(phone: string): Promise<void>;
    recordLost(phone: string, amount: number): Promise<void>;
    flagAgentReview(phone: string, reason: string): Promise<void>;
    updateRiskScore(phone: string, score: number): Promise<void>;
    clearAgentReview(phone: string, trustFully?: boolean): Promise<void>;
}