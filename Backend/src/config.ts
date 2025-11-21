import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "Sushant@1234";
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
export const PRO_PLAN_PRICE_INR = Number(process.env.PRO_PLAN_PRICE_INR || 499);
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const SMTP_HOST = process.env.SMTP_HOST || "";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_USER = process.env.SMTP_USER || "";
export const SMTP_PASS = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || process.env.SMTP_USER || "";
export const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
export const OTP_RESEND_INTERVAL_SECONDS = Number(process.env.OTP_RESEND_INTERVAL_SECONDS || 60);