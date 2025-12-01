import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { brand } from '@sdl/language';

@Controller({ path: '', version: '1' })
export class LandingController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  @Header('Content-Type', 'text/html; charset=utf-8')
  root() {
    const port = this.config.get<number>('app.port', 8081);
    const healthUrl = `http://localhost:${port}/v1/health`;
    const loginUrl = `http://localhost:${port}/v1/auth/login`;
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${brand.productName}</title>
    <style>
      body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 3rem; background: #0f172a; color: #f8fafc; }
      a { color: #22d3ee; }
      .card { max-width: 640px; margin: 0 auto; background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(148, 163, 184, 0.3); border-radius: 16px; padding: 2rem; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.55); }
      h1 { margin-top: 0; }
      code { background: rgba(148, 163, 184, 0.2); padding: 0.15rem 0.4rem; border-radius: 6px; }
      ul { padding-left: 1.5rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>${brand.productName}</h1>
      <p>The backend is running on <code>localhost:${port}</code> and ready to accept requests.</p>
      <ul>
        <li><a href="${healthUrl}">Health check</a> – verifies the service status.</li>
        <li><a href="http://localhost:${port}/docs">Swagger docs</a> – interactive API explorer.</li>
        <li><a href="${loginUrl}">Login endpoint</a> – POST credentials here via Thunder or curl.</li>
      </ul>
      <p>Happy testing! 🐿️</p>
    </div>
  </body>
</html>`;
  }
}
