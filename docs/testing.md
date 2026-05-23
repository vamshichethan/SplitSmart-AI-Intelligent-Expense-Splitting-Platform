# Testing Notes

Current verification commands:

```bash
npm test
npm run build
```

The server test suite covers:

- Auth session signing and seeded login.
- Expense split calculations.
- Item-wise receipt splitting.
- Settlement payment balance application.
- Reminder generation.
- Analytics and insight aggregation.

The frontend build is checked with Vite. Local browser verification has covered login, group management, split modes, receipt itemization, settlement payments, reminders, disputes, and analytics rendering.
