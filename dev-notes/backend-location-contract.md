# Backend contract — transporter live location

The RN app streams the delivery vehicle's location while a delivery is in progress.
The backend lives in a **separate repo** (`mauligmart` API), so the changes below are a
**spec for that team** — they are not implemented in this frontend repo.

The frontend behaviour they must interoperate with:

- The app calls `POST /api/transporter/location` on every native GPS callback
  (~every 50 m moved or ~10 s), keyed by **vehicle**, not order.
- Failures are **dropped silently** on the client — no queue, no retry. A rejected or
  failed write is simply corrected by the next callback. So the backend can reject freely
  (e.g. 409) without the client misbehaving.

---

## 1. `POST /api/transporter/location` (existing endpoint — add a guard)

**Auth:** `Authorization: Bearer <TRANSPORTER_JWT>` (existing).

**Body:**
```json
{ "lat": 19.076, "lng": 72.8777, "vehicleNo": "MH12AB1234" }
```

**Behaviour to add — reject stray writes with `409`:**
Before writing, confirm the authenticated transporter has **at least one active
(`intransit`) order for `vehicleNo`**. If not, respond **`409 Conflict`** and write
nothing. This stops a watcher that outlived order completion (e.g. app killed before
`stop()` ran) from continuing to write.

```
if (no order where transporterId = <jwt user> AND vehicleNo = body.vehicleNo AND status = 'intransit')
    → 409 Conflict, no write
```

**Storage — last-known only (single upsert):**
Upsert one row/key **per vehicle** (or per active order, resolved from the vehicle) — do
**not** append to a history/trail table. Suggested shape:

```
transporter_location {
  vehicleNo    (unique key)
  transporterId
  lat, lng
  updatedAt
}
```

---

## 2. `GET /api/transporter/location/:orderId` (new endpoint)

Returns the **last known location only** for the vehicle assigned to that order — a single
upsert lookup, no history.

**Auth:** whoever is allowed to view the order (customer who owns it, the transporter, admin).

**Response `200`:**
```json
{ "lat": 19.076, "lng": 72.8777, "vehicleNo": "MH12AB1234", "updatedAt": "2026-07-24T10:31:00Z" }
```

**Edge cases:**
- Order not `intransit` / no location yet → `404` (or `200` with `null`) — caller decides.
- Resolve `orderId → order.deliveryBoy.vehicleNo → transporter_location[vehicleNo]`.

> A location **trail/history** (breadcrumb path) is explicitly out of scope for now; only
> last-known is required. Add a separate history table only if requested later.

---

## Notes / assumptions

- `vehicleNo` is the join key between a location write and an order — the app sends the
  vehicle, the backend fans it out to that vehicle's active orders. The app never maps
  coordinates to individual orders itself.
- TLS handles transport encryption; no additional payload encryption is applied.
- No third-party services (no Firebase/MQTT) — self-hosted HTTP only.
