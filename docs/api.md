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
- `POST /api/groups/:groupId/members` adds an existing user with `userId` or creates a custom member with `name` and optional `email`.
- `POST /api/groups/:groupId/expenses` creates an `equal`, `custom`, or `percentage` split expense.
- `POST /api/receipts/mock-extract` returns a mock structured receipt extraction.
- `POST /api/receipts/upload` uploads a receipt image to Cloudinary when configured.
- `POST /api/groups/:groupId/receipts/item-wise-expense` creates an item-wise expense from extracted receipt items.
- `POST /api/groups/:groupId/payments/upi-intent` creates a pending UPI intent link for an outstanding settlement.
- `POST /api/groups/:groupId/payments/manual` marks an outstanding settlement as completed.
- `POST /api/payments/razorpay/order` creates a Razorpay test order when configured.
- `POST /api/expenses/:expenseId/reminders` logs payment reminders for owing members.
- `POST /api/expenses/:expenseId/disputes` raises a dispute for an expense.
- `POST /api/disputes/:disputeId/comments` appends a dispute comment.
- `PATCH /api/disputes/:disputeId/resolve` resolves or rejects a dispute.
- `GET /api/groups/:groupId/analytics/ai-insights` returns Gemini-backed insights when configured.

Protected routes expect:

```text
Authorization: Bearer <token>
```

Demo login:

```text
email: vamshi@example.com
password: password123
```

Expense split examples:

```json
{
  "title": "Dinner",
  "amount": 3000,
  "category": "Food",
  "paidBy": "u1",
  "splitMode": "percentage",
  "splits": [
    { "userId": "u1", "percentage": 50 },
    { "userId": "u2", "percentage": 25 },
    { "userId": "u3", "percentage": 25 }
  ]
}
```

Receipt item-wise save example:

```json
{
  "paidBy": "u1",
  "receipt": {
    "merchant": "Coastal Curry House",
    "tax": 184,
    "serviceCharge": 240,
    "total": 3144,
    "items": [
      { "name": "Veg Thali", "price": 460, "assignedTo": ["u1"] },
      { "name": "Chicken Biryani", "price": 580, "assignedTo": ["u2", "u3"] }
    ]
  }
}
```

Settlement payment example:

```json
{
  "from": "u2",
  "to": "u1",
  "amount": 1750
}
```

## Next Backend Milestones

- Add Prisma schema and PostgreSQL migrations.
- Move seeded data into database seed scripts.
- Replace mock receipt extraction with OCR plus model-based normalization.
