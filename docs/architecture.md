# Architecture Notes

SplitSmart AI starts as a two-package workspace:

- `client`: Vite React dashboard with expense entry, balances, settlement view, receipt extraction preview, and analytics.
- `server`: Express API with seeded data, JWT-based demo auth, request validation, and settlement simplification logic.

The current settlement engine calculates net balances by crediting payers and debiting each participant's split. It then greedily matches debtors to creditors to produce practical repayment instructions.

The next major structural step is persistence: introduce Prisma, PostgreSQL, and auth-aware services while preserving the current API surface.
