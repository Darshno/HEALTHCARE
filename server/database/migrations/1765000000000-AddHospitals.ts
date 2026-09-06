import { MigrationInterface, QueryRunner } from "typeorm";

export class AddHospitals1765000000000 implements MigrationInterface {
  name = "AddHospitals1765000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        CREATE TYPE "hospitals_language_enum" AS ENUM ('en', 'hi');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END
      $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "hospitals" (
        "id" SERIAL NOT NULL,
        "name" character varying(255) NOT NULL,
        "language" "hospitals_language_enum" NOT NULL DEFAULT 'en',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_hospitals" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "hospitals"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "hospitals_language_enum"`);
  }
}
