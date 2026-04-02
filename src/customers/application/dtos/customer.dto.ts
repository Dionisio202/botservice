import { IsString, IsNotEmpty, IsNumber, IsPositive } from 'class-validator';

export class BlacklistDto {
    @IsString()
    @IsNotEmpty()
    reason: string;

    @IsNumber()
    adminId: number;
}

export class RecordLostDto {
    @IsNumber()
    @IsPositive()
    amount: number;
}