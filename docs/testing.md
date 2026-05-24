# Testing Notes

Current verification commands:

```bash
npm test
npm run test:jest --workspace server
npm run build
```

The server test suite covers:

- Auth session signing and seeded login.
- Auth route integration through Jest + Supertest.
- Expense split calculations.
- Item-wise receipt splitting and receipt image upload UI.
- Settlement payment balance application.
- Razorpay payment verification route behavior.
- Reminder generation.
- Analytics and insight aggregation.

The CI workflow runs the Node unit tests, Jest/Supertest API integration tests, and Vite production build on every pull request.

The frontend build is checked with Vite. Local browser verification has covered login, group management, split modes, receipt itemization, settlement payments, reminders, disputes, and analytics rendering.
