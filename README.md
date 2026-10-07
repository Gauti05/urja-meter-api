# Urja Meter API

This project is a clean, read-only TypeScript/Express REST API built over the legacy Urja Meter Ops portal. 

The service acts as a seamless proxy that handles the legacy portal authentication internally and exposes normalized, strict JSON responses for downstream consumers, completely abstracting away the upstream quirkiness.

## What I Built

- **Meter Search & Listing:** A paginated endpoint for searching and retrieving meters.
- **Meter Location:** Exposes normalized geographical coordinates.
- **Meter Consumption:** Exposes meter energy consumption readings.
- **Automatic Portal Session Handling:** Automatically authenticates, caches session cookies, and seamlessly retries on expiry.
- **Data Normalization:** Converts legacy string-based numeric values to strict JSON numbers at the API boundary.
- **Validation & Error Handling:** Uniform error responses across all endpoints.
- **API Documentation:** A complete OpenAPI 3.0.3 specification.
- **Automated Tests:** Vitest and Supertest setup validating inputs and health.

## API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | `/health` | API health check |
| GET | `/api/meters` | Search and paginate meters (`?q=string&page=number`) |
| GET | `/api/meters/{meterId}/location` | Get geographical coordinates for a meter |
| GET | `/api/meters/{meterId}/consumption` | Get energy consumption readings for a meter |

## Example Request

```bash
curl "http://localhost:3000/api/meters?q=J1000&page=1"
```

**Example Response:**
```json
{
  "data": [
    {
      "meterId": "J100000",
      "serialNo": "SE33962",
      "make": "HPL",
      "phaseType": "single",
      "installStatus": "Decommissioned",
      "dtCode": "DT-001"
    }
  ],
  "pagination": {
    "total": 403,
    "page": 1,
    "pageSize": 20
  }
}
```

## Project Structure

```text
src/
  clients/
  config/
  controllers/
  middleware/
  routes/
  services/
  types/
  utils/
  __tests__/
  app.ts
  server.ts
frontend/
  src/

.env.example
openapi.json
PROTOCOL.md
README.md
```

**Architecture Flow:**
1. **Route**: Express router maps HTTP path to a controller.
2. **Controller**: Validates HTTP input, extracts parameters, and handles standard error responses.
3. **Service**: Normalizes payload types, executes business logic, and manages core data shapes.
4. **Authenticated Urja Client**: Safely invokes external endpoints attaching the session, and triggers one-time authentication recovery natively.
5. **Legacy Portal**: Returns upstream responses.

## Setup

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Configure the environment:**
   Copy the example environment file and fill in your portal credentials.
   ```bash
   cp .env.example .env
   ```
   ```env
   PORT=3000
   URJA_BASE_URL=https://urja-ops.flockenergy.tech
   URJA_EMAIL=<your-portal-email>
   URJA_PASSWORD=<your-portal-password>
   ```
   *(Note: The `.env` file should never be committed to version control.)*
4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Run the frontend client:**
   A small React frontend is included as an optional demonstration client.
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *(Note: The frontend uses a Vite proxy to communicate with the backend at `/api` during development. You do not need to configure `VITE_API_BASE_URL` locally.)*

## Available Scripts

- `npm run dev` - Starts the development server with hot-reloading via `tsx watch`.
- `npm run build` - Compiles the TypeScript source into the `dist/` directory.
- `npm start` - Runs the compiled production server.
- `npm test` - Executes the automated Vitest test suite.

## Authentication

Consumers of this API do not manually manage the Urja session cookie. The service securely logs into the upstream portal using the environment credentials. The session cookie is kept in memory and seamlessly reused for all authenticated requests. 

If the client detects an authentication-failure status (`401` or `403`), it automatically clears the cached session, performs one re-login, and retries the request transparently.

For a detailed dive into the legacy protocol's login implementation quirks, see [PROTOCOL.md](./PROTOCOL.md).

## Data Normalization

The legacy portal returns several numeric values incorrectly formatted as strings. At the boundary, our API converts these legacy strings into standard numbers:
- `latitude` -> number
- `longitude` -> number
- `kwh` -> number
- `kvah` -> number
- `voltR` -> number

The consumption `timestamp` is deliberately preserved as a string because its upstream timezone could not be strictly verified.

## Error Handling

Errors are always formatted uniformly:

