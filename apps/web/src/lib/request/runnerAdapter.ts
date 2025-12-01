import type { RunnerRequest, RunnerRequestBody, RunnerVariableContext } from '@sdl/request-runner';
import type { ApiEnvironment, ApiRequest, RequestAuth, RequestBody, Variable } from '../../types/api';

function mapBody(body: RequestBody | undefined): RunnerRequestBody | undefined {
  if (!body) return undefined;
  switch (body.mode) {
    case 'form-data':
      return {
        mode: 'form-data',
        formData: body.formData?.map((item) => ({
          key: item.key,
          value: item.value,
          enabled: item.enabled,
          fileName: item.isFile ? item.key : body.fileName,
          contentType: body.mimeType
        }))
      };
    case 'x-www-form-urlencoded':
      return {
        mode: 'x-www-form-urlencoded',
        urlEncoded: body.urlEncoded?.map((item) => ({
          key: item.key,
          value: item.value,
          enabled: item.enabled
        }))
      };
    default:
      return { ...body } as RunnerRequestBody;
  }
}

function mapAuth(auth: RequestAuth | undefined) {
  if (!auth) return undefined;
  switch (auth.type) {
    case 'bearer':
      return { type: 'bearer', bearerToken: auth.bearerToken } as RunnerRequest['auth'];
    case 'basic':
      return { type: 'basic', basic: auth.basic } as RunnerRequest['auth'];
    case 'apiKey':
      return { type: 'apiKey', apiKey: auth.apiKey } as RunnerRequest['auth'];
    case 'oauth2':
      return { type: 'oauth2', oauth2: { accessToken: auth.oauth2?.token, tokenType: 'Bearer' } } as RunnerRequest['auth'];
    case 'none':
    default:
      return { type: 'none' } as RunnerRequest['auth'];
  }
}

export function mapToRunnerRequest(request: ApiRequest): RunnerRequest {
  return {
    id: typeof request.id === 'string' ? request.id : String(request.id),
    name: request.name,
    method: request.method,
    url: request.url,
    headers: request.headers.map((header) => ({
      key: header.key,
      value: header.value,
      enabled: header.enabled
    })),
    params: request.params.map((param) => ({
      key: param.key,
      value: param.value,
      enabled: param.enabled
    })),
    body: mapBody(request.body),
    auth: mapAuth(request.auth)
  };
}

function mapVariables(variables: Variable[] = []) {
  return variables.map((variable) => ({
    key: variable.key,
    value: variable.value,
    enabled: variable.enabled,
    secret: variable.secret,
    description: variable.description
  }));
}

export function buildVariableContext(
  globals: Variable[],
  environment: ApiEnvironment | undefined,
  locals: Variable[] = []
): RunnerVariableContext {
  return {
    globals: mapVariables(globals),
    environment: environment
      ? {
          id: typeof environment.id === 'string' ? environment.id : String(environment.id),
          name: environment.name,
          color: environment.color,
          variables: mapVariables(environment.variables)
        }
      : undefined,
    locals: mapVariables(locals)
  };
}
