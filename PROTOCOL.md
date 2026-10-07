# Urja Meter Ops Protocol Notes

## Investigation Method
The Urja Meter Ops portal (`https://urja-ops.flockenergy.tech`) is a SvelteKit web application. The protocol and endpoints documented below were discovered strictly through non-destructive, read-only browser interactions and Chrome DevTools network inspection. No mutation or write endpoints were explored.

## Authentication
Authentication relies on a SvelteKit form action rather than a traditional REST JSON payload.

- **Endpoint:** `POST /login`
- **Request Headers:**
  - `Accept: application/json`
  - `Content-Type: application/x-www-form-urlencoded`
  - `Origin: https://urja-ops.flockenergy.tech`
  - `Referer: https://urja-ops.flockenergy.tech/login`
  - `x-sveltekit-action: true`
- **Request Body:** Standard URL-encoded form data (`email=<configured-email>&password=<configured-password>`)
- **Response:** Returns an HTTP `200 OK`, but the JSON payload describes a redirect:
  ```json
  {
    "type": "redirect",
    "status": 303,
    "location": "/meters"
  }
  ```

## Session Handling
A successful login issues a session cookie via the `Set-Cookie` header.

- **Cookie Name:** `__Secure-better-auth.session_token`
- **Attributes:** `Max-Age=3600`, `Path=/`, `HttpOnly`, `Secure`, `SameSite=Lax`

Authenticated requests to the portal must include this session cookie. 
Our client implementation caches the cookie name and value in memory. As a robustness measure, our client treats `401`/`403` responses during authenticated requests as a potential authentication failure, clears the cached session, attempts to re-authenticate, and retries the request once. *Note: It has not been experimentally verified that every expired portal session strictly returns `401` or `403`.*

## Meter Search
The portal provides a paginated meter search endpoint.

- **Endpoint:** `GET /portal/meters/search`
- **Query Parameters:**
  - `q`: Search text (can be empty)
  - `page`: Page index (starts at 1)
- **Response Structure:** Includes `data`, `total`, `page`, and `pageSize`.
- **Observed Meter Fields:** `meterId`, `serialNo`, `make`, `phaseType`, `installStatus`, `dtCode`.

*Observed values during investigation:*
- Empty search (`q=`): 403 total meters.
- Filtered search (`q=J1000`): 100 matches.
- Default page size is 20.
*(These counts reflect the state of the provided portal instance at the time of investigation and are subject to change.)*

## Meter Location
The portal provides geographical coordinates for a specific meter.

- **Endpoint:** `GET /portal/meters/{meterId}/geo`
- **Example Response:**
  ```json
  {
    "data": {
      "latitude": "26.938961002479868",
      "longitude": "75.83095696146852"
    }
  }
  ```
- **Quirk:** The upstream API returns the `latitude` and `longitude` values as strings, even though they represent numeric coordinates.

## Consumption Data
The portal exposes energy consumption readings for a specific meter.

- **Endpoint:** `GET /portal/meters/{meterId}/energy`
- **Example Reading Structure:**
  ```json
  {
    "timestamp": "23/06/2026 23:30",
    "kwh": "48438.74",
    "kvah": "52313.84",
    "voltR": "226"
  }
  ```
- **Quirks:**
  - `timestamp` is formatted as `DD/MM/YYYY HH:mm`. 
  - The timezone of the timestamp is unknown and was not verified.
  - The `kwh`, `kvah`, and `voltR` values are returned as strings.

## Data Normalization
To prevent upstream quirks from leaking into our clean API, our service normalizes the data at the boundary.

**Legacy portal types:**
- `latitude` -> string
- `longitude` -> string
- `kwh` -> string
- `kvah` -> string
- `voltR` -> string

**Clean API types:**
- `latitude` -> number
- `longitude` -> number
- `kwh` -> number
- `kvah` -> number
- `voltR` -> number

The `timestamp` field remains a string in our clean API because its exact timezone timezone cannot be verified, preventing us from safely casting it to an ISO 8601 date.

## Quirks and Findings
Key discoveries made during network inspection:
- The portal is a SvelteKit application and the login uses a SvelteKit form action.
- The `x-sveltekit-action: true` header is strictly required. An early programmatic login attempt without this header received an HTTP `403`.
- The login body strictly requires `application/x-www-form-urlencoded`. An early attempt using `application/json` received an HTTP `415 Unsupported Media Type`.
- A successful login returns an HTTP `200` status while its payload defines a `303` redirect.
- Several numeric values (coordinates and energy readings) are represented as strings in the JSON payload.
- Authentication state is strictly cookie-based.

## Unknowns and Scope
Because the investigation was strictly limited to read-only exploration needed for the assignment, several areas remain unexplored or unverified:
- The complete portal data model and network hierarchy.
- Bulk data extraction paths or full-dataset endpoints.
- The exact timezone offset for consumption timestamps.
- The exact portal behavior for every possible expired-session scenario.
- Any mutation, write, or configuration endpoints.
