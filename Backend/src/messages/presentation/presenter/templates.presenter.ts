import { Template } from '../../domain/entities/template.entity';

export class TemplatesPresenter {
    static toResponse(template: Template) {
        return {
            id:               template.id,
            name:             template.name,
            wa_template_name: template.wa_template_name,
            category:         template.category,
            language:         template.language,
            body:             template.body,
            is_active:        template.is_active,
        };
    }

    static toList(templates: Template[]) {
        return templates.map(this.toResponse);
    }
}