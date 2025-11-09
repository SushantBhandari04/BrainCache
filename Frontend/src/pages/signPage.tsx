import { MutableRefObject } from "react";
import { Button } from "../components/button";
import { Link } from "react-router-dom";
import { User, Lock, AlertTriangle, CheckCircle2 } from "lucide-react";

function SignPage({
  title,
  buttonOnClick,
  usernameRef,
  passwordRef,
  firstNameRef,
  lastNameRef,
  addressRef,
  subTitle,
  linkPath,
  linkName,
  usernameError,
  passwordError,
  generalMessage,
  loading,
}: {
  title: string;
  buttonOnClick: () => void;
  usernameRef: MutableRefObject<HTMLInputElement | null>;
  passwordRef: MutableRefObject<HTMLInputElement | null>;
  firstNameRef?: MutableRefObject<HTMLInputElement | null>;
  lastNameRef?: MutableRefObject<HTMLInputElement | null>;
  addressRef?: MutableRefObject<HTMLInputElement | null>;
  subTitle: string;
  linkPath: string;
  linkName: string;
  usernameError?: string;
  passwordError?: string;
  generalMessage?: string;
  loading?: boolean;
}) {
  const isSuccess = generalMessage?.toLowerCase().includes("success");

  return (
    <div
      className="min-h-screen w-full flex flex-col md:flex-row text-white overflow-hidden"
      style={{ fontFamily: "'Manrope', sans-serif" }}
    >
      {/* Left Image Section */}
      <div className="relative w-full md:w-1/2 h-[40vh] md:h-screen">
        <img
          src="../../images/signup-image.jpg"
          alt="BrainCache"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-blue-900/50 to-black/70" />
        <div className="absolute bottom-10 left-10">
          <h1
            className="text-6xl font-extrabold tracking-tight text-yellow-300 drop-shadow-lg"
            style={{ fontFamily: "'Josefin Sans', serif" }}
          >
            Brain<span className="text-white">Cache</span>
          </h1>
          <p className="text-gray-200 mt-2 text-lg">
            Where smart ideas find their home 💡
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative px-6 py-16 md:px-12">
        {/* Decorative Background Blurs */}
        <div className="absolute w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-3xl -top-20 -right-40" />
        <div className="absolute w-[400px] h-[400px] bg-indigo-500/30 rounded-full blur-3xl bottom-0 left-0" />

        {/* Glassmorphic Card */}
        <div className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-10">
          {/* Title */}
          <div className="text-center mb-10">
            <h2
              className="text-3xl font-bold text-yellow-300"
              style={{ fontFamily: "'Josefin Sans', serif" }}
            >
              {title}
            </h2>
            <p className="text-gray-300 mt-2">
              {title === "Sign In"
                ? "Welcome back! Please sign in to continue."
                : "Create your account to get started."}
            </p>
          </div>

          {/* Input Fields */}
          <div className="space-y-6 mb-8">
            {title !== "Sign In" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputField
                  reference={firstNameRef as MutableRefObject<HTMLInputElement | null>}
                  placeholder="First Name"
                  icon={<User className="w-5 h-5 text-gray-400" />}
                />
                <InputField
                  reference={lastNameRef as MutableRefObject<HTMLInputElement | null>}
                  placeholder="Last Name"
                  icon={<User className="w-5 h-5 text-gray-400" />}
                />
                <div className="md:col-span-2">
                  <InputField
                    reference={addressRef as MutableRefObject<HTMLInputElement | null>}
                    placeholder="Address"
                    icon={<User className="w-5 h-5 text-gray-400" />}
                  />
                </div>
              </div>
            )}
            <div>
              <InputField
                reference={usernameRef}
                placeholder="Username"
                icon={<User className="w-5 h-5 text-gray-400" />}
                error={!!usernameError}
              />
              {usernameError && <ErrorText message={usernameError} />}
            </div>

            <div>
              <InputField
                reference={passwordRef}
                placeholder="Password"
                icon={<Lock className="w-5 h-5 text-gray-400" />}
                type="password"
                error={!!passwordError}
              />
              {passwordError && <ErrorText message={passwordError} />}
            </div>
          </div>

          {/* Submit Button */}
          <Button
            variant="tertiary"
            size="lg"
            title={loading ? "Please wait..." : title}
            onClick={buttonOnClick}
            disabled={loading}
            className={`w-full py-3 rounded-full font-semibold text-gray-900 transition-all duration-200 shadow-lg ${
              loading
                ? "bg-yellow-300/70 cursor-not-allowed"
                : "bg-gradient-to-r from-yellow-300 to-yellow-400 hover:scale-[1.02]"
            }`}
          />

          {/* General / Success Message */}
          {generalMessage && (
            <div
              className={`flex items-center justify-center mt-5 rounded-xl p-3 text-sm animate-fadeIn backdrop-blur-xs ${
                isSuccess
                  ? "bg-green-500/10 border border-green-400/40 text-green-300"
                  : "bg-red-500/10 border border-red-400/40 text-red-300"
              }`}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 mr-2 text-red-400" />
              )}
              <span>{generalMessage}</span>
            </div>
          )}

          {/* Subtitle + Link */}
          <div className="text-center mt-6 text-sm text-gray-300">
            {subTitle}{" "}
            <Link
              to={linkPath}
              className="text-yellow-300 font-semibold hover:underline hover:text-yellow-200"
            >
              {linkName}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Input Field ---------- */
interface InputFieldProps {
  reference: MutableRefObject<HTMLInputElement | null>;
  placeholder: string;
  icon?: React.ReactNode;
  type?: string;
  error?: boolean;
}

function InputField({
  reference,
  placeholder,
  icon,
  type = "text",
  error = false,
}: InputFieldProps) {
  return (
    <div className="relative group">
      {icon && (
        <div
          className={`absolute left-4 top-1/2 transform -translate-y-1/2 transition-colors duration-200 ${
            error ? "text-red-400" : "text-gray-400 group-focus-within:text-yellow-300"
          }`}
        >
          {icon}
        </div>
      )}
      <input
        ref={reference}
        type={type}
        placeholder={placeholder}
        className={`w-full h-12 pl-12 pr-4 rounded-full bg-white/20 text-white placeholder-gray-300 border transition-all duration-200 focus:outline-none focus:ring-2 ${
          error
            ? "border-white-400/60 focus:ring-white-400/60 focus:border-transparent"
            : "border-white/30 focus:ring-yellow-300/70 focus:border-transparent"
        }`}
      />
    </div>
  );
}

/* ---------- Error Text ---------- */
function ErrorText({ message }: { message: string }) {
  return (
    <p className="mt-2 ml-3 text-sm text-red-400 flex items-center animate-fadeIn">
      <AlertTriangle className="w-3.5 h-3.5 mr-2 text-red-400" />
      <span className="leading-tight">{message}</span>
    </p>
  );
}

export default SignPage;
