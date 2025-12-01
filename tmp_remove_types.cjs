const fs = require('fs');
const path = 'squirrel/backend/prisma/schema.prisma';
const file = 'squirrel/backend/src/modules/marketplace/marketplace.service.ts';
const text = fs.readFileSync(file, 'utf8');
const mapIndex = text.indexOf('mapApi(plan: MarketplacePlanRecord)');
const firstDuplicate = text.indexOf('type MarketplacePlanRecord =', mapIndex);
const listIndex = text.indexOf('  async list', firstDuplicate);
if (firstDuplicate === -1 || listIndex === -1) {
  throw new Error('Markers not found for duplicate types');
}
fs.writeFileSync(file, text.slice(0, firstDuplicate) + text.slice(listIndex), 'utf8');
