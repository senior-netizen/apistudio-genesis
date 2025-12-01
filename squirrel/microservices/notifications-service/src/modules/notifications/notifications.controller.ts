import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { DispatchNotificationDto } from './dto/dispatch-notification.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller({ path: 'v1', version: '1' })
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('dispatch')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Dispatch notification across channels' })
  dispatch(@Body() payload: DispatchNotificationDto) {
    return this.notificationsService.dispatch(payload);
  }
}
