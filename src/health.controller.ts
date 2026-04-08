import { Controller, Get } from '@nestjs/common';
import { SkipTransform } from './shared/decorators/skip-transform.decorator';
// prueba de commit
@Controller()
export class AppController {
    @Get('health')
    @SkipTransform()
    health(): string {
        return 'ok';
    }
}