```json
{
  "error": {
    "code": "INVALID_PAGE",
    "message": "page must be a positive integer"
  }
}
```

**Current Error Codes:**
- `INVALID_PAGE`
- `INVALID_QUERY`
- `INVALID_METER_ID`
- `UPSTREAM_ERROR`
- `INTERNAL_ERROR`

## Testing

The project uses `vitest` and `supertest` for automated testing.

There are currently **4 tests** that intentionally focus on the health endpoint and input validation rules. These tests do not make real outbound network requests to the Urja portal in order to stay highly resilient and fast.

**Run tests:**
```bash
npm test
```

## API Documentation

- [**openapi.json**](./openapi.json): Specification exclusively for our **CLEAN** public API.
- [**PROTOCOL.md**](./PROTOCOL.md): Cleaned and polished documentation of the **LEGACY** portal protocol.
- [**docs/FINDINGS.md**](./docs/FINDINGS.md): Raw/sanitized working investigation notes and the discovery process captured while exploring the legacy Urja Meter Ops portal.

## Assumptions and Design Decisions

1. The service is intentionally read-only.
2. Portal credentials are supplied through environment variables rather than hardcoded.
3. Session state is stored in memory because this is a small local take-home service. In a horizontally scaled production system, session management would require an external store (like Redis).
4. The upstream observed page size is preserved rather than implementing separate client-controlled page sizing.
5. Numeric legacy values are dynamically normalized at the API boundary.
6. Consumption timestamps are not converted to ISO 8601 because the upstream timezone was not verified.
7. The solution intentionally stays small rather than recreating the entire portal.

## Intentionally Left Out

Due to the focused scope and time budget, I intentionally did not implement optional extensions such as:
- Network hierarchy reconstruction
- Local indexing/query layer (e.g. MongoDB caching)
- Caching policies
- Bulk/full-dataset extraction

The goal was to deliver a focused, reliable API around the key meter workflows discovered during the investigation.

## What I Would Improve With More Time

- Adding more unit and integration tests with mocked upstream responses.
- Adding stronger runtime validation of legacy responses (e.g. using Zod).
- Implementing an improved session-expiry detection strategy based on exhaustive observation of portal behavior.
- Designing a robust caching strategy and determining data freshness requirements.
- Adding structured logging and observability.
- Investigating the network hierarchy.
- Adding graceful shutdown, strict timeouts, and refined retry policies.

## Reflection

### What assumptions did I make?
I assumed this integration was strictly read-only. I assumed the observed upstream response shapes act as the current stable contract. I also assumed that `401`/`403` HTTP statuses cleanly represent authentication failures that warrant one retry, even though complete session-expiry edge-cases were not exhaustively verified. Lastly, I assumed the unknown timestamp timezone should be safely preserved rather than blindly guessed.

### Which part was the most difficult, and how did I get unstuck?
The hardest part was faithfully reproducing the portal login. An early programmatic request used the wrong media type and returned HTTP `415`. After switching formats, the request returned HTTP `403`. I got unstuck by carefully comparing my request against a successful login in Chrome DevTools, where I discovered that the SvelteKit login action strictly required `application/x-www-form-urlencoded` plus a custom `x-sveltekit-action: true` header. Matching the observed browser request allowed the backend client to authenticate successfully.

### If I had another day, what would I improve?
I would strengthen test coverage by writing mocked upstream integration tests. I would also introduce runtime response validation to safely assert the expected structure of the legacy portal responses. I'd perform deeper investigations into the network hierarchy and edge-case session behavior, and potentially build out caching only after clearly defining upstream freshness requirements.

### What mistake did I make while solving this?
I initially assumed the login request format based on general API conventions instead of reproducing the browser request exactly. That produced `415`/`403` responses and cost me time. The lesson was to always inspect the successful real-world network request first rather than guessing undocumented protocol details.

### If I were reviewing my own submission, what would I criticise?
I would note that while the service has a clean and intentionally small architecture, upstream response validation and automated test coverage are still somewhat limited. The authentication retry logic also heavily relies on a basic assumption about `401`/`403` error codes because every conceivable session-expiry scenario was not exhaustively observed. These would be the first areas I would look to strengthen.

## Security Notes
- Credentials are strictly sourced from environment variables.
- The `.env` file is safely gitignored.
- The upstream session token is kept internal and never returned by the clean API.
- Care is taken to ensure credentials and session cookies are never exposed in application logs.
