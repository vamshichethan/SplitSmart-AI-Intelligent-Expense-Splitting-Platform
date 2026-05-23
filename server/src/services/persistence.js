import pg from "pg";
import { disputeComments, disputes, expenses, groups, notifications, payments, users } from "../data.js";

const { Pool } = pg;
const STATE_KEY = "default";
let pool = null;
let isReady = false;

export async function initializePersistence() {
  if (!process.env.DATABASE_URL) {
    return { enabled: false };
  }

  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  await pool.query(`
    create table if not exists app_state (
      id text primary key,
      state jsonb not null,
      updated_at timestamptz not null default now()
    )
  `);

  const result = await pool.query("select state from app_state where id = $1", [STATE_KEY]);
  if (result.rows[0]?.state) {
    replaceArray(users, result.rows[0].state.users);
    replaceArray(groups, result.rows[0].state.groups);
    replaceArray(expenses, result.rows[0].state.expenses);
    replaceArray(disputes, result.rows[0].state.disputes);
    replaceArray(disputeComments, result.rows[0].state.disputeComments);
    replaceArray(notifications, result.rows[0].state.notifications);
    replaceArray(payments, result.rows[0].state.payments);
  } else {
    await persistState();
  }

  isReady = true;
  return { enabled: true };
}

export async function persistState() {
  if (!pool) return;

  await pool.query(
    `
      insert into app_state (id, state, updated_at)
      values ($1, $2, now())
      on conflict (id)
      do update set state = excluded.state, updated_at = now()
    `,
    [
      STATE_KEY,
      {
        users,
        groups,
        expenses,
        disputes,
        disputeComments,
        notifications,
        payments
      }
    ]
  );
}

export function persistenceMiddleware(req, res, next) {
  res.on("finish", () => {
    if (isReady && ["POST", "PATCH", "PUT", "DELETE"].includes(req.method) && res.statusCode < 400) {
      persistState().catch((error) => console.error("Failed to persist state", error));
    }
  });

  next();
}

function replaceArray(target, source = []) {
  target.splice(0, target.length, ...source);
}
