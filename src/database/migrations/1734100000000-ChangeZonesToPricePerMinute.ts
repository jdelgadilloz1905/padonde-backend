import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeZonesToPricePerMinute1734100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar la nueva columna para precio por minuto
    await queryRunner.query(`
      ALTER TABLE zones 
      ADD COLUMN IF NOT EXISTS price_per_minute DECIMAL(10,2) DEFAULT 5.00
    `);

    // Migrar datos existentes: convertir de price_intervals a un precio base por minuto
    // Usar el precio del primer intervalo como base (dividir por 2 para aproximar minutos)
    await queryRunner.query(`
      UPDATE zones 
      SET price_per_minute = CASE
        WHEN price_intervals IS NOT NULL AND jsonb_array_length(price_intervals) > 0 
        THEN GREATEST(1.00, CAST((price_intervals->0->>'price_per_km')::DECIMAL / 2 AS DECIMAL(10,2)))
        ELSE 5.00
      END
      WHERE price_per_minute IS NULL OR price_per_minute = 0
    `);

    // Hacer la columna NOT NULL después de poblarla
    await queryRunner.query(`
      ALTER TABLE zones 
      ALTER COLUMN price_per_minute SET NOT NULL
    `);

    // Eliminar la columna de intervalos de precios que ya no se utilizará
    await queryRunner.query(`
      ALTER TABLE zones
      DROP COLUMN IF EXISTS price_intervals
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Restaurar la columna de intervalos de precios
    await queryRunner.query(`
      ALTER TABLE zones
      ADD COLUMN IF NOT EXISTS price_intervals JSONB NULL
    `);

    // Restaurar un intervalo básico usando el precio por minuto actual
    await queryRunner.query(`
      UPDATE zones 
      SET price_intervals = json_build_array(
        json_build_object(
          'from_km', 0,
          'to_km', 999999,
          'price_per_km', price_per_minute * 2
        )
      )::jsonb
      WHERE price_intervals IS NULL
    `);

    // Eliminar la columna price_per_minute
    await queryRunner.query(`
      ALTER TABLE zones
      DROP COLUMN IF EXISTS price_per_minute
    `);
  }
} 