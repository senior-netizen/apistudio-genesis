const productName = 'Squirrel API Studio';
const productShortName = 'API Studio';
const orgName = 'Squirrel Labs';
const tagline = 'Build, test, and automate APIs together.';
const apiDescription = 'API documentation for Squirrel API Studio backend';
const authIssuer = 'Squirrel';

const surfaceLabels = {
  web: 'Web',
  backend: 'Backend',
  vscode: 'VSCode',
  desktop: 'Desktop',
  cli: 'CLI',
  sdk: 'SDK',
  api: 'API',
};

function title(suffix) {
  if (suffix && typeof suffix === 'string' && suffix.trim()) {
    return `${productName} · ${suffix.trim()}`;
  }
  return productName;
}

function userAgent(surface = 'SDK') {
  const label = surfaceLabels[surface] ?? surface;
  return `${productName} ${label}`.trim();
}

function sentence() {
  return `${productName} — ${tagline}`;
}

const brand = {
  productName,
  productShortName,
  orgName,
  tagline,
  apiDescription,
  authIssuer,
  surfaceLabels,
  title,
  userAgent,
  sentence,
};

module.exports = { brand };
