import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

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
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'banna_super_secret_jwt_key_2026',
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.sub?.startsWith('demo-')) {
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.role === 'ADMIN' ? 'عمر البنا (مدير عام)' : payload.role === 'OPERATIONS' ? 'سارة حسين (مسؤولة عمليات)' : 'أحمد الشريف (مسؤول مبيعات)',
        role: payload.role,
        companyId: payload.companyId || 'comp-demo-1',
        companyName: 'البنا للوجستيات والنقل الدولي',
      };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: { company: true },
      });

      if (!user || !user.isActive || !user.company.isActive) {
        throw new UnauthorizedException('User or tenant account is deactivated');
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        companyName: user.company.name,
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      // If DB is offline or unreachable, fallback to payload claims
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.email?.split('@')[0] || 'User',
        role: payload.role,
        companyId: payload.companyId || 'comp-demo-1',
        companyName: 'البنا للوجستيات والنقل الدولي',
      };
    }
  }
}
