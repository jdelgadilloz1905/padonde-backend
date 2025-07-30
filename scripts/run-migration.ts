import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { AddTariffFieldsToClientsAndZones1735000000000 } from '../src/database/migrations/1735000000000-AddTariffFieldsToClientsAndZones';

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
    
    console.log('📋 Ejecutando migración AddTariffFieldsToClientsAndZones...');
    const migration = new AddTariffFieldsToClientsAndZones1735000000000();
    await migration.up(dataSource.createQueryRunner());
    
    console.log('✅ Migración ejecutada exitosamente!');
    console.log('📊 Campos agregados:');
    console.log('   - clients.flat_rate (DECIMAL(10,2))');
    console.log('   - clients.minute_rate (DECIMAL(10,2))');
    console.log('   - clients.is_vip (BOOLEAN)');
    console.log('   - zones.flat_rate (DECIMAL(10,2))');
    console.log('   - zones.has_special_clients (BOOLEAN)');
    console.log('🔗 Tabla creada: zone_clients');
    console.log('🚀 Índices optimizados creados');
    
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