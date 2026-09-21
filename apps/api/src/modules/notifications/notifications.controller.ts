import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantId } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @TenantId() tenantId: string,
    @Query('isRead') isRead?: string,
    @Query('type') type?: string,
  ) {
    const isReadBool = isRead !== undefined ? isRead === 'true' : undefined;
    return this.notificationsService.getNotifications(tenantId, { isRead: isReadBool, type });
  }

  @Get('unread-count')
  async getUnreadCount(@TenantId() tenantId: string) {
    return this.notificationsService.getUnreadCount(tenantId);
  }

  @Patch(':id/read')
  async markAsRead(@TenantId() tenantId: string, @Param('id') id: string) {
    return this.notificationsService.markAsRead(tenantId, id);
  }

  @Patch('read-all')
  async markAllAsRead(@TenantId() tenantId: string) {
    return this.notificationsService.markAllAsRead(tenantId);
  }
}
