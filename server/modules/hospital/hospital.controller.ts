import { Controller, Get, Post, Body, Param, BadRequestException } from "@nestjs/common";
import { HospitalService } from "./hospital.service";

@Controller("api/hospitals")
export class HospitalController {
  constructor(private readonly hospitalService: HospitalService) {}

  @Get()
  async getAllHospitals() {
    return this.hospitalService.getAllHospitals();
  }

  @Get(":id")
  async getHospitalById(@Param("id") id: string) {
    const hospitalId = parseInt(id, 10);
    if (isNaN(hospitalId)) {
      throw new BadRequestException("Invalid hospital ID");
    }
    return this.hospitalService.getHospitalById(hospitalId);
  }

  @Post("register")
  async registerHospital(
    @Body() body: { name: string; language?: "en" | "hi" },
  ) {
    if (!body.name || body.name.trim().length === 0) {
      throw new BadRequestException("Hospital name is required");
    }
    return this.hospitalService.registerHospital(body.name, body.language);
  }
}
