# SplitSmart AI

**AI-powered expense splitting platform with receipt scanning, UPI-ready settlements, reminders, analytics, and dispute handling.**

SplitSmart AI is designed as a placement-level full-stack project: not just a Splitwise clone, but a real-world expense collaboration platform. Users can create groups, add expenses, scan bills, split items person-by-person, simplify balances, settle payments, raise disputes, and understand spending patterns through analytics and AI insights.

---

## Project Vision

Managing shared expenses is simple until bills become itemized, people pay unequally, payments are delayed, or someone disagrees with a charge. SplitSmart AI solves this by combining:

- Group-based expense tracking
- AI receipt and bill scanning
- Item-wise bill allocation
- Smart split logic
- Graph-based settlement simplification
- UPI and Razorpay test payment flows
- Email and optional WhatsApp/SMS reminders
- Dispute resolution workflows
- Analytics dashboards
- AI-powered spending insights

The goal is to build a polished, production-style expense management system that demonstrates full-stack engineering, database modeling, authentication, payments, AI/OCR integration, algorithms, and product thinking.

---

## Core Features

### 1. Group Expense Management

- Create expense groups for trips, roommates, subscriptions, events, teams, or families
- Add and manage friends or members
- Assign group roles: admin and member
- Add expenses with payer, amount, category, date, notes, and attachments
- Track who paid, who owes, and group-level balances

### 2. AI Bill Scanner

Users upload a restaurant bill or receipt image. The AI/OCR service extracts structured bill data:

- Items
- Item prices
- Taxes
- Service charges
- Discounts
- Tips
- Final total

After extraction, users can assign each item to one or more members.

Example item allocation:

| Item | Assigned To | Split Style |
| --- | --- | --- |
| Pizza | Vamshi, Rahul | Shared equally |
| Coke | Rahul | Single person |
| Veg Meals | Priya | Single person |
| Service Charge | Everyone | Proportional |

### 3. Smart Split Logic

Supported split modes:

- Equal split
- Unequal/custom split
- Percentage split
- Item-wise split
- Recurring expenses
- Shared subscriptions
- Tax and service charge distribution
- Split validation to prevent incorrect totals

### 4. Balance Simplification

Instead of showing many unnecessary repayments, SplitSmart AI simplifies balances into the minimum practical settlements.

Example:

```text
A owes B INR 500
B owes C INR 300
C owes A INR 200
```

Can be simplified into fewer final payments using a graph/net-balance algorithm.

This is one of the strongest algorithmic parts of the project because it applies DSA to a real product problem.

### 5. Payment Reminders

- Due dates for expenses and settlements
- Email reminders
- Optional WhatsApp/SMS reminders
- Reminder frequency: once, daily, weekly, custom
- Overdue status tracking
- Notification history

### 6. UPI and Payment Integration

Settlement options:

- Razorpay test mode checkout
- UPI intent/deep link support
- Manual "mark as paid"
- Payment status tracking
- Settlement history
- Receipt generation

### 7. Dispute System

Members can raise a dispute when they disagree with an expense.

Dispute workflow:

- Raise dispute on an expense or split
- Add reason and optional evidence
- Comment thread between group members
- Admin reviews the dispute
- Admin resolves, rejects, or adjusts the expense
- Status tracking: pending, under_review, resolved, rejected

### 8. Analytics Dashboard

Dashboard metrics:

- Monthly spending
- Group-wise spending
- Category-wise spending
- Top spender
- Pending dues
- Settlement trends
- Most active groups
- Delayed settlements
- Personal vs shared expenses

Recommended charting library: **Recharts**.

### 9. AI Spending Insights

AI-generated insights can summarize user and group spending patterns:

- "You spent 42% more on food this month."
- "Your group's highest shared expense category is travel."
- "Rahul usually delays settlements by more than 5 days."
- "Your subscription expenses increased this month."
- "Food and transport make up most of your shared expenses."

### 10. Authentication and Roles

- JWT authentication
- Password hashing
- Refresh token support
- Google login optional
- User profile management
- Group roles:
  - Group admin
  - Group member

---

## Tech Stack

### Frontend

- React
- Tailwind CSS
- React Router
- Axios or TanStack Query
- Recharts
- Form validation with React Hook Form + Zod

### Backend

- Node.js
- Express.js
- JWT authentication
- Bcrypt password hashing
- Zod/Joi request validation
- Multer for receipt uploads
- Nodemailer for email reminders

### Database

- PostgreSQL
- Prisma ORM or node-postgres
- Relational schema for users, groups, expenses, payments, and disputes

PostgreSQL is preferred because money transactions, settlements, and dispute records need structured relational data and strong consistency.

### AI and OCR

Options:

- Gemini API or OpenAI API for structured extraction and spending insights
- Google Vision API for OCR
- Tesseract.js for local OCR fallback

Recommended approach:

1. OCR extracts raw text from the receipt image
2. AI model converts raw text into structured JSON
3. Backend validates extracted totals before saving
4. User confirms or edits the scanned bill before creating the expense

### Payments

- Razorpay test mode
- UPI intent links
- Manual settlement fallback

### Deployment

Suggested deployment plan:

