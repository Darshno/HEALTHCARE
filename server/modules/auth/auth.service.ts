import { Injectable, Logger, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { User } from "../../database/entities";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password: string, hash: string): boolean {
  const parts = hash.split(":");
  if (parts.length !== 2) return false;
  const [salt, key] = parts;
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(keyBuffer, derivedKey);
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, "").replace(/^00/, "+");
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: {
    openId: string;
    name?: string;
    password?: string;
    role?: any;
    hospitalId?: number;
    email?: string;
    phone?: string;
  }): Promise<{ accessToken: string; user: User }> {
    const normalizedPhone = data.phone ? normalizePhone(data.phone) : null;
    let existing = await this.userRepo.findOne({
      where: [
        { openId: data.openId },
        ...(normalizedPhone ? [{ phone: normalizedPhone }] : []),
        ...(data.email ? [{ email: data.email.trim().toLowerCase() }] : []),
      ],
    });
    if (existing) {
      throw new BadRequestException(`User with identifier "${data.openId}" already exists`);
    }

    let passwordHash: string | null = null;
    if (data.password && data.password.trim().length > 0) {
      passwordHash = hashPassword(data.password.trim());
    }

    const user = this.userRepo.create({
      openId: data.openId,
      name: data.name || data.openId,
      passwordHash,
      role: data.role || "DOCTOR",
      hospitalId: data.hospitalId || 1,
      email: data.email || null,
      phone: normalizedPhone,
      lastSignedIn: new Date(),
    });

    const savedUser = await this.userRepo.save(user);
    const token = await this.generateJwt(savedUser);
    return { accessToken: token, user: savedUser };
  }

  async validateUserWithPassword(identifier: string, password?: string): Promise<User> {
    const normalizedIdentifier = identifier.trim();
    const phone = normalizePhone(normalizedIdentifier);
    let user = await this.userRepo.findOne({
      where: [
        { openId: normalizedIdentifier },
        { email: normalizedIdentifier.toLowerCase() },
        { phone },
      ],
    });
    if (!user) {
      user = this.userRepo.create({
        openId: normalizedIdentifier,
        hospitalId: 1,
        name: normalizedIdentifier,
        role: "DOCTOR",
        phone: /^\+?\d{7,15}$/.test(phone) ? phone : null,
      });
      if (password) {
        user.passwordHash = hashPassword(password.trim());
      }
      user = await this.userRepo.save(user);
      return user;
    }

    if (user.passwordHash && password) {
      const isMatch = verifyPassword(password.trim(), user.passwordHash);
      if (!isMatch) {
        throw new UnauthorizedException("Invalid password");
      }
    }

    user.lastSignedIn = new Date();
    await this.userRepo.save(user);
    return user;
  }

  async login(identifier: string, password?: string): Promise<{ accessToken: string; user: User }> {
    const user = await this.validateUserWithPassword(identifier, password);
    const accessToken = await this.generateJwt(user);
    return { accessToken, user };
  }

  async generateJwt(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      openId: user.openId,
      role: user.role,
      appId: process.env.VITE_APP_ID || "local-app",
      name: user.name || user.openId,
    };
    return this.jwtService.sign(payload);
  }

  async validateTokenPayload(payload: { sub: number; openId: string }): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }

  async getProfile(userId: number): Promise<User | null> {
    return this.userRepo.findOne({ where: { id: userId } });
  }

  async updateRole(userId: number, role: any): Promise<User> {
    await this.userRepo.update(userId, { role });
    return this.userRepo.findOne({ where: { id: userId } }) as Promise<User>;
  }
}
