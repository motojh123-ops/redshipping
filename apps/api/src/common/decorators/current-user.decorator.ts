import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface RequestUser {
  id: string;
  email: string;
  role: string;
  companyId: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof RequestUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as RequestUser;
    return data ? user?.[data] : user;
  },
);

const isUuid = (val?: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val || '');
export const DEFAULT_TENANT_UUID = '7f75539c-6168-4a0a-9519-38e3ee32022b';

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const rawTenant = request.user?.companyId || request.headers['x-tenant-id'];
    if (rawTenant && isUuid(rawTenant)) {
      return rawTenant;
    }
    return DEFAULT_TENANT_UUID;
  },
);
