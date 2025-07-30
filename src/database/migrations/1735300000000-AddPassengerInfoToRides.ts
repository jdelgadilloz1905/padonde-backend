import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddPassengerInfoToRides1735300000000 implements MigrationInterface {
  name = 'AddPassengerInfoToRides1735300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add passenger_count column
    await queryRunner.addColumn(
      'rides',
      new TableColumn({
        name: 'passenger_count',
        type: 'int',
        default: 1,
        isNullable: false,
      }),
    );

    // Add has_children_under_5 column
    await queryRunner.addColumn(
      'rides',
      new TableColumn({
        name: 'has_children_under_5',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Add is_round_trip column
    await queryRunner.addColumn(
      'rides',
      new TableColumn({
        name: 'is_round_trip',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the columns in reverse order
    await queryRunner.dropColumn('rides', 'is_round_trip');
    await queryRunner.dropColumn('rides', 'has_children_under_5');
    await queryRunner.dropColumn('rides', 'passenger_count');
  }
}