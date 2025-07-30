import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCommissionToZones1734000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agregar la columna commission_percentage a la tabla zones
    await queryRunner.query(`
      ALTER TABLE zones 
      ADD COLUMN IF NOT EXISTS commission_percentage DECIMAL(5,2) DEFAULT 10.00
    `);

    // Actualizar zonas existentes que no tengan valor de comisión
    await queryRunner.query(`
      UPDATE zones 
      SET commission_percentage = 10.00 
      WHERE commission_percentage IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Eliminar la columna commission_percentage
    await queryRunner.query(`
      ALTER TABLE zones
      DROP COLUMN IF EXISTS commission_percentage
    `);
  }
} 