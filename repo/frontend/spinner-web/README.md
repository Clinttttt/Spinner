# Spinner Customer Web

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 22.0.6.

## API configuration

During local development, the app calls `http://localhost:5235`. On a
non-local host it uses relative `/api` requests so a reverse proxy can route
traffic to the backend.

If the API is hosted on a separate origin, set `SPINNER_API_URL` before the
production build. The prebuild script safely writes the public API origin to
`public/runtime-config.js`:

```powershell
$env:SPINNER_API_URL = "https://api.example.com"
npm run build
```

Add that web origin to the backend `Cors:AllowedOrigins` configuration.

For Vercel, configure `SPINNER_API_URL` as a Preview and Production
environment variable. Vercel deployments reject a non-HTTPS API URL. The
runtime configuration contains only a public API origin and must never contain
credentials or secrets.

## Development server

To start a local development server, run:

```powershell
npm install
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```powershell
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```powershell
npm test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
