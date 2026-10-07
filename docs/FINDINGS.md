These are working investigation notes captured while exploring the legacy Urja Meter Ops portal. PROTOCOL.md contains the cleaned protocol summary, and openapi.json documents the public API implemented by this project.

## 1. Auth & session
- [SEEN] Login: POST https://urja-ops.flockenergy.tech/login
- [SEEN] Body is URL-encoded form data with fields `email` and `password`
- [SEEN] Request sends header `Accept: application/json`
- [SEEN] Request sends header `Content-Type: application/x-www-form-urlencoded`
- [SEEN] Request sends header `x-sveltekit-action: true`
- [SEEN] Request sends headers `Origin: https://urja-ops.flockenergy.tech` and `Referer: https://urja-ops.flockenergy.tech/login`
- [SEEN] Response: HTTP 200, body {"type":"redirect","status":303,"location":"/meters"}
  (the redirect is inside the JSON body, the real HTTP status is 200)
- [SEEN] Session is a cookie: `__Secure-better-auth.session_token`, Max-Age=3600 (1 hour), Path=/, HttpOnly, Secure, SameSite=Lax
- [INFERRED] The cookie name suggests the Better Auth library, not confirmed
- [UNKNOWN] Wrong password: status code and response body
- [UNKNOWN] Expired session exact behaviour remains unverified. Does the cookie get refreshed on later requests, or does it expire exactly 1 hour after login?

## 2. Tech behind the portal
- [SEEN] It is a **SvelteKit** app. Proof: requests named `__data.json?x-sveltekit-invalidated=...`.
- [SEEN] Pages use client-side `fetch` (initiator is a JS file), so there are JSON endpoints behind the UI. No need to scrape HTML for the lists.

## 3. Pages (what the UI shows)
| Page | What I saw |
|---|---|
| Meters list | Title "Meters", **403 total**, a search box ("Search by meter number or serial..."), columns: METER, SERIAL, MAKE, PHASE, STATUS, DT |
| Meter detail | "Meter J100000". Sections: Nameplate, Location, Consumption (table, scrolls inside the card) |
| Transformers | "Distribution Transformers", columns: CODE, NAME, FEEDER, CAPACITY (KVA), plus a button **"Export all meters"** |
| Other | "Ops Desk" link and "Sign out" button in the header (not explored yet) |

| Meter detail (two versions) | `build` in the export is `legacy` (238) or `v2` (165). v2 meters (e.g. J100004) show labels like `MeterId`, `SerialNo`; legacy ones (e.g. J100001) show `Meter ID`, `Serial No` |

## 4. Endpoints seen (Fetch/XHR tab)
| Request name | When it fired | Size / time | Method | Full URL | Params | Notes |
|---|---|---|---|---|---|---|
| `login` | on login | 0.2 kB / 214 ms | POST | https://urja-ops.flockenergy.tech/login | | |
| `__data.json?x-sveltekit-invalidated=010` | after login (meters page load) | 0.2 kB / 57 ms | [UNKNOWN] | [UNKNOWN] | `x-sveltekit-invalidated=010` | SvelteKit page-data call |
| `search?q=&page=1` | meters list load | 2.6 kB / 57-72 ms | GET | https://urja-ops.flockenergy.tech/portal/meters/search | `q` (search text), `page` (page number) | This is the meters list endpoint |
| `__data.json?x-sveltekit-invalidated=001` | opening a meter | 0.1 kB / 61 ms | [UNKNOWN] | [UNKNOWN] | | SvelteKit page-data call |
| `geo` | meter detail | 0.1 kB | GET | https://urja-ops.flockenergy.tech/portal/meters/{meterId}/geo | meter id in path | Response: {"data": {"latitude": "...", "longitude": "..."}} |
| `energy` | meter detail | 27.6 kB | GET | https://urja-ops.flockenergy.tech/portal/meters/{meterId}/energy | meter id in path | Response: {"data": [ {timestamp, kwh, kvah, voltR}, ... ]} |
| `dts?page=1` | Transformers page | 1.7 kB / 67 ms | [UNKNOWN] | [UNKNOWN] | `page` | Transformer list |
| `export?page=1` | "Export all meters" button | 231,658 B | GET | https://urja-ops.flockenergy.tech/portal/export?page=1 | page | Returns all 403 meters in one response. A `keys` request fires just before it. |

## 5. Data model per entity
- [SEEN] Raw JSON keys: meterId, serialNo, make, phaseType, installStatus, dtCode
- [SEEN] Response shape: { "data": [ ... ], "total": 403, "page": 1, "pageSize": 20 }
- [SEEN] Searching `j1000` returns "100 total", so q matches part of the meter ID
- [RESOLVED] Page size is 20, and the other top-level keys include total, page, pageSize. Note: These counts are not claimed to be permanent.

### Meter detail
- [SEEN] Nameplate: Meter ID, Serial No, Make, Phase Type, Installation Status, **Installation Type**
- [SEEN] Location: latitude / longitude, e.g. `26.938961002479868, 75.83095696146852` (long float, many decimals)
- [SEEN] Legacy geo endpoint returns latitude and longitude as strings.
- [SEEN] Breadcrumb (hierarchy) above the cards: `Jaipur Zone 1 (Z-01) > Circle 1 (C-01) > Division 1 (D-01) > Subdivision 1 (SD-01) > Substation 1 (SS-01) > Feeder 1 (F-001) > Malviya Nagar DT 1 (DT-001)`
- [UNKNOWN] Where does the breadcrumb come from (which request)? Maybe `__data.json` or `geo`

