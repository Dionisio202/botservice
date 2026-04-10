import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { PanelController } from './presentation/controller/panel.controller';

@Module({
    imports:     [SharedModule],
    controllers: [PanelController],
})
export class PanelModule {}