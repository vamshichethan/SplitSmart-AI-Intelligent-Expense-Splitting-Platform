import request from "supertest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("auth routes", () => {
  test("logs in the seeded demo user and returns a bearer-ready token", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "vamshi@example.com", password: "password123" })
      .expect(200);

    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toMatchObject({
      email: "vamshi@example.com",
      name: "Vamshi"
    });
  });

  test("rejects invalid credentials", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "vamshi@example.com", password: "wrong-password" })
      .expect(401);
  });
});

describe("payment verification routes", () => {
  let token;
  let originalSecret;

  beforeAll(async () => {
    originalSecret = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_SECRET;

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "vamshi@example.com", password: "password123" });
    token = response.body.token;
  });

  afterAll(() => {
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
  });

  test("rejects Razorpay confirmations that fail mock signature verification", async () => {
    const dashboard = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const settlement = dashboard.body.settlements[0];

    await request(app)
      .post(`/api/groups/${dashboard.body.activeGroup.id}/payments/razorpay/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
        orderId: "not_a_mock_order",
        paymentId: "pay_test"
      })
      .expect(400);
  });

  test("accepts a valid mock Razorpay confirmation for an outstanding settlement", async () => {
    const dashboard = await request(app)
      .get("/api/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
    const settlement = dashboard.body.settlements[0];

    const response = await request(app)
      .post(`/api/groups/${dashboard.body.activeGroup.id}/payments/razorpay/confirm`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        from: settlement.from,
        to: settlement.to,
        amount: settlement.amount,
        orderId: "order_mock_jest",
        paymentId: "pay_jest"
      })
      .expect(201);

    expect(response.body.payments[0]).toMatchObject({
      method: "razorpay",
      status: "completed",
      providerOrderId: "order_mock_jest",
      providerPaymentId: "pay_jest"
    });
  });
});