### Transformer (DT)
- [SEEN] Fields: code (`DT-001`), name (`Malviya Nagar DT 1`), feeder (`F-001`), capacity in kVA (100, 63, 250, 400, 160...)
- [UNKNOWN] Raw JSON field names from `dts` response, page size, total count

### Consumption reading
- [SEEN] Endpoint: GET /portal/meters/{meterId}/energy
- [SEEN] Response: {"data": [ {"timestamp": "23/06/2026 23:30", "kwh": "48438.74", "kvah": "52313.84", "voltR": "226"}, ... ]}
- [SEEN] Only 4 fields per reading: timestamp, kwh, kvah, voltR
- [SEEN] ALL values are strings upstream, including numbers ("48438.74", "226")
- [SEEN] Timestamp format DD/MM/YYYY HH:mm, no timezone, 30-minute steps
- [INFERRED] kwh looks like a cumulative counter (keeps increasing), not per-interval usage
- [SEEN] Response size 27.6 kB, probably about 330 rows (one week of 30-min readings)
- [UNKNOWN] Row count, first and last timestamp, any from/to params?
- [UNKNOWN] Timezone was not verified.

## 6. Hierarchy / Transformers
*Note: Hierarchy reconstruction and transformer APIs were intentionally NOT implemented in our clean API.*
- [SEEN] 7 levels: zone (3) > circle (7 codes) > division (10) > subdivision (14) > substation (19) > feeder (29) > DT (40)
- [SEEN] Source: `hierarchy` object on every record in the export
- [SEEN] 22 of 403 meters have a blank (empty string) code or name at one level
- [SEEN] DT-007 has two names: "Sanganer DT 7" (10 meters) and "Old Malviya Nagar Xfmr" (J100400-J100402)
- [SEEN] Codes are reused under different parents
- [SEEN] Each DT has one consistent chain apart from the blanks, so blanks can be filled from sibling meters
- [SEEN] dtCode always equals hierarchy.dt.code; no duplicate meterId or serialNo; no null geo

## 7. Pagination
- [SEEN] GET /portal/meters/search?q=<text>&page=<n>, page starts at 1
- [SEEN] Response ends with: "total": 403, "page": 1, "pageSize": 20
- [SEEN] 403 meters / 20 per page = 21 pages (last page should have 3)
- [SEEN] Page 2 works when opened directly in a browser tab (plain GET + session cookie)
- [SEEN] q is case-insensitive and matches part of the meter ID (j1000 -> 100 total)
- [UNKNOWN] page=21, page=22, page=0, page=-1, page=abc: what comes back?
- [UNKNOWN] Can pageSize be changed with a query param? (try &pageSize=100)

## 8. Bulk / export
*Note: The export path was not implemented in our clean API because it was outside the chosen core scope.*
- [SEEN] "Export all meters" downloads meter-export.json (403 meters, hierarchy + geo included)
- [SEEN] GET /portal/export?page=1 returns everything
- [SEEN] The same URL with page=2 opened directly in a tab returns:{"error":"signature_invalid","message":"Missing or invalid request signature."}
- [SEEN] The page fires a keys request just before export
- [SEEN] Other endpoints (search, geo, energy) work with just the session cookie; export needs a signature
- [RESOLVED] keys request: URL is https://urja-ops.flockenergy.tech/portal/keys, Method is GET. The response shape includes a signingSecret.
- [SEEN] Signature headers: The request sends two custom headers: X-Signature and X-Timestamp (a standard Unix epoch timestamp).
- [UNKNOWN] Exact signature-generation algorithm and signed payload were not investigated further.

## 9. Quirks & surprises (candidates to verify)
- [SEEN] Meter `J100000` is **Decommissioned** but still shows consumption data up to 30/06/2026.
- [SEEN] Serial `L&84997` for make `L&T`: the `&` in the serial looks odd.
- [SEEN] Each DT seems to map to a different feeder and meter in order.
- [SEEN] The portal does a few `__data.json` calls that are SvelteKit internals, not real data endpoints
- [UNKNOWN] Rate limits, odd status codes (200 with an error message?), null / empty values, duplicate meters across pages, data that differs between list and detail
- [SEEN] Serial prefix does not match make (J100003: make Genus, serial L&84997).
- [SEEN] Display names in DevTools are short (`search`), but real URLs are under /portal/...
- [SEEN] Numbers are sent as strings everywhere (latitude, longitude, kwh, kvah, voltR)
- [SEEN] Timestamps are DD/MM/YYYY HH:mm with no timezone
- [SEEN] The meters list shows `installStatus`, and the detail page shows the same value as "Installation Status"
- [SEEN] Meter J100020 has dtCode DT-021, J100021 has DT-022: the DT number is always meter number + 1 so far
- [SEEN] The export uses empty strings "" for missing hierarchy values, not null
- [SEEN] geo endpoint returns lat/lng as strings, the export returns numbers
- [SEEN] Meter-to-DT assignment cycles through the 40 DTs in order
- [UNKNOWN] Compare a v2 meter with a legacy meter: does `energy` look different?
- [SEEN] Two page versions (legacy / v2) for meter detail, flagged by `build` in the export
- [SEEN] "Export all meters" is not really paginated: page=1 already contains everything
- [SEEN] Export endpoint requires a client-generated request signature; plain cookie auth gives "signature_invalid"
- [SEEN] v2 and legacy meters fire the same requests (__data.json, geo, energy); only the page labels differ

## 10. Open questions
- [UNKNOWN] What does "Ops Desk" show?
- [UNKNOWN] Does the consumption endpoint accept `from` / `to`, or does it always return the same fixed window?
- [UNKNOWN] Does the session cookie get renewed on each request, or does it have a fixed expiry?
- [UNKNOWN] Areas intentionally not investigated (mutation, bulk data exact structure)
