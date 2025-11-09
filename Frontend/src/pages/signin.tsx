import { useNavigate } from "react-router-dom";
import SignPage from "./signPage";
import { useRef, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";

function Signin() {
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  // Separate state for username, password, and general messages
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signInButton() {
    setUsernameError(null);
    setPasswordError(null);
    setGeneralMessage(null);
    setLoading(true);

    try {
      const username = usernameRef.current?.value?.trim();
      const password = passwordRef.current?.value;

      if (!username) {
        setUsernameError("Username cannot be empty.");
        setLoading(false);
        return;
      }

      if (!password) {
        setPasswordError("Password cannot be empty.");
        setLoading(false);
        return;
      }

      const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
        username,
        password,
      });

      if (response.status === 200) {
        localStorage.setItem("token", response.data.token);
        setGeneralMessage("✅ Signed in successfully! Redirecting...");
        setTimeout(() => navigate("/user/dashboard"), 1500);
      } else {
        handleErrors(response.data.message);
      }
    } catch (e) {
      if (axios.isAxiosError(e) && e.response) {
        handleErrors(e.response.data.message);
      } else {
        console.error("Error:", e);
        setGeneralMessage("⚠️ An unexpected error occurred. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleErrors(message: string) {
    switch (message) {
      case "User does not exist!":
        setUsernameError("This user does not exist.");
        break;
      case "Invalid credentials!":
        setUsernameError("Username must be 3–20 characters long.");
        setPasswordError("Password must be 8–20 characters long, including uppercase, lowercase, number, and special character.");
        break;
      case "Username must be at least 6 characters":
        setUsernameError("Username must be at least 6 characters long.");
        break;
      case "Password must include a number":
        setPasswordError("Password must include at least one number.");
        break;
      default:
        setGeneralMessage(message);
    }
  }

  return (
    <SignPage
      title="Sign In"
      buttonOnClick={signInButton}
      usernameRef={usernameRef}
      passwordRef={passwordRef}
      subTitle="Don't have an account?"
      linkPath="/user/signup"
      linkName="Signup"
      usernameError={usernameError ?? undefined}
      passwordError={passwordError ?? undefined}
      generalMessage={generalMessage ?? undefined}
      loading={loading}
    />
  );
}

export default Signin;
