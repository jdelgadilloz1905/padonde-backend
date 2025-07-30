import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTariffFieldsToClientsAndZones1735000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Agregar campos de tarifa a la tabla clients
    await queryRunner.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS flat_rate DECIMAL(10,2) NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS minute_rate DECIMAL(10,2) NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT FALSE
    `);

    // 2. Agregar campos de tarifa a la tabla zones
    await queryRunner.query(`
      ALTER TABLE zones 
      ADD COLUMN IF NOT EXISTS flat_rate DECIMAL(10,2) NULL
    `);
    
    await queryRunner.query(`
      ALTER TABLE zones 
      ADD COLUMN IF NOT EXISTS has_special_clients BOOLEAN DEFAULT FALSE
    `);

    // 3. Crear tabla de relación zone_clients
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS zone_clients (
        zone_id INTEGER NOT NULL,
        client_id INTEGER NOT NULL,
        special_flat_rate DECIMAL(10,2) NULL,
        active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (zone_id, client_id),
        FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE,
        FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
      )
    `);

    // 4. Agregar comentarios usando COMMENT ON
    await queryRunner.query(`COMMENT ON COLUMN clients.flat_rate IS 'Tarifa plana personalizada para cliente VIP'`);
    await queryRunner.query(`COMMENT ON COLUMN clients.minute_rate IS 'Tarifa por minuto personalizada para el cliente'`);
    await queryRunner.query(`COMMENT ON COLUMN clients.is_vip IS 'Indica si el cliente es VIP con tarifas especiales'`);
    await queryRunner.query(`COMMENT ON COLUMN zones.flat_rate IS 'Tarifa plana para toda la zona (ignora price_per_minute)'`);
    await queryRunner.query(`COMMENT ON COLUMN zones.has_special_clients IS 'Indica si la zona tiene clientes con tarifas especiales'`);
    await queryRunner.query(`COMMENT ON COLUMN zone_clients.zone_id IS 'ID de la zona'`);
    await queryRunner.query(`COMMENT ON COLUMN zone_clients.client_id IS 'ID del cliente'`);
    await queryRunner.query(`COMMENT ON COLUMN zone_clients.special_flat_rate IS 'Tarifa especial para este cliente en esta zona específica'`);
    await queryRunner.query(`COMMENT ON COLUMN zone_clients.active IS 'Indica si la relación está activa'`);
    await queryRunner.query(`COMMENT ON COLUMN zone_clients.created_at IS 'Fecha de creación de la relación'`);

    // 5. Crear índices para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_flat_rate ON clients(flat_rate) WHERE flat_rate IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_minute_rate ON clients(minute_rate) WHERE minute_rate IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_is_vip ON clients(is_vip) WHERE is_vip = TRUE
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zones_flat_rate ON zones(flat_rate) WHERE flat_rate IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zone_clients_active ON zone_clients(active) WHERE active = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índices
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zone_clients_active`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zones_flat_rate`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_is_vip`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_minute_rate`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_flat_rate`);

    // 2. Eliminar tabla de relación
    await queryRunner.query(`DROP TABLE IF EXISTS zone_clients`);

    // 3. Eliminar campos de zones
    await queryRunner.query(`
      ALTER TABLE zones
      DROP COLUMN IF EXISTS has_special_clients,
      DROP COLUMN IF EXISTS flat_rate
    `);

    // 4. Eliminar campos de clients
    await queryRunner.query(`
      ALTER TABLE clients
      DROP COLUMN IF EXISTS is_vip,
      DROP COLUMN IF EXISTS minute_rate,
      DROP COLUMN IF EXISTS flat_rate
    `);
  }
} 