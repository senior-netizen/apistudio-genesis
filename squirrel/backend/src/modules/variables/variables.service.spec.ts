import { NotFoundException } from '@nestjs/common';
import { VariablesService } from './variables.service';

describe('VariablesService', () => {
  const buildService = () => {
    const prisma = {
      variable: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
      },
      environment: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      workspace: {
        findFirst: jest.fn(),
      },
    };

    const metrics = {
      recordVariableOperation: jest.fn(),
    };

    const service = new VariablesService(prisma as any, metrics as any);
    return { service, prisma, metrics };
  };

  it('returns typed scopes when listing variables', async () => {
    const { service, prisma, metrics } = buildService();
    (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({ id: 'ws-1' });
    (prisma.variable.findMany as jest.Mock).mockResolvedValueOnce([
      { id: 'var-1', key: 'TOKEN', value: 'secret', workspaceId: 'ws-1', environmentId: null },
    ]);
    (prisma.environment.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'env-1',
        name: 'Staging',
        variables: [{ id: 'var-2', key: 'URL', value: 'https://staging', environmentId: 'env-1' }],
      },
    ]);

    const response = await service.list('ws-1', 'user-1');

    expect(response.global[0]).toEqual(
      expect.objectContaining({ id: 'var-1', scope: 'global', enabled: true, secret: false }),
    );
    expect(response.environments[0].variables[0]).toEqual(
      expect.objectContaining({ id: 'var-2', scope: 'environment' }),
    );
    expect(metrics.recordVariableOperation).toHaveBeenCalledWith('list', 'success');
  });

  it('creates scoped variables with sanitized output', async () => {
    const { service, prisma, metrics } = buildService();
    (prisma.workspace.findFirst as jest.Mock).mockResolvedValue({ id: 'ws-1' });
    (prisma.variable.create as jest.Mock).mockResolvedValue({
      id: 'var-1',
      key: 'TOKEN',
      value: 'secret',
      workspaceId: 'ws-1',
      environmentId: null,
    });

    const result = await service.createGlobal('ws-1', 'user-1', { key: 'TOKEN', value: 'secret' });

    expect(result).toEqual(
      expect.objectContaining({ id: 'var-1', scope: 'global', enabled: true, secret: false }),
    );
    expect(metrics.recordVariableOperation).toHaveBeenCalledWith('create_global', 'success');
  });

  it('updates variable values after ownership verification', async () => {
    const { service, prisma } = buildService();
    (prisma.variable.findUnique as jest.Mock).mockResolvedValue({
      id: 'var-1',
      key: 'TOKEN',
      value: 'secret',
      workspaceId: 'ws-1',
      environmentId: null,
      workspace: { ownerId: 'user-1' },
      environment: null,
    });
    (prisma.variable.update as jest.Mock).mockResolvedValue({
      id: 'var-1',
      key: 'TOKEN',
      value: 'updated',
      workspaceId: 'ws-1',
      environmentId: null,
    });

    const result = await service.update('var-1', 'user-1', { value: 'updated' });

    expect(prisma.variable.update).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      data: expect.objectContaining({ value: 'updated' }),
    });
    expect(result.value).toEqual('updated');
  });

  it('records failures in metrics when ownership validation fails', async () => {
    const { service, prisma, metrics } = buildService();
    (prisma.workspace.findFirst as jest.Mock).mockResolvedValue(null);

    await expect(service.list('missing', 'user-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(metrics.recordVariableOperation).toHaveBeenCalledWith('list', 'failure');
  });
});
