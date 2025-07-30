import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { AddPassengerInfoToRides1735300000000 } from '../src/database/migrations/1735300000000-AddPassengerInfoToRides';

dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'taxirosa',
  entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../src/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});

async function runMigration() {
  try {
    console.log('🚀 Conectando a la base de datos...');
    await dataSource.initialize();
    
    console.log('📋 Ejecutando migración AddPassengerInfoToRides...');
    const migration = new AddPassengerInfoToRides1735300000000();
    await migration.up(dataSource.createQueryRunner());
    
    console.log('✅ Migración ejecutada exitosamente!');
    console.log('📊 Campos agregados a la tabla rides:');
    console.log('   - passenger_count (INT, default: 1) - Número de pasajeros');
    console.log('   - has_children_under_5 (BOOLEAN, default: false) - Si hay niños menores de 5 años');
    console.log('   - is_round_trip (BOOLEAN, default: false) - Si es viaje de ida y vuelta');
    console.log('🎯 Los nuevos campos están disponibles en la API para crear y actualizar rides');
    
  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Conexión cerrada');
    process.exit(0);
  }
}

runMigration();