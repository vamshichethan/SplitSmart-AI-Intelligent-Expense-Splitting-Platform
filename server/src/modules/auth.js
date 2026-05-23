import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { groups, users } from "../data.js";
import { requireAuth, signSession } from "../middleware/auth.js";
import { initialsFor, publicUser } from "../utils/users.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const registerSchema = loginSchema.extend({
  name: z.string().min(2).max(80)
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  const user = users.find((item) => item.email.toLowerCase() === email);
  const isValid = user ? await bcrypt.compare(parsed.data.password, user.passwordHash) : false;

  if (!user || !isValid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ token: signSession(user), user: publicUser(user) });
});

authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const email = parsed.data.email.toLowerCase();
  if (users.some((item) => item.email.toLowerCase() === email)) {
    res.status(409).json({ error: "Email is already registered" });
    return;
  }

  const user = {
    id: `u${users.length + 1}`,
    name: parsed.data.name,
    email,
    avatar: initialsFor(parsed.data.name),
    passwordHash: await bcrypt.hash(parsed.data.password, 10)
  };

  users.push(user);
  groups.push({
    id: `g${groups.length + 1}`,
    name: `${parsed.data.name}'s group`,
    type: "Friends",
    currency: "INR",
    createdAt: new Date().toISOString().slice(0, 10),
    memberIds: [user.id]
  });

  res.status(201).json({ token: signSession(user), user: publicUser(user) });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: publicUser(req.user) });
});
