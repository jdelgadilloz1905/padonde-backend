import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../src/entities/user.entity';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

async function createAdminUser() {
  console.log('🚀 Iniciando script de creación de administrador...');
  
  // Configuración de base de datos (usando las mismas variables que la app principal)
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'taxirosa',
    entities: [User],
    synchronize: process.env.NODE_ENV !== 'production', // Igual que la app principal
    logging: false, // Reducir logs para el script
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    console.log('🔌 Conectando a la base de datos...');
    console.log(`📍 Host: ${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}`);
    console.log(`🗄️  Base de datos: ${process.env.DB_DATABASE || 'taxirosa'}`);
    
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    const userRepository = dataSource.getRepository(User);

    // Verificar si ya existe un usuario administrador
    console.log('🔍 Verificando si ya existe un administrador...');
    const existingAdmin = await userRepository.findOne({
      where: { email: 'admin@taxirosa.com' }
    });

    if (existingAdmin) {
      console.log('⚠️  Ya existe un usuario administrador:');
      console.log(`   ID: ${existingAdmin.id}`);
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Nombre: ${existingAdmin.first_name} ${existingAdmin.last_name}`);
      console.log(`   Rol: ${existingAdmin.role}`);
      console.log('');
      console.log('✅ El administrador ya está configurado. No es necesario crear otro.');
      console.log('💡 Si necesita cambiar la contraseña, use el endpoint: PUT /auth/change-password');
      return;
    }

    console.log('👤 Creando nuevo usuario administrador...');
    
    const adminPassword = 'TaxiRosa2025!';
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    const adminUser = userRepository.create({
      email: 'admin@taxirosa.com',
      password: hashedPassword,
      first_name: 'Administrador',
      last_name: 'Sistema',
      role: 'admin',
      phone_number: '+584120000000',
      active: true,
      cognito_id: null
    });

    const savedUser = await userRepository.save(adminUser);

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('📧 Email: admin@taxirosa.com');
    console.log('🔑 Contraseña: TaxiRosa2025!');
    console.log(`🆔 ID: ${savedUser.id}`);
    console.log('');
    console.log('⚠️  IMPORTANTE: Cambie esta contraseña después del primer login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 No se puede conectar a PostgreSQL. Verifique que:');
      console.log('   - PostgreSQL esté ejecutándose');
      console.log('   - Las credenciales sean correctas');
      console.log('   - El puerto 5432 esté disponible');
      console.log('');
      console.log('🔧 Variables de entorno actuales:');
      console.log(`   DB_HOST: ${process.env.DB_HOST || 'localhost'}`);
      console.log(`   DB_PORT: ${process.env.DB_PORT || '5432'}`);
      console.log(`   DB_DATABASE: ${process.env.DB_DATABASE || 'taxirosa'}`);
      console.log(`   DB_USERNAME: ${process.env.DB_USERNAME || 'postgres'}`);
    } else if (error.code === '23505') {
      console.log('⚠️  Ya existe un usuario con ese email o ID');
      console.log('💡 Esto puede pasar si:');
      console.log('   - Ya se ejecutó este script anteriormente');
      console.log('   - Existe un usuario con email admin@taxirosa.com');
      console.log('');
      console.log('🔍 Para verificar usuarios existentes, conecte a la base de datos y ejecute:');
      console.log('   SELECT id, email, first_name, last_name, role FROM users WHERE email = \'admin@taxirosa.com\';');
      console.log('');
      console.log('✅ Si necesita cambiar la contraseña del admin existente:');
      console.log('   Use el endpoint: PUT /auth/change-password');
    } else if (error.code === '42P01') {
      console.log('💡 La tabla users no existe. Ejecute la aplicación primero para crear las tablas.');
    } else if (error.code === '3D000') {
      console.log('💡 La base de datos no existe. Créela primero.');
    } else if (error.code === '42703') {
      console.log('💡 La columna password no existe. La tabla users necesita ser actualizada.');
      console.log('   Ejecute la aplicación principal para que TypeORM cree la columna.');
    } else {
      console.log('💡 Error de base de datos:', error.code || 'UNKNOWN');
      console.log('💡 Mensaje:', error.message);
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  createAdminUser().catch(console.error);
}

export { createAdminUser }; 