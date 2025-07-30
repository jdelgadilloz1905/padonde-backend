import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCancellationReasons1733761968000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'cancellation_reasons',
        columns: [
          {
            name: 'id',
            type: 'int',
            isPrimary: true,
            isGenerated: true,
            generationStrategy: 'increment',
          },
          {
            name: 'reason',
            type: 'varchar',
            length: '255',
          },
          {
            name: 'description',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'isActive',
            type: 'boolean',
            default: true,
          },
          {
            name: 'userType',
            type: 'varchar',
            length: '50',
            comment: 'client, driver, or both',
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            onUpdate: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('cancellation_reasons');
  }
} 