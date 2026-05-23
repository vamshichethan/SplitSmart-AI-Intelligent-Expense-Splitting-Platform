# SplitSmart AI API

The first implementation uses an in-memory data store so the app is runnable before PostgreSQL and Prisma are introduced.

## Endpoints

- `GET /api/health` returns API status.
- `POST /api/auth/login` authenticates a user and returns a bearer token.
- `POST /api/auth/register` creates a demo user and returns a bearer token.
- `GET /api/auth/me` returns the current user from the bearer token.
- `GET /api/dashboard` returns the dashboard aggregate for the default group.
- `GET /api/dashboard?groupId=:groupId` returns the dashboard aggregate for a selected group.
- `GET /api/groups/:groupId` returns group detail, expenses, balances, and settlements.
- `POST /api/groups` creates a new group with the current user as a member.
- `POST /api/groups/:groupId/members` adds an existing demo user or creates a lightweight member.
- `POST /api/groups/:groupId/expenses` creates an equal or custom split expense.
- `POST /api/receipts/mock-extract` returns a mock structured receipt extraction.

Protected routes expect:

```text
Authorization: Bearer <token>
```

Demo login:

```text
email: vamshi@example.com
password: password123
```

## Next Backend Milestones

- Add Prisma schema and PostgreSQL migrations.
- Move seeded data into database seed scripts.
- Replace mock receipt extraction with OCR plus model-based normalization.
