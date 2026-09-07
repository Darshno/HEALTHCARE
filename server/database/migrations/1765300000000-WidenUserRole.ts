import { MigrationInterface, QueryRunner } from "typeorm";

export class WidenUserRole1765300000000 implements MigrationInterface {
  name = "WidenUserRole1765300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role" TYPE character varying(32),
        ALTER COLUMN "role" SET DEFAULT 'DOCTOR'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "role" TYPE character varying(10),
        ALTER COLUMN "role" SET DEFAULT 'user'
    `);
  }
}
