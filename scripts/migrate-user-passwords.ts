import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../src/entities/user.entity';
import { config } from 'dotenv';

// Cargar variables de entorno
config();

async function migrateUserPasswords() {
  // Configuración de base de datos (usando las mismas variables que la app principal)
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'taxirosa',
    entities: [User],
    synchronize: process.env.NODE_ENV !== 'production',
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Conexión a base de datos establecida');

    const userRepository = dataSource.getRepository(User);

    // Obtener usuarios sin contraseña
    const usersWithoutPassword = await userRepository.find({
      where: { password: null }
    });

    console.log(`🔍 Encontrados ${usersWithoutPassword.length} usuarios sin contraseña`);

    if (usersWithoutPassword.length === 0) {
      console.log('✅ Todos los usuarios ya tienen contraseña');
      return;
    }

    // Contraseña temporal para usuarios existentes
    const temporaryPassword = 'TaxiRosa2025!';
    const saltRounds = 12;
    const hashedTempPassword = await bcrypt.hash(temporaryPassword, saltRounds);

    // Actualizar usuarios existentes
    for (const user of usersWithoutPassword) {
      await userRepository.update(
        { id: user.id },
        { password: hashedTempPassword }
      );
      
      console.log(`✅ Contraseña temporal asignada a: ${user.email} (ID: ${user.id})`);
    }

    console.log('');
    console.log('🎉 MIGRACIÓN COMPLETADA');
    console.log(`📊 Usuarios actualizados: ${usersWithoutPassword.length}`);
    console.log('🔑 Contraseña temporal: TaxiRosa2025!');
    console.log('');
    console.log('⚠️  IMPORTANTE:');
    console.log('   - Todos los usuarios deben cambiar su contraseña en el primer login');
    console.log('   - Use el endpoint PUT /auth/change-password');

  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    
    if (error.code === '42P01') {
      console.log('💡 La tabla users no existe. Ejecute la aplicación primero para crear las tablas.');
    } else if (error.code === '42703') {
      console.log('💡 La columna password no existe aún. La migración se aplicará automáticamente.');
    }
  } finally {
    await dataSource.destroy();
    console.log('🔌 Conexión cerrada');
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  migrateUserPasswords().catch(console.error);
}

export { migrateUserPasswords }; 