- Frontend: Vercel or Netlify
- Backend: Render, Railway, or Fly.io
- Database: Supabase PostgreSQL, Neon, Railway PostgreSQL, or Render PostgreSQL
- File uploads: Cloudinary, S3, or local storage for development

---

## System Architecture

```text
React Frontend
  |
  | REST API / JSON
  v
Node.js + Express API
  |
  | SQL queries / ORM
  v
PostgreSQL Database
  |
  +--> AI/OCR Service
  |      |
  |      +--> Receipt image OCR
  |      +--> Structured bill extraction
  |      +--> Spending insights
  |
  +--> Payment Service
  |      |
  |      +--> Razorpay test checkout
  |      +--> UPI intent
  |
  +--> Notification Service
         |
         +--> Email reminders
         +--> Optional SMS/WhatsApp reminders
```

---

## Database Design

Main tables:

| Table | Purpose |
| --- | --- |
| users | Stores user accounts, auth data, and profile details |
| groups | Expense groups created by users |
| group_members | Maps users to groups with roles |
| expenses | Stores expense records |
| expense_splits | Stores who owes what for each expense |
| receipt_items | Stores extracted bill items from scanned receipts |
| payments | Stores payment attempts and completed payments |
| settlements | Stores simplified settlement records |
| disputes | Stores disputes raised against expenses or splits |
| dispute_comments | Stores discussion inside a dispute |
| notifications | Stores reminder and notification history |
| receipts | Stores uploaded receipt metadata and OCR output |
| recurring_expenses | Stores recurring bills and subscriptions |
| audit_logs | Stores important financial or admin actions |

### Suggested Entity Relationships

```text
users 1---N group_members N---1 groups
groups 1---N expenses
users 1---N expenses as payer
expenses 1---N expense_splits
expenses 1---N receipt_items
expenses 1---N disputes
disputes 1---N dispute_comments
users 1---N payments
groups 1---N settlements
users 1---N notifications
```

---

## Suggested API Modules

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `GET /api/users/search`
- `GET /api/users/:id`
- `PATCH /api/users/me`

### Groups

- `POST /api/groups`
- `GET /api/groups`
- `GET /api/groups/:groupId`
- `POST /api/groups/:groupId/members`
- `PATCH /api/groups/:groupId/members/:memberId`
- `DELETE /api/groups/:groupId/members/:memberId`

### Expenses

- `POST /api/groups/:groupId/expenses`
- `GET /api/groups/:groupId/expenses`
- `GET /api/expenses/:expenseId`
- `PATCH /api/expenses/:expenseId`
- `DELETE /api/expenses/:expenseId`

### Receipt Scanner

- `POST /api/receipts/upload`
- `POST /api/receipts/:receiptId/extract`
- `PATCH /api/receipts/:receiptId/items`
- `POST /api/receipts/:receiptId/create-expense`

### Settlements

- `GET /api/groups/:groupId/balances`
- `POST /api/groups/:groupId/simplify`
- `POST /api/settlements`
- `PATCH /api/settlements/:settlementId/mark-paid`

### Payments

- `POST /api/payments/razorpay/order`
- `POST /api/payments/razorpay/verify`
- `POST /api/payments/upi-intent`
- `GET /api/payments/history`

### Disputes

- `POST /api/expenses/:expenseId/disputes`
- `GET /api/groups/:groupId/disputes`
- `POST /api/disputes/:disputeId/comments`
- `PATCH /api/disputes/:disputeId/resolve`

### Analytics

- `GET /api/analytics/monthly`
- `GET /api/analytics/groups`
- `GET /api/analytics/categories`
- `GET /api/analytics/settlements`
- `GET /api/analytics/insights`

---

## Build Phases

### Phase 1: Project Setup and Foundation

Goal: Create the full-stack foundation.

- Set up React frontend
- Set up Express backend
- Configure PostgreSQL
- Add Prisma or SQL migration setup
- Add environment variable management
- Add base folder structure
- Add global error handling
- Add request validation pattern
- Add basic UI shell and routing

Deliverable:

- Running frontend and backend
- Connected database
- Clean project structure

### Phase 2: Authentication and User Management

Goal: Secure the application.

- User registration
- User login
- JWT access tokens
- Refresh token flow
- Password hashing
- Auth middleware
- Protected routes
- User profile page

Deliverable:

- Users can securely sign up, log in, and access protected pages.

### Phase 3: Groups and Members

Goal: Build collaboration primitives.

- Create groups
- Add members
- Search users
- Assign group roles
- Remove members
- View group dashboard

Deliverable:

- Users can create groups and collaborate with members.

### Phase 4: Expense Creation and Split Logic

Goal: Implement core Splitwise-style expense handling.

- Add expenses
- Equal split
- Unequal split
- Percentage split
- Category assignment
- Expense history
- Balance calculation
- Edit and delete expenses

Deliverable:

- Users can add expenses and see who owes whom.

### Phase 5: Balance Simplification Algorithm

Goal: Add strong DSA value.

- Compute net balance for each member
- Separate debtors and creditors
- Generate minimum practical settlement transactions
- Store settlement suggestions
- Mark settlements as paid

