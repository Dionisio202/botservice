import { Template } from '../entities/template.entity';

export interface ITemplateRepository {
    findAll(): Promise<Template[]>;
    findById(id: number): Promise<Template | null>;
    findActive(): Promise<Template[]>;
    create(data: CreateTemplateData): Promise<Template>;
    update(id: number, data: Partial<CreateTemplateData>): Promise<Template>;
    delete(id: number): Promise<void>;
}

export interface CreateTemplateData {
    name:             string;
    wa_template_name: string;
    category:         string;
    language:         string;
    body:             string;
    variables?:       unknown;
    created_by?:      number;
}