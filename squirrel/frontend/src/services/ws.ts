import { io, Socket } from 'socket.io-client';
import { ensureAccessToken, getAccessToken, hasRefreshToken } from './api';
import { getWebSocketBaseUrl } from '../lib/config/apiConfig';

let socket: Socket | null = null;

export async function connectSocket(projectId: string): Promise<Socket> {
  if (socket) {
    socket.emit('presence.join', { projectId });
    return socket;
  }
  const base = getWebSocketBaseUrl();
  // Connect to the '/ws' namespace; keep default Socket.IO path '/socket.io'
  const token = (await hasRefreshToken().catch(() => false)) ? await ensureAccessToken() : null;
  const instance = io(`${base}/ws`, {
    transports: ['websocket'],
    auth: token ? { token } : getAccessToken() ? { token: getAccessToken()! } : undefined,
    withCredentials: true,
  });
  instance.on('connect', () => {
    socket?.emit('presence.join', { projectId });
  });
  socket = instance;
  return instance;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
