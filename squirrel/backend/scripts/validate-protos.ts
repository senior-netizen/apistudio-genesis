import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const protoDir = join(__dirname, '..', 'proto');
const requiredFiles = ['auth.proto', 'workspaces.proto', 'requests.proto', 'common.proto'];

for (const file of requiredFiles) {
  const full = join(protoDir, file);
  if (!existsSync(full)) {
    throw new Error(`Missing proto file: ${full}`);
  }
}

try {
  execSync('grpc_tools_node_protoc --version', { stdio: 'ignore' });
  console.log('grpc_tools_node_protoc found');
} catch (_err) {
  console.warn('grpc_tools_node_protoc not found in PATH — install dev deps or run via yarn scripts.');
}

console.log('Proto validation passed.');
