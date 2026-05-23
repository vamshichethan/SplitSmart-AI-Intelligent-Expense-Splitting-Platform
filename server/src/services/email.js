import nodemailer from "nodemailer";

export async function sendReminderEmail({ to, subject, text }) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return { skipped: true, reason: "SMTP is not configured" };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const result = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    text
  });

  return { skipped: false, messageId: result.messageId };
}
