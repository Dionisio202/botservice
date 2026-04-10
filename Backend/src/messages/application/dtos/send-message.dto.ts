import { IsString, IsNumber, IsOptional } from 'class-validator';

export class SendMessageDto {
    @IsString()
    declare phone: string;

    @IsString()
    declare content: string;

    @IsNumber()
    declare customerId: number;

    @IsNumber()
    @IsOptional()
    declare session_id?: number;
}