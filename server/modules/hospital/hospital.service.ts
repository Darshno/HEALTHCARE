import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Hospital } from "../../database/entities/hospital.entity";

@Injectable()
export class HospitalService {
  private readonly logger = new Logger(HospitalService.name);

  constructor(
    @InjectRepository(Hospital)
    private readonly hospitalRepo: Repository<Hospital>,
  ) {}

  async getAllHospitals(): Promise<Hospital[]> {
    try {
      const hospitals = await this.hospitalRepo.find({
        order: { createdAt: "DESC" },
      });
      return hospitals;
    } catch (error) {
      this.logger.error("Failed to fetch hospitals", error);
      throw error;
    }
  }

  async getHospitalById(id: number): Promise<Hospital | null> {
    try {
      return await this.hospitalRepo.findOne({ where: { id } });
    } catch (error) {
      this.logger.error(`Failed to fetch hospital ${id}`, error);
      throw error;
    }
  }

  async registerHospital(
    name: string,
    language: "en" | "hi" = "en",
  ): Promise<Hospital> {
    try {
      // Check if hospital with same name already exists (case-insensitive)
      const existing = await this.hospitalRepo.findOne({
        where: {
          name: name.trim(),
        },
      });

      if (existing) {
        return existing; // Return existing instead of throwing
      }

      const hospital = this.hospitalRepo.create({
        name: name.trim(),
        language,
      });

      const saved = await this.hospitalRepo.save(hospital);
      this.logger.log(`Hospital registered: ${saved.name} (ID: ${saved.id})`);
      return saved;
    } catch (error) {
      this.logger.error("Failed to register hospital", error);
      throw error;
    }
  }

  async updateHospital(
    id: number,
    data: { name?: string; language?: "en" | "hi" },
  ): Promise<Hospital> {
    try {
      const hospital = await this.hospitalRepo.findOne({ where: { id } });
      if (!hospital) {
        throw new BadRequestException(`Hospital with ID ${id} not found`);
      }

      if (data.name) {
        hospital.name = data.name.trim();
      }
      if (data.language) {
        hospital.language = data.language;
      }

      return await this.hospitalRepo.save(hospital);
    } catch (error) {
      this.logger.error(`Failed to update hospital ${id}`, error);
      throw error;
    }
  }
}
