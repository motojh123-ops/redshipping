import { ConflictException, Injectable, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { ChangePasswordDto, LoginDto, RefreshTokenDto, UpdateProfileDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  onModuleInit() {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const secret = this.configService.get<string>('JWT_SECRET');
    if (isProd && (!secret || secret.includes('super_secret') || secret.length < 32)) {
      throw new Error('FATAL: Production JWT_SECRET is missing or using an insecure default value.');
    }
  }

  async login(loginDto: LoginDto) {
    const cleanEmail = (loginDto.email || '').trim().toLowerCase();

    // Single source of truth: the database
    const user = await this.prisma.user.findFirst({
      where: { email: cleanEmail },
      include: { company: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('Your user account has been deactivated');
    }

    if (user.company && user.company.isActive === false) {
      throw new UnauthorizedException('Your company account has been deactivated');
    }

    const passwordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    try {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
    } catch {
      // Non-critical timestamp update failure
    }

    const tokens = this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company?.name || '',
        currencyDefault: user.company?.currencyDefault || 'USD',
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    const secret = this.getJwtRefreshSecret();
    const payload = this.jwtService.verify<JwtPayload>(refreshTokenDto.refreshToken, {
      secret,
    });

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { company: true },
    });

    if (!user || user.isActive === false || (user.company && user.company.isActive === false)) {
      throw new UnauthorizedException('User account no longer active');
    }

    return this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
    });
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const cleanEmail = (updateProfileDto.email || '').trim().toLowerCase();

    // Prevent taking another user's email within the same company
    const emailTaken = await this.prisma.user.findFirst({
      where: {
        companyId: (await this.prisma.user.findUnique({ where: { id: userId }, select: { companyId: true } }))?.companyId,
        email: cleanEmail,
        id: { not: userId },
      },
    });
    if (emailTaken) {
      throw new ConflictException('This email is already used by another user in your company');
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: updateProfileDto.name.trim(),
        email: cleanEmail,
        phone: updateProfileDto.phone?.trim() || null,
      },
      include: { company: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name || '',
      currencyDefault: user.company?.currencyDefault || 'USD',
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const currentValid = await bcrypt.compare(changePasswordDto.currentPassword, user.passwordHash);
    if (!currentValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new ConflictException('New password must be different from the current password');
    }

    const passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private getJwtRefreshSecret(): string {
    return (
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'banna_super_secret_jwt_key_2026'
    );
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getJwtRefreshSecret(),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return { accessToken, refreshToken };
  }
}
