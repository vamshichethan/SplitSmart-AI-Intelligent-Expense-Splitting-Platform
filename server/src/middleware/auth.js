import jwt from "jsonwebtoken";
import { users } from "../data.js";

const fallbackSecret = "splitsmart-local-dev-secret";

export function requireAuth(req, res, next) {
  const header = req.get("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET ?? fallbackSecret);
    const user = users.find((item) => item.id === payload.sub);

    if (!user) {
      res.status(401).json({ error: "User no longer exists" });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function signSession(user) {
  return jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET ?? fallbackSecret, {
    expiresIn: "7d"
  });
}
