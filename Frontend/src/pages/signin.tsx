import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { GoogleLogin, CredentialResponse } from "@react-oauth/google";
import { AlertTriangle, CheckCircle2, Mail, ShieldCheck } from "lucide-react";
import { BACKEND_URL } from "../config";
import { Logo } from "../components/Logo";
import { Button } from "../components/button";
import { useAppConfig } from "../context/AppConfigContext";

type Status = {
  type: "error" | "success";
  message: string;
} | null;

function Signin() {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const navigate = useNavigate();
  const { googleClientId } = useAppConfig();
  const googleEnabled = !!googleClientId;

  function setError(message: string) {
    setStatus({ type: "error", message });
  }

  function setSuccess(message: string) {
    setStatus({ type: "success", message });
  }

  async function handleGoogleAuth(response: CredentialResponse) {
    if (!response.credential) {
      setError("Google sign-in failed. Please try again.");
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/v1/auth/google`, {
        idToken: response.credential,
        firstName: firstName || undefined,
        lastName: lastName || undefined
      });
      localStorage.setItem("token", res.data.token);
      setSuccess("Signed in with Google! Redirecting...");
      setTimeout(() => navigate("/user/spaces"), 600);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Google sign-in failed.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function requestOtp() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setOtpLoading(true);
    setStatus(null);
    try {
      const res = await axios.post(`${BACKEND_URL}/api/v1/auth/request-otp`, { email: email.trim() });
      setOtpSent(true);
      setSuccess(res.data.message || "OTP sent to your email.");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Unable to send OTP right now.";
      setError(message);
    } finally {
      setOtpLoading(false);
    }
  }

  async function verifyOtp() {
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!otp.trim()) {
      setError("Enter the 6-digit OTP you received.");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const payload: Record<string, string> = {
        email: email.trim(),
        otp: otp.trim()
      };
      if (firstName.trim()) payload.firstName = firstName.trim();
      if (lastName.trim()) payload.lastName = lastName.trim();
      const res = await axios.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, payload);
      localStorage.setItem("token", res.data.token);
      setSuccess("Signed in! Redirecting to your spaces...");
      setTimeout(() => navigate("/user/spaces"), 800);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Unable to verify OTP right now.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white">
      <div className="relative w-full md:w-1/2 h-[40vh] md:h-screen">
        <img
          src="/images/signup-image.jpg"
          alt="BrainCache"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-indigo-900/60 to-black/80" />
        <div className="absolute bottom-8 md:bottom-12 left-4 md:left-8 right-4 md:right-8 space-y-3 md:space-y-4">
          <Logo />
          <p className="text-base md:text-lg text-indigo-100 max-w-md">
            Capture every idea, link, and inspiration. BrainCache keeps your knowledge organized with powerful sharing and collaboration.
          </p>
          <div className="flex items-center gap-2 md:gap-3 text-xs md:text-sm text-indigo-100">
            <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-emerald-300 flex-shrink-0" />
            <span>Secure by design — choose Google or OTP sign-in.</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12">
        <div className="w-full max-w-xl bg-white/10 backdrop-blur-lg border border-white/10 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 md:space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs md:text-sm uppercase tracking-[0.3em] text-indigo-200">Welcome to BrainCache</p>
            <h1 className="text-2xl md:text-3xl font-semibold">Sign in or create an account</h1>
            <p className="text-indigo-100 text-xs md:text-sm">No passwords. Pick your favorite method below.</p>
          </div>

          {googleEnabled && (
            <div className="space-y-4">
              <GoogleLogin
                onSuccess={handleGoogleAuth}
                onError={() => setError("Google sign-in failed. Please try again.")}
                shape="pill"
                text="continue_with"
                size="large"
                logo_alignment="center"
                useOneTap={false}
              />
              <p className="text-center text-xs uppercase tracking-[0.4em] text-indigo-200">OR</p>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <TextInput
                  label="Email"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <TextInput
                label="First name (optional)"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <TextInput
                label="Last name (optional)"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {otpSent && (
                <div className="md:col-span-2">
                  <TextInput
                    label="Enter OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="secondary"
                size="md"
                title={otpLoading ? "Sending OTP..." : otpSent ? "Resend OTP" : "Send OTP"}
                onClick={requestOtp}
                disabled={otpLoading}
              />
              <Button
                variant="primary"
                size="md"
                title={loading ? "Please wait..." : "Verify & Sign In"}
                onClick={verifyOtp}
                disabled={loading || !otpSent}
              />
            </div>
            {!googleEnabled && (
              <p className="text-xs text-indigo-200 text-center">
                Google sign-in is currently disabled. Use email OTP instead.
              </p>
            )}
          </div>

          {status && (
            <div
              className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
                status.type === "success"
                  ? "bg-emerald-500/20 text-emerald-100 border border-emerald-500/40"
                  : "bg-red-500/20 text-red-100 border border-red-500/40"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
  icon,
  maxLength,
  inputMode
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  icon?: React.ReactNode;
  maxLength?: number;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <label className="text-sm text-indigo-100 space-y-1.5 flex flex-col">
      <span className="font-medium">{label}</span>
      <div className="relative">
        {icon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-200 z-10">{icon}</span>}
        <input
          className={`w-full h-12 rounded-full bg-white/15 border border-white/20 text-white placeholder:text-indigo-200/60 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:bg-white/20 focus:border-indigo-300 transition-all px-4 ${icon ? "pl-11" : ""
            }`}
          value={value}
          onChange={onChange}
          type={type}
          maxLength={maxLength}
          inputMode={inputMode}
          placeholder={type === "email" ? "your@email.com" : ""}
        />
      </div>
    </label>
  );
}

export default Signin;
