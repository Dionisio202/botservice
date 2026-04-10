export type TemplateCategory = 'marketing' | 'utility' | 'authentication';

export class Template {
    constructor(
        public readonly id:               number,
        public readonly name:             string,
        public readonly wa_template_name: string,
        public readonly category:         TemplateCategory,
        public readonly language:         string,
        public readonly body:             string,
        public readonly is_active:        boolean,
    ) {}

    isActive(): boolean { return this.is_active; }
}