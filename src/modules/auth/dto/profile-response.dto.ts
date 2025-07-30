import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ description: 'ID único del usuario' })
  id: number;

  @ApiProperty({ description: 'Correo electrónico del usuario' })
  email: string;

  @ApiProperty({ description: 'Nombre del usuario' })
  first_name: string;

  @ApiProperty({ description: 'Apellido del usuario' })
  last_name: string;

  @ApiProperty({ description: 'Nombre completo del usuario' })
  full_name: string;

  @ApiProperty({ description: 'Número de teléfono del usuario', nullable: true })
  phone_number: string;

  @ApiProperty({ description: 'Rol del usuario en el sistema', enum: ['admin', 'operator'] })
  role: string;

  @ApiProperty({ description: 'Tipo de usuario descriptivo' })
  user_type: string;

  @ApiProperty({ description: 'URL de la imagen de perfil', nullable: true })
  profile_picture: string;

  @ApiProperty({ description: 'Estado de activación del usuario' })
  active: boolean;

  @ApiProperty({ description: 'Fecha de creación de la cuenta' })
  created_at: string;

  @ApiProperty({ description: 'Última fecha de inicio de sesión', nullable: true })
  last_login: string;

  @ApiProperty({ description: 'Permisos del usuario', type: [String] })
  permissions: string[];

  @ApiProperty({ description: 'Estado de la cuenta', enum: ['active', 'inactive'] })
  account_status: string;
} 