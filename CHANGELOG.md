## Unreleased

### Security
- Added stateless CSRF token generation endpoint and global guard enforcing tokens for unsafe API calls while issuing signed `XSRF-TOKEN` cookies during authentication flows.
- Introduced shared `CsrfManager` utility and updated web and VS Code clients to automatically load, inject, and refresh CSRF tokens with credentialed requests and retry handling for forbidden responses.
- Fixed CSRF-related 404 errors across backend, frontend, API and VS Code extension by correcting middleware order, enabling credentials, and implementing consistent CSRF token propagation.
