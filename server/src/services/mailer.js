import nodemailer from "nodemailer";

// Email is optional — without SMTP creds every send is a no-op,
// so dev/demo runs never try to connect anywhere.
const enabled = !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const transport = enabled
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

export const mailEnabled = enabled;

export async function sendMail(to, subject, html) {
  if (!transport) return false;
  await transport.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html,
  });
  return true;
}
