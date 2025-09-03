# Hotel Room Reservation System (Frontend-only React)

A single-page React app that meets the Unstop assessment requirements:

- 97 rooms (Floors 1–9: 10 rooms each; Floor 10: 7 rooms).
- Stairs/lift on the left; horizontal = 1 min/room; vertical = 2 min/floor.
- Book up to 5 rooms optimally according to rules:
  1) Prefer same-floor grouping; select the tightest window (minimal span).
  2) If unavailable on one floor, select rooms across floors minimizing the *diameter* (max pairwise distance) using the travel-time metric (pos + pos + 2*floor diff via stairs on the left).
- Visualizes room states (available, newly booked, occupied).
- Buttons: **Book**, **Random Occupancy**, **Reset**.

## Run locally

```bash
npm install
npm run dev
```

## Deploy (Netlify/Vercel)

- Connect this repo and use the default Vite build:
  - Build command: `npm run build`
  - Publish directory: `dist/`

## Notes on algorithm

- **Same-floor**: sliding window over available rooms to minimize horizontal span.
- **Cross-floor**: center around floors with more availability and greedily add rooms from nearest floors (leftmost rooms first), choosing the set that minimizes the diameter = "travel time between first and last room".

This is deterministic and fast in the browser without a backend.
