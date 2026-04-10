import { Controller, Post, Body, HttpCode, UseGuards } from '@nestjs/common';
import { LoginUseCase } from '../../application/usecases/login.usecase';
import { CreateUserUseCase, CreateUserDto } from '../../application/usecases/create-user.usecase';
import { ChangePasswordUseCase, ChangePasswordDto } from '../../application/usecases/change-password.usecase';
import { LoginDto } from '../../application/dtos/login.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly loginUseCase:          LoginUseCase,
        private readonly createUserUseCase:     CreateUserUseCase,
        private readonly changePasswordUseCase: ChangePasswordUseCase,
    ) {}

    @Post('login')
    @HttpCode(200)
    login(@Body() dto: LoginDto) {
        return this.loginUseCase.execute(dto);
    }

    @Post('register')
    @HttpCode(201)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('admin')
    register(@Body() dto: CreateUserDto) {
        return this.createUserUseCase.execute(dto);
    }

    @Post('change-password')
@HttpCode(200)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
changePassword(@Body() dto: ChangePasswordDto) {
    return this.changePasswordUseCase.execute(dto);
}
}