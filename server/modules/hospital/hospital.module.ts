import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Hospital } from "../../database/entities/hospital.entity";
import { HospitalService } from "./hospital.service";
import { HospitalController } from "./hospital.controller";

@Module({
  imports: [TypeOrmModule.forFeature([Hospital])],
  providers: [HospitalService],
  controllers: [HospitalController],
  exports: [HospitalService],
})
export class HospitalModule {}
