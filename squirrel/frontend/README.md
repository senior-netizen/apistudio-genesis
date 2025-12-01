# Squirrel Frontend – Setup and Backend Integration

This app expects the Squirrel backend to be available and exposes a few env vars to point at it. Below are the steps to run it against your local backend and what to expect regarding auth and sockets.

## Quick Start

- From repo root: `yarn install`
- Start backend (default on `http://localhost:8081`): see `squirrel/backend/README.md`.
- Start frontend:
  - `cd squirrel/frontend`
  - `yarn dev`
- Open `http://localhost:5173`.

## Environment Variables

Create `.env.local` in `squirrel/frontend` if needed:

```
VITE_API_URL=http://localhost:8081
VITE_WS_URL=http://localhost:8081
```

- `VITE_API_URL` is used by Axios in `src/services/api.ts`.
- `VITE_WS_URL` is used by Socket.IO in `src/services/ws.ts` and connects to the `/ws` namespace.

## Auth & Token Refresh

- The frontend stores `accessToken` and `refreshToken` in `localStorage` after login/register.
- Requests include `Authorization: Bearer <accessToken>` automatically (see `src/services/api.ts`).
- On `401`, the client POSTs to `/v1/auth/refresh` with the stored refresh token and retries the request.
- The backend may also return a rotated token via the `x-access-token` header (when a secure `refresh_token` cookie is present). The frontend now reads this header and updates the stored access token when present.

Notes:
- Cookies are `secure`; in local `http://` dev they won’t be sent, so the explicit refresh flow is used.
- For HTTPS dev, `withCredentials` is enabled and the cookie-based rotation can kick in automatically.

## WebSockets

- The client connects to the Socket.IO namespace at `/ws` on `VITE_WS_URL`.
- If an access token exists, it is sent in `auth.token` on connect.
- The backend Socket gateway (`RealtimeGateway`) allows any origin in dev and will broadcast presence and run progress events.

## Common Issues

- CORS errors: ensure backend `CORS_ORIGINS` includes `http://localhost:5173` when running with `NODE_ENV=production`.
- 401/refresh loops: confirm `VITE_API_URL` points to the right backend and the clock on your machine is correct.
- Socket connection failures: verify the URL and that the backend is listening; the client connects to `${VITE_WS_URL}/ws` using the default Socket.IO path (`/socket.io`).

## Scripts

- `yarn dev` – start Vite dev server on 5173
- `yarn build` – production build to `dist/`
- `yarn preview` – preview the built app
- `yarn test` – run unit tests with Vitest
