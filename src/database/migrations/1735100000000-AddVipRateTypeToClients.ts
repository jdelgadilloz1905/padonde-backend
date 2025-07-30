import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVipRateTypeToClients1735100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tipo ENUM para vip_rate_type
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE vip_rate_type_enum AS ENUM ('flat_rate', 'minute_rate');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // 2. Agregar campo vip_rate_type a la tabla clients
    await queryRunner.query(`
      ALTER TABLE clients 
      ADD COLUMN IF NOT EXISTS vip_rate_type vip_rate_type_enum NULL
    `);

    // 3. Agregar comentario al campo
    await queryRunner.query(`
      COMMENT ON COLUMN clients.vip_rate_type IS 'Tipo de tarifa VIP a aplicar: flat_rate (tarifa plana) o minute_rate (por minuto)'
    `);

    // 4. Crear índice para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_clients_vip_rate_type 
      ON clients(vip_rate_type) 
      WHERE vip_rate_type IS NOT NULL
    `);

    // 5. Actualizar clientes VIP existentes con valores por defecto basados en sus tarifas actuales
    await queryRunner.query(`
      UPDATE clients 
      SET vip_rate_type = 'flat_rate' 
      WHERE is_vip = TRUE 
        AND flat_rate IS NOT NULL 
        AND minute_rate IS NULL
        AND vip_rate_type IS NULL
    `);

    await queryRunner.query(`
      UPDATE clients 
      SET vip_rate_type = 'minute_rate' 
      WHERE is_vip = TRUE 
        AND minute_rate IS NOT NULL 
        AND flat_rate IS NULL
        AND vip_rate_type IS NULL
    `);

    // 6. Para clientes VIP que tienen ambas tarifas, usar flat_rate por defecto
    await queryRunner.query(`
      UPDATE clients 
      SET vip_rate_type = 'flat_rate' 
      WHERE is_vip = TRUE 
        AND flat_rate IS NOT NULL 
        AND minute_rate IS NOT NULL
        AND vip_rate_type IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índice
    await queryRunner.query(`DROP INDEX IF EXISTS idx_clients_vip_rate_type`);

    // 2. Eliminar campo de la tabla clients
    await queryRunner.query(`
      ALTER TABLE clients 
      DROP COLUMN IF EXISTS vip_rate_type
    `);

    // 3. Eliminar tipo ENUM
    await queryRunner.query(`DROP TYPE IF EXISTS vip_rate_type_enum`);
  }
} 