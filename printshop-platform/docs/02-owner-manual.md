# 02 — Owner's Manual

No code in this document. This is how you run the studio from the website.

---

## Your admin account

There is one administrator: you. It is deliberate and it is enforced in three
places, so nobody can quietly become a second admin.

1. Anyone signing up on the website becomes a **customer**. There is no option
   on the form to choose otherwise.
2. The `/admin` console checks your role before it renders, and sends anyone
   else back to the sign-in page.
3. The database has a rule that physically permits only one admin row.

Your account was created during setup by your developer running the seed
command with your email and password.

### Changing your password

Sign out, click **Forgot password** on the sign-in page, and follow the email.
If email is not configured yet, ask your developer to re-run the seed command
with a new `ADMIN_PASSWORD` — that resets your password and nothing else.

### If you lose access

Nothing is lost. The seed command re-points the admin account at a new
password. Your orders, customers and catalogue are untouched.

---

## The studio console (`/admin`)

Your landing page after signing in. It shows:

- **Total orders** — every order ever placed.
- **Revenue, last 30 days** — the sum of order totals in that window.
- **Orders by stage** — how many jobs are sitting at each stage right now. This
  is your work queue: a pile at *Proofing* means customers are waiting on you.
- **Revenue trend** — day by day for the last 30 days.

---

## The order lifecycle

Every order moves through these stages. You move it; the customer watches.

| Stage | Means |
| --- | --- |
| Received | Order placed, nobody has looked at it yet |
| Artwork review | You are checking the supplied files are printable |
| Proofing | A proof is with the customer for approval |
| Printing | On the press |
| Finishing | Cutting, laminating, binding, embroidery |
| Delivered | Collected or delivered — done |
| Cancelled | Stopped, by either side |

Alongside it, a **payment status**: Unpaid, Deposit, Paid, or Refunded. The two
are independent — you can print an unpaid job, and you can hold a paid job.

### Handling an order

1. Open it from the orders list.
2. Check the artwork the customer uploaded. If it's wrong, move the order to
   **Artwork review** and send a message saying exactly what you need.
3. Advance the stage as the work progresses. Each change is timestamped and
   the customer sees the timeline on their own order page.
4. Update payment status when money arrives.
5. Mark **Delivered** when it leaves your hands.

Never delete an order. **Cancelled** keeps the history; deleting loses it.

### Talking to customers

Each order has a message thread. Anything you write there appears on the
customer's order page and is kept as a record — useful when someone says "but
you told me...". There is also a **WhatsApp** button that opens a chat with
that customer, pre-filled with their order reference.

---

## The catalogue

Products are what customers can order. Each has a name, a description, a
category, a base price, a unit ("each", "per 100"), a turnaround, and a photo.

**Options** are variations with a price difference — a 100mm sticker at +R6, a
soft-touch finish at +R90. The customer's choice is added to the base price.

To retire a product, mark it inactive rather than deleting it. Deleting breaks
the link from old orders that referenced it.

**Pricing advice:** the price stored on an order item is the price at the moment
of ordering. Raising a price today never changes what an old order says.

---

## Inspiration

A curated gallery of past work and reference pieces. It is marketing, not
catalogue — nothing here is orderable. Keep it small and strong; twelve
excellent images beat sixty average ones.

---

## The studio assistant

Customers can ask questions at `/assistant`. It answers **only** from notes you
have written — it cannot invent a price or a turnaround time. If you have not
written about something, it says so and points them at you.

Its knowledge lives in the knowledge base. Each entry is a title and a body,
like a short help article: "Turnaround times", "Artwork requirements",
"Payment and deposits". Write them the way you would explain it out loud.

Every time you save an entry, it is re-learned automatically within a few
minutes. Unpublishing an entry makes the assistant forget it.

**When the assistant gets something wrong**, the fix is almost always to edit
the note, not to touch the software. Vague notes give vague answers.

---

## Weekly rhythm

- Clear the *Received* and *Artwork review* piles.
- Reply to any order thread older than a day.
- Add one new piece to Inspiration.
- Skim the last week of customer questions; anything asked twice deserves a
  knowledge base entry.

## Monthly

- Check the revenue trend against your own books.
- Review prices against your material costs.
- Confirm with your developer that backups are being taken and can be restored
  ([10-maintenance.md](10-maintenance.md#backups)).
