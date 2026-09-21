import { Injectable, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';
import { LoginDto, RefreshTokenDto } from './dto/login.dto';
import { JwtPayload } from './jwt.strategy';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private dataStore: DataStoreService,
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

    // 1. Find user in Prisma or persistent data store
    let user: any = null;

    try {
      user = await this.prisma.user.findFirst({
        where: { email: cleanEmail },
        include: { company: true },
      });
    } catch (err: any) {
      this.logger.warn(`Prisma unavailable, checking local user registry: ${err.message}`);
    }

    if (!user) {
      user = this.dataStore.users.find((u) => u.email.toLowerCase() === cleanEmail);
    }

    // 2. Reject non-existent user immediately
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify user and company active status
    if (user.isActive === false) {
      throw new UnauthorizedException('Your user account has been deactivated');
    }

    if (user.company && user.company.isActive === false) {
      throw new UnauthorizedException('Your company account has been deactivated');
    }

    // 4. Strict cryptographic password verification with bcrypt
    const passwordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 5. Update last login timestamp safely
    try {
      if (user.id && !user.id.startsWith('usr-')) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    } catch {
      // Non-critical timestamp update failure
    }

    // 6. Generate authenticated tokens
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
        companyName: user.company?.name || user.companyName || 'RED SHIPPING International Logistics',
        currencyDefault: user.company?.currencyDefault || 'USD',
      },
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto) {
    try {
      const secret = this.getJwtRefreshSecret();
      const payload = this.jwtService.verify<JwtPayload>(refreshTokenDto.refreshToken, {
        secret,
      });

      let user: any = null;
      try {
        user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
          include: { company: true },
        });
      } catch {
        // Fallback to data store
      }

      if (!user) {
        user = this.dataStore.users.find((u) => u.id === payload.sub);
      }

      if (!user || user.isActive === false || (user.company && user.company.isActive === false)) {
        throw new UnauthorizedException('User account no longer active');
      }

      return this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  private getJwtSecret(): string {
    const secret = this.configService.get<string>('JWT_SECRET');
    if (!secret) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new Error('JWT_SECRET must be defined in production environment.');
      }
      return 'banna_super_secret_jwt_key_2026';
    }
    return secret;
  }

  private getJwtRefreshSecret(): string {
    const secret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!secret) {
      if (this.configService.get('NODE_ENV') === 'production') {
        throw new Error('JWT_REFRESH_SECRET must be defined in production environment.');
      }
      return 'banna_super_refresh_secret_2026';
    }
    return secret;
  }

  private generateTokens(payload: JwtPayload) {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.getJwtSecret(),
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.getJwtRefreshSecret(),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}
