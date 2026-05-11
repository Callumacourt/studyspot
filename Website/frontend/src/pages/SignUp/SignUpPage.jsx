import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SignUpPage.module.css";
import axios from "axios";

// Sign-up page for creating a new account.
export default function SignUpPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    // Basic client-side validation for immediate feedback.
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please complete all fields.");
      return;
    }

    if (!formData.email.toLowerCase().endsWith(".ac.uk")) {
      setError("Invalid Student Email");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      await axios.post(
        `${import.meta.env.VITE_API_URL}/users/register`, // will need to change this route when we run on actual server
      {
        email: formData.email,
        password: formData.password,
      });

      navigate("/success", {
      state: {
        title: "Sign Up Successful",
        message: `Your account has been created for ${formData.email}`,
      },
    });
    } catch (err) {
      setError(
        err.response?.data?.error || "Registration failed. Please try again."
      )
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign Up</h1>
        <p className={styles.subtitle}>
          Create your Cardiff University account.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="fullName" className={styles.label}>
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              placeholder="John Smith"
              value={formData.fullName}
              onChange={handleChange}
              className={styles.input}
              autoComplete="name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Cardiff Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="youremail@cardiff.ac.uk"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
              autoComplete="new-password"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Re-enter your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={styles.input}
              autoComplete="new-password"
            />
          </div>

          {/* role=alert ensures validation errors are announced immediately */}
          {error && <p className={styles.error} role="alert" aria-live="assertive">{error}</p>}

          <button type="submit" className={styles.button}>
            Sign Up
          </button>
        </form>

        <p className={styles.footerText}>
          Already have an account?{" "}
          <Link to="/login" className={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}