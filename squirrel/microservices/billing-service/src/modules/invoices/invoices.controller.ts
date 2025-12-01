import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../shared/roles.decorator';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { InvoicesService } from './invoices.service';

@ApiTags('invoices')
@Controller({ path: 'v1/billing', version: '1' })
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('admin/invoices/:userId')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'List internal invoices for a user' })
  listInvoices(@Param('userId') userId: string) {
    return this.invoicesService.listUserInvoices(userId);
  }

  @Post('admin/invoices')
  @Roles('admin', 'founder')
  @ApiOperation({ summary: 'Create an internal invoice for audit purposes' })
  createInvoice(@Body() payload: GenerateInvoiceDto) {
    return this.invoicesService.createInternalInvoice(payload);
  }
}
