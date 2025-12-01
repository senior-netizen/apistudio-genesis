import { SetMetadata } from '@nestjs/common';

export const SharedRoles = (...roles: string[]) => SetMetadata('roles', roles);
