import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Regions } from '@squirrel/regions';

interface RegionHealth {
  code: string;
  displayName: string;
  dataCenterLabel: string;
  status: 'operational' | 'degraded' | 'disabled';
  isDefault: boolean;
  capabilities?: { allowsPII: boolean; allowsProd: boolean; isPreview: boolean };
}

@ApiTags('health')
@Controller({ path: 'regions', version: '1' })
export class RegionHealthController {
  @Get('health')
  getRegionHealth(): { regions: RegionHealth[] } {
    const regions: RegionHealth[] = Regions.map((region) => ({
      code: region.code,
      displayName: region.displayName,
      dataCenterLabel: region.dataCenterLabel,
      status: region.isEnabled ? 'operational' : 'disabled',
      isDefault: !!region.isDefault,
      capabilities: region.capabilities,
    }));

    return { regions };
  }
}
