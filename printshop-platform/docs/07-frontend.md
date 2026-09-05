# 07 — Frontend Guide

React 19 + TanStack Start + Tailwind CSS v4. Source lives in `src/` at the
repository root.

---

## Layout

```text
src/
├── routes/            One file per URL. TanStack generates the route tree.
│   ├── __root.tsx     Shell: head metadata, chrome, <Outlet/>
│   ├── index.tsx      /
│   ├── products.index.tsx      /products
│   ├── products.$productId.tsx /products/123
│   ├── studio.tsx     /studio      artwork upload
│   ├── inspiration.tsx
│   ├── orders.index.tsx / orders.$orderId.tsx
│   ├── assistant.tsx  /assistant   the RAG chat
│   ├── auth.tsx       /auth        sign in and up
│   └── admin.tsx      /admin       studio console, admin only
├── components/        RegistrationMark, StatusStamp, SiteChrome, ProductCard
├── lib/
│   ├── api.ts         THE boundary. The only file that knows the backend URL.
│   └── demo-data.ts   Fallback data so the UI works with the backend off
└── styles.css         The design system
```

`src/routeTree.gen.ts` is generated. Never edit it; create a route file and it
regenerates.

---

## The API boundary

`src/lib/api.ts` is the single place any component may learn that a server
exists. Components call `api.listProducts()`, never `fetch()`.

It also handles:

- **The token.** The JWT is kept in `localStorage` and attached as
  `Authorization: Bearer …` on every request.
- **Errors.** Non-2xx responses become thrown `Error`s with the backend's
  message, so a component can `try/catch` and show it.
- **Demo fallback.** `withDemo()` catches network failure and serves
  `demo-data.ts` instead, so the interface is explorable before the
  backend is running. In production, with a reachable backend, it never fires.

To point at a deployed backend, set `VITE_API_BASE_URL` in `.env` — do not
hardcode a URL in a component.

Adding a call:

```ts
export const api = {
  // ...
  relatedProducts: (id: number) =>
    request<Product[]>(`/products/${id}/related`),
};
```

---

## The design system

All colour, spacing and type live in `src/styles.css` as tokens. Components use
semantic Tailwind classes (`bg-canvas`, `text-ink`, `border-thread`), never raw
values like `bg-[#1a1a1a]` — that is what keeps a rebrand to one file.

| Token | Role |
| --- | --- |
| `ink` | Near-black. Text and heavy surfaces. |
| `canvas` | Warm off-white. The page. |
| `signal` | Orange. Calls to action, active states, the one accent. |
| `thread` | Muted rule/border grey. |

Custom utilities: `paper-grain` (subtle stock texture), `ink-in` (entrance
animation), `text-receipt` (monospaced tabular figures for prices and
references).

**To rebrand**, change the token values at the top of `styles.css`. Do not
sprinkle new colours into components — a colour used once is a colour nobody
maintains.

---

## Adding a page

1. Create `src/routes/quotes.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/quotes")({
  head: () => ({
    meta: [
      { title: "Request a quote — AK IT'S TIME TO SHINE" },
      { name: "description", content: "Tell us about your print job and we'll price it." },
      { property: "og:title", content: "Request a quote — AK IT'S TIME TO SHINE" },
      { property: "og:description", content: "Tell us about your print job and we'll price it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Quotes,
});

function Quotes() {
  return <main className="mx-auto max-w-3xl px-5 py-16">…</main>;
}
```

2. Add a link in `src/components/SiteChrome.tsx`.

The route file must exist before you link to it — `<Link to="/quotes">` is type
checked against the generated tree.

Every page needs its own `head()` with a unique title and description. It is
how the studio gets found.

---

## Admin-only pages

`src/routes/admin.tsx` wraps its content in `AdminGate`, which reads the stored
user and redirects anyone who is not the admin.

This is a **convenience, not a defence**. The real enforcement is the
`requireAdmin` guard in the backend, which returns 403 regardless of what
the browser believes. Never put a secret in the frontend bundle and never trust
a client-side role check for anything that matters.

To gate another page, reuse the same pattern.

---

## Commands

```bash
npm run dev        # http://localhost:8080
npm run build      # production bundle
npm run lint
```
