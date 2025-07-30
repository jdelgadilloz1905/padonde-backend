import { Controller, Post, Body, UseGuards, Get, Put, Param } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Roles } from './decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @ApiOperation({ summary: 'Iniciar sesión' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login exitoso, retorna token JWT' })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(@Body() loginDto: LoginDto, @CurrentUser() user) {
    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  @ApiResponse({ 
    status: 200, 
    description: 'Perfil de usuario recuperado con información detallada',
    type: ProfileResponseDto
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  getProfile(@CurrentUser() user): ProfileResponseDto {
    // Determinar tipo de usuario más descriptivo
    const userType = user.role === 'admin' ? 'Administrador del Sistema' : 'Operador';
    
    // Definir permisos según el rol
    const permissions = user.role === 'admin' 
      ? ['create_users', 'manage_drivers', 'view_analytics', 'system_config', 'all_permissions']
      : ['manage_drivers', 'view_analytics', 'basic_operations'];
    
    // Estado de la cuenta
    const accountStatus = user.active ? 'active' : 'inactive';
    
    return {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      full_name: `${user.first_name} ${user.last_name}`,
      phone_number: user.phone_number,
      role: user.role,
      user_type: userType,
      profile_picture: user.profile_picture,
      active: user.active,
      created_at: user.created_at,
      last_login: user.last_login,
      permissions: permissions,
      account_status: accountStatus
    };
  }

  @Post('validate-token')
  @ApiOperation({ summary: 'Validar token JWT' })
  @ApiBody({ schema: {
    type: 'object',
    properties: {
      token: { type: 'string' }
    },
    required: ['token']
  }})
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 401, description: 'Token inválido' })
  async validateToken(@Body() body: { token: string }) {
    return this.authService.validateToken(body.token);
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear nuevo usuario administrativo (solo admins)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 403, description: 'Sin permisos suficientes' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @Put('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cambiar contraseña del usuario actual' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña cambiada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado o contraseña actual incorrecta' })
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @CurrentUser() user
  ) {
    await this.authService.changePassword(
      user.id, 
      changePasswordDto.currentPassword, 
      changePasswordDto.newPassword
    );
    
    return { 
      success: true, 
      message: 'Contraseña cambiada exitosamente' 
    };
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Solicitar recuperación de contraseña' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({ status: 200, description: 'Email de recuperación enviado si el usuario existe' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { 
      success: true, 
      message: 'Si el email existe, recibirás un enlace de recuperación' 
    };
  }

  @Get('validate-reset-token/:token')
  @ApiOperation({ summary: 'Validar token de reset de contraseña' })
  @ApiResponse({ status: 200, description: 'Token válido' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async validateResetToken(@Param('token') token: string) {
    const result = await this.authService.validateResetToken(token);
    if (!result.valid) {
      return { valid: false, message: 'Token inválido o expirado' };
    }
    return { valid: true, email: result.email };
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Restablecer contraseña con token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({ status: 200, description: 'Contraseña restablecida exitosamente' })
  @ApiResponse({ status: 400, description: 'Token inválido o expirado' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    // Manejar ambos campos: newPassword y password
    const newPassword = resetPasswordDto.newPassword || resetPasswordDto.password;
    
    await this.authService.resetPassword(resetPasswordDto.token, newPassword);
    return { 
      success: true, 
      message: 'Contraseña restablecida exitosamente' 
    };
  }
} 