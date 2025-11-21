import dotenv from "dotenv";
dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "Sushant@1234";
export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "";
export const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
export const PRO_PLAN_PRICE_INR = Number(process.env.PRO_PLAN_PRICE_INR || 499);
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
export const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
export const EMAIL_FROM = process.env.EMAIL_FROM || "onboarding@resend.dev";
export const OTP_EXPIRY_MINUTES = Number(process.env.OTP_EXPIRY_MINUTES || 10);
export const OTP_RESEND_INTERVAL_SECONDS = Number(process.env.OTP_RESEND_INTERVAL_SECONDS || 60);