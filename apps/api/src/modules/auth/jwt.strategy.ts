import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { DataStoreService } from '../../database/data-store.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  companyId: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private dataStore: DataStoreService,
  ) {
    const secret = configService.get<string>('JWT_SECRET') || 'banna_super_secret_jwt_key_2026';
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    let user: any = null;

    try {
      user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });
    } catch {
      // Prisma unavailable, check data store
    }

    if (!user) {
      user = this.dataStore.users.find((u) => u.id === payload.sub);
    }

    if (!user) {
      throw new UnauthorizedException('User no longer exists or session has expired');
    }

    if (user.isActive === false) {
      throw new UnauthorizedException('User account has been deactivated');
    }

    if (user.company && user.company.isActive === false) {
      throw new UnauthorizedException('Tenant company has been deactivated');
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      companyId: user.companyId,
      companyName: user.company?.name || user.companyName || 'RED SHIPPING International Logistics',
    };
  }
}
