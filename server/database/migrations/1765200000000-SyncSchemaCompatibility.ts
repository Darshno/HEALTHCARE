import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncSchemaCompatibility1765200000000 implements MigrationInterface {
  name = "SyncSchemaCompatibility1765200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sync_operations"
        ADD COLUMN IF NOT EXISTS "hospitalId" integer,
        ADD COLUMN IF NOT EXISTS "deviceId" character varying(128),
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sync_operations"
        DROP COLUMN IF EXISTS "version",
        DROP COLUMN IF EXISTS "deviceId",
        DROP COLUMN IF EXISTS "hospitalId"
    `);
  }
}
