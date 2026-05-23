# Architecture Notes

SplitSmart AI starts as a two-package workspace:

- `client`: Vite React dashboard with expense entry, balances, settlement view, receipt extraction preview, and analytics.
- `server`: Express API with seeded data, JWT-based demo auth, request validation, and settlement simplification logic.

The current settlement engine calculates net balances by crediting payers and debiting each participant's split. It then applies completed settlement payments and greedily matches debtors to creditors to produce practical repayment instructions.

Analytics are calculated from group-local expenses and payment history, producing category totals, monthly totals, top payer, settlement counts, and natural-language spending signals.

The deployed backend uses a lightweight PostgreSQL persistence layer that snapshots the current product state to Neon after successful mutations and restores it on startup. This keeps the live demo durable while leaving room to replace the snapshot layer with full Prisma models later.

The next major structural step is persistence: introduce Prisma, PostgreSQL, and auth-aware services while preserving the current API surface.
