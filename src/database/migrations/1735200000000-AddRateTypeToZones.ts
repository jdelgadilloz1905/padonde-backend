import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRateTypeToZones1735200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Crear tipo ENUM para rate_type si no existe
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE zone_rate_type_enum AS ENUM ('flat_rate', 'minute_rate');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$
    `);

    // 2. Agregar campo rate_type a la tabla zones
    await queryRunner.query(`
      ALTER TABLE zones 
      ADD COLUMN IF NOT EXISTS rate_type zone_rate_type_enum NULL
    `);

    // 3. Agregar comentario al campo
    await queryRunner.query(`
      COMMENT ON COLUMN zones.rate_type IS 'Tipo de tarifa de zona: flat_rate (tarifa plana) o minute_rate (por minuto)'
    `);

    // 4. Crear índice para optimizar consultas
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_zones_rate_type 
      ON zones(rate_type) 
      WHERE rate_type IS NOT NULL
    `);

    // 5. Actualizar zonas existentes con valores por defecto basados en sus tarifas actuales
    // Si la zona tiene flat_rate, establecer rate_type = 'flat_rate'
    await queryRunner.query(`
      UPDATE zones 
      SET rate_type = 'flat_rate' 
      WHERE flat_rate IS NOT NULL 
        AND rate_type IS NULL
    `);

    // 6. Para zonas sin flat_rate, establecer rate_type = 'minute_rate' (comportamiento tradicional)
    await queryRunner.query(`
      UPDATE zones 
      SET rate_type = 'minute_rate' 
      WHERE flat_rate IS NULL 
        AND rate_type IS NULL
        AND price_per_minute IS NOT NULL
    `);

    // 7. Para zonas activas sin configuración, usar minute_rate por defecto
    await queryRunner.query(`
      UPDATE zones 
      SET rate_type = 'minute_rate' 
      WHERE rate_type IS NULL 
        AND active = TRUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Eliminar índice
    await queryRunner.query(`DROP INDEX IF EXISTS idx_zones_rate_type`);

    // 2. Eliminar campo de la tabla zones
    await queryRunner.query(`
      ALTER TABLE zones 
      DROP COLUMN IF EXISTS rate_type
    `);

    // 3. Eliminar tipo ENUM
    await queryRunner.query(`DROP TYPE IF EXISTS zone_rate_type_enum`);
  }
} 