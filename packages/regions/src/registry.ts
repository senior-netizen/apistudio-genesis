export type RegionCode = 'eu-central' | 'us-east' | 'af-south' | 'ap-southeast';

export interface RegionDefinition {
  code: RegionCode;
  displayName: string;
  dataCenterLabel: string;
  primaryDbClusterUrl: string;
  readReplicaUrls?: string[];
  kafkaOrEventBusEndpoint?: string;
  searchClusterUrl?: string;
  objectStorageBucket?: string;
  kmsKeyAlias?: string;
  isDefault?: boolean;
  isEnabled: boolean;
  capabilities?: {
    allowsPII: boolean;
    allowsProd: boolean;
    isPreview: boolean;
  };
}

export const Regions: RegionDefinition[] = [
  {
    code: 'eu-central',
    displayName: 'Europe (Frankfurt)',
    dataCenterLabel: 'DE-FRA-1',
    primaryDbClusterUrl: 'postgresql://eu-central-primary.db.squirrel',
    readReplicaUrls: ['postgresql://eu-central-replica-1.db.squirrel'],
    kafkaOrEventBusEndpoint: 'kafka+ssl://eu-central.events.squirrel',
    searchClusterUrl: 'https://search.eu.squirrel',
    objectStorageBucket: 'squirrel-eu-central-objects',
    kmsKeyAlias: 'kms/eu-central-primary',
    isDefault: true,
    isEnabled: true,
    capabilities: {
      allowsPII: true,
      allowsProd: true,
      isPreview: false,
    },
  },
  {
    code: 'us-east',
    displayName: 'US East (N. Virginia)',
    dataCenterLabel: 'US-IAD-1',
    primaryDbClusterUrl: 'postgresql://us-east-primary.db.squirrel',
    readReplicaUrls: ['postgresql://us-east-replica-1.db.squirrel'],
    kafkaOrEventBusEndpoint: 'kafka+ssl://us-east.events.squirrel',
    searchClusterUrl: 'https://search.us.squirrel',
    objectStorageBucket: 'squirrel-us-east-objects',
    kmsKeyAlias: 'kms/us-east-primary',
    isEnabled: true,
    capabilities: {
      allowsPII: true,
      allowsProd: true,
      isPreview: false,
    },
  },
  {
    code: 'af-south',
    displayName: 'Africa South (Cape Town)',
    dataCenterLabel: 'ZA-CPT-1',
    primaryDbClusterUrl: 'postgresql://af-south-primary.db.squirrel',
    readReplicaUrls: ['postgresql://af-south-replica-1.db.squirrel'],
    kafkaOrEventBusEndpoint: 'kafka+ssl://af-south.events.squirrel',
    searchClusterUrl: 'https://search.af.squirrel',
    objectStorageBucket: 'squirrel-af-south-objects',
    kmsKeyAlias: 'kms/af-south-primary',
    isEnabled: true,
    capabilities: {
      allowsPII: true,
      allowsProd: true,
      isPreview: false,
    },
  },
  {
    code: 'ap-southeast',
    displayName: 'Asia Pacific Southeast (Singapore)',
    dataCenterLabel: 'SG-SIN-1',
    primaryDbClusterUrl: 'postgresql://ap-southeast-primary.db.squirrel',
    readReplicaUrls: ['postgresql://ap-southeast-replica-1.db.squirrel'],
    kafkaOrEventBusEndpoint: 'kafka+ssl://ap-southeast.events.squirrel',
    searchClusterUrl: 'https://search.apac.squirrel',
    objectStorageBucket: 'squirrel-ap-southeast-objects',
    kmsKeyAlias: 'kms/ap-southeast-primary',
    isEnabled: true,
    capabilities: {
      allowsPII: true,
      allowsProd: true,
      isPreview: true,
    },
  },
];

export function getRegion(code: RegionCode): RegionDefinition {
  const region = Regions.find((r) => r.code === code);
  if (!region) {
    throw new Error(`Unknown region code: ${code}`);
  }
  return region;
}

export function getDefaultRegion(): RegionDefinition {
  const defaultRegion = Regions.find((region) => region.isDefault) ?? Regions[0];
  if (!defaultRegion) {
    throw new Error('No regions configured');
  }
  return defaultRegion;
}

export function isRegionEnabled(code: RegionCode): boolean {
  try {
    const region = getRegion(code);
    return region.isEnabled;
  } catch (err) {
    return false;
  }
}
