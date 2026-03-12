import { BotCustomerHistory } from '../../shared/dtos';

export interface ICustomerHistoryRepository {
    findOrCreate(phone: string): Promise<BotCustomerHistory>;
    isBlacklisted(phone: string): Promise<boolean>;
    recordNewOrder(phone: string): Promise<void>;
    recordConfirmed(phone: string): Promise<void>;
    recordCancelled(phone: string): Promise<void>;
    recordExpired(phone: string): Promise<void>;
}