import { useNavigate } from "react-router-dom";
import SignPage from "./signPage";
import { useRef, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";

function Signup() {
  const usernameRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const firstNameRef = useRef<HTMLInputElement | null>(null);
  const lastNameRef = useRef<HTMLInputElement | null>(null);
  const addressRef = useRef<HTMLInputElement | null>(null);
  const navigate = useNavigate();

  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [generalMessage, setGeneralMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signUpButton() {
    setUsernameError(null);
    setPasswordError(null);
    setGeneralMessage(null);
    setLoading(true);

    try {
      const username = usernameRef.current?.value?.trim();
      const password = passwordRef.current?.value;
      const firstName = firstNameRef.current?.value?.trim();
      const lastName = lastNameRef.current?.value?.trim();
      const address = addressRef.current?.value?.trim();

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

      const response = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
        username,
        password,
        firstName,
        lastName,
        address,
      });

      if (response.status === 200) {
        setGeneralMessage("✅ Signed up successfully! Redirecting...");
        setTimeout(() => navigate("/user/signin"), 2000);
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
      case "User already exists.":
        setUsernameError("This username is already taken. Try a different one.");
        break;

      case "Invalid credentials!":
        setUsernameError("Username must be 3–20 characters long.");
        setPasswordError(
          "Password must be 8–20 characters long, including uppercase, lowercase, number, and special character."
        );
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
      title="Create an Account"
      buttonOnClick={signUpButton}
      usernameRef={usernameRef}
      passwordRef={passwordRef}
      firstNameRef={firstNameRef}
      lastNameRef={lastNameRef}
      addressRef={addressRef}
      subTitle="Already have an account?"
      linkPath="/user/signin"
      linkName="Sign In"
      usernameError={usernameError || undefined}
      passwordError={passwordError || undefined}
      generalMessage={generalMessage || undefined}
      loading={loading}
    />
  );
}

export default Signup;
