import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { users } from "../src/data.js";
import { requireAuth, signSession } from "../src/middleware/auth.js";

test("seeded demo user password matches the documented login", async () => {
  const user = users.find((item) => item.email === "vamshi@example.com");

  assert.ok(user);
  assert.equal(await bcrypt.compare("password123", user.passwordHash), true);
});

test("auth middleware accepts signed session tokens", () => {
  const user = users[0];
  const token = signSession(user);
  const req = {
    get(name) {
      return name === "authorization" ? `Bearer ${token}` : null;
    }
  };
  const res = {
    statusCode: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
    }
  };
  let didContinue = false;

  requireAuth(req, res, () => {
    didContinue = true;
  });

  assert.equal(didContinue, true);
  assert.equal(req.user.id, user.id);
  assert.equal(res.statusCode, null);
});