Deliverable:

- Groups can simplify balances into fewer settlements.

### Phase 6: AI Receipt Scanner

Goal: Add the standout AI feature.

- Upload bill image
- Extract raw text using OCR
- Convert OCR output into structured JSON using AI
- Detect items, prices, tax, service charge, and total
- Validate extracted totals
- Let users edit extracted bill data
- Assign items to members
- Create item-wise expense splits

Deliverable:

- Users can scan a receipt and create an item-wise split expense.

### Phase 7: Payments and UPI Settlement

Goal: Make settlements feel real.

- Razorpay test order creation
- Razorpay payment verification
- UPI intent generation
- Manual mark-as-paid flow
- Payment history
- Settlement receipt generation

Deliverable:

- Users can settle balances through payment flows or manual confirmation.

### Phase 8: Reminders and Notifications

Goal: Add real-world follow-up behavior.

- Due dates
- Email reminders
- Reminder frequency
- Overdue status
- Notification logs
- Optional WhatsApp/SMS integration

Deliverable:

- Users get reminders for pending and overdue settlements.

### Phase 9: Dispute Management

Goal: Add product depth and trust workflows.

- Raise disputes
- Add dispute reason
- Comment thread
- Attach evidence optionally
- Admin resolution flow
- Expense adjustment after dispute resolution

Deliverable:

- Users can challenge incorrect expenses and admins can resolve them.

### Phase 10: Analytics Dashboard

Goal: Turn expense records into insight.

- Monthly spending chart
- Group-wise spending chart
- Category-wise spending chart
- Pending dues cards
- Top spender
- Settlement trend chart
- Filters by date, group, and category

Deliverable:

- Users can understand spending patterns visually.

### Phase 11: AI Spending Insights

Goal: Add intelligent summaries.

- Generate user-level spending insights
- Generate group-level spending insights
- Detect unusual increases
- Identify delayed settlements
- Highlight top categories
- Suggest budgeting actions

Deliverable:

- Users receive natural-language insights about spending behavior.

### Phase 12: Polish, Testing, and Deployment

Goal: Prepare the project for resume, demo, and interviews.

- Add loading states
- Add empty states
- Add responsive layouts
- Add unit tests for split logic
- Add integration tests for APIs
- Add seed data
- Add API documentation
- Add deployment configuration
- Deploy frontend, backend, and database
- Record demo video

Deliverable:

- Production-style demo-ready full-stack project.

---

## Folder Structure

Suggested monorepo structure:

```text
splitsmart-ai/
  client/
    src/
      components/
      pages/
      routes/
      hooks/
      services/
      store/
      utils/
  server/
    src/
      config/
      controllers/
      middleware/
      modules/
        auth/
        users/
        groups/
        expenses/
        receipts/
        settlements/
        payments/
        disputes/
        analytics/
        notifications/
      services/
      utils/
      app.js
      server.js
    prisma/
      schema.prisma
      migrations/
  docs/
    api.md
    architecture.md
  README.md
```

---

## Key Algorithms

### Balance Calculation

For every expense:

1. Add amount paid to payer's balance
2. Subtract owed amount from each participant's balance
3. Net result:
   - Positive balance means the user should receive money
   - Negative balance means the user owes money

### Settlement Simplification

High-level approach:

1. Build net balance for each user
2. Put users with negative balance into debtor list
3. Put users with positive balance into creditor list
4. Match debtors and creditors greedily
5. Generate settlement transactions until all balances become zero

Time complexity is efficient enough for real group sizes and easy to explain in interviews.

---

## Security Considerations

- Hash passwords using bcrypt
- Store JWT secrets securely
- Validate all request bodies
- Use role-based access for group actions
- Prevent users from accessing groups they do not belong to
- Verify payment signatures from Razorpay
- Validate receipt extraction totals before creating expenses
- Keep audit logs for financial changes
- Avoid storing sensitive payment details directly

---

## Resume Description

**SplitSmart AI - AI-Powered Expense Splitting Platform**

Built a full-stack expense management platform with group-based bill splitting, AI-powered receipt scanning, item-wise expense allocation, payment reminders, settlement tracking, dispute management, and spending analytics. Implemented graph-based balance simplification to minimize transactions and integrated Razorpay test payments with secure JWT authentication.

---

## Why This Project Is Placement-Level

This project demonstrates:

- Full-stack application development
- Relational database design
- Authentication and authorization
- Payment integration
- AI/OCR integration
- Graph algorithm implementation
- Dashboard analytics
- Notification workflows
- Dispute resolution product design
- Clean API architecture
- Real-world financial data modeling

Difficulty level:

```text
Original Splitwise clone: Easy to Medium
SplitSmart AI upgraded version: Medium-Hard
```

---

## Future Enhancements

- Google login
- Mobile app with React Native
- Push notifications
- Multi-currency support
- PDF receipt export
- Budget planning
- Fraud/anomaly detection
- Bank statement import
- Voice-based expense entry
- Admin dashboard for platform monitoring

---

## Status

Planning and architecture phase. The README defines the complete product scope, architecture, tech stack, database plan, API modules, and phased implementation roadmap.

