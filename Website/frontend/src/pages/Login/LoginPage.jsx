import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./Login.module.css";
import axios from "axios";

export default function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [error, setError] = useState("");

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!formData.email || !formData.password) {
      setError("Please enter both email and password.");
      return;
    }

    if (!formData.email.toLowerCase().endsWith(".ac.uk")) {
      setError("Please use a valid university email");
      return;
    }


    try {
      const response = await axios.post(
        "http://localhost:3000/users/login", // will need to change this route when we run on actual server
      {
        email: formData.email,
        password: formData.password,
      });
      localStorage.setItem("token", response.data.token); // Save jwt for login
      localStorage.setItem("user", JSON.stringify(response.data.user))
      window.dispatchEvent(new Event("authChanged"));
      
      navigate("/success", {
      state: {
        title: "Log in Successful",
        message: `You have been logged in`,
      },
    });
    } catch (err) {
      console.log(err)
      setError(
        err.response?.data?.error || " Log in failed. Please try again."
      )
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Sign In</h1>
        <p className={styles.subtitle}>
          Welcome back. Please enter your Cardiff University details.
        </p>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Josh03@cardiff.ac.uk"
              value={formData.email}
              onChange={handleChange}
              className={styles.input}
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
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              className={styles.input}
            />
          </div>

          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input
                name="rememberMe"
                type="checkbox"
                checked={formData.rememberMe}
                onChange={handleChange}
              />
              <span>Remember me</span>
            </label>

            <a href="#" className={styles.link}>
              Forgot password?
            </a>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <button type="submit" className={styles.button}>
            Sign In
          </button>
        </form>

        <p className={styles.footerText}>
          Don&apos;t have an account?{" "}
          <Link to="/signup" className={styles.link}>
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}