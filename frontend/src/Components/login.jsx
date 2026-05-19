import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiMail,
  FiLock,
  FiUser,
  FiEye,
  FiEyeOff,
  FiArrowLeft,
  FiLogIn,
  FiKey,
  FiSettings,
  FiTool,
  FiBarChart2,
  FiShield,
  FiClock,
  FiUsers,
} from "react-icons/fi";
import { GoogleLogin, useGoogleLogin } from "@react-oauth/google";
import { authAPI } from "../utils/api";
import { subUserService } from "../services/subUserService";
import { countryCodes } from "../utils/countryCodes";

const Login = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const otpRefs = useRef([]);
  const [formType, setFormType] = useState("login");
  const [loginMode, setLoginMode] = useState("password");
  // Remove userType state since we no longer use tabs
  const [otpSent, setOtpSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [formData, setFormData] = useState({
    identifier: "",
    password: "",
    otp: "",
    resetEmail: "",
    resetCode: "",
    newPassword: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneCode: "+91",
  });
  const [resetStep, setResetStep] = useState("email"); // 'email' or 'otp'
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [phoneCodeSearchTerm, setPhoneCodeSearchTerm] = useState("");
  const [showPhoneCodeDropdown, setShowPhoneCodeDropdown] = useState(false);
  const phoneCodeDropdownRef = useRef(null);

  // Close phone code dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (phoneCodeDropdownRef.current && !phoneCodeDropdownRef.current.contains(event.target)) {
        setShowPhoneCodeDropdown(false);
        setPhoneCodeSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle Resend Timer
  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === "identifier" && /^\d+$/.test(value.trim())) {
      setErrors((prev) => ({
        ...prev,
        [name]: "Please enter a valid email address, not just numbers",
      }));
      return;
    }

    if (name === "phone") {
      const numericValue = value.replace(/\D/g, '');
      setFormData((prev) => ({
        ...prev,
        [name]: numericValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }

    if (errors.general) {
      setErrors((prev) => ({
        ...prev,
        general: "",
      }));
    }
  };

  const validateEmailLive = (email, fieldName) => {
    if (!email.trim()) {
      return null;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      if (!email.includes('@')) {
        return "Email must include @ symbol";
      } else if (!email.includes('.')) {
        return "Email must include a domain (e.g., .com, .org)";
      } else if (email.startsWith('@')) {
        return "Email cannot start with @ symbol";
      } else if (email.endsWith('@')) {
        return "Email domain is required after @";
      } else if (email.split('@')[1] && !email.split('@')[1].includes('.')) {
        return "Email domain must include a dot (e.g., gmail.com)";
      } else {
        return "Please enter a valid email address";
      }
    }

    const localPart = email.split('@')[0];
    const domainPart = email.split('@')[1];

    if (localPart.length === 0) {
      return "Email username is required before @";
    }
    if (domainPart.length === 0) {
      return "Email domain is required after @";
    }
    if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
      return "Email domain cannot start or end with a dot";
    }

    return null;
  };

  const handleEmailBlur = (e) => {
    const { name, value } = e.target;
    if (value.trim()) {
      const error = validateEmailLive(value, name);
      if (error) {
        setErrors((prev) => ({
          ...prev,
          [name]: error,
        }));
      }
    }
  };

  const handleOtpChange = (e, index) => {
    const value = e.target.value;
    if (isNaN(value)) return;

    const currentOtp = formData.otp || "";
    let otpArray = currentOtp.split("");
    while (otpArray.length < 6) {
      otpArray.push("");
    }

    otpArray[index] = value.slice(-1);
    const newOtpString = otpArray.join("").slice(0, 6);

    setFormData((prev) => ({
      ...prev,
      otp: newOtpString,
    }));

    if (errors.otp) {
      setErrors((prev) => ({ ...prev, otp: "" }));
    }

    if (value && index < 5) {
      otpRefs.current[index + 1].focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === "Backspace") {
      if (!formData.otp[index] && index > 0) {
        otpRefs.current[index - 1].focus();
      }
    }
  };

  const handleSendOTP = async () => {
    if (!formData.identifier) {
      setErrors((prev) => ({ ...prev, identifier: "Please enter email first" }));
      return;
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(formData.identifier)) {
      setErrors((prev) => ({ ...prev, identifier: "Please enter a valid email address" }));
      return;
    }

    setOtpLoading(true);
    try {
      const data = await authAPI.sendOTP(formData.identifier);

      if (data.success) {
        setOtpSent(true);
        setResendTimer(60); // Start the timer
        setMessage("OTP sent successfully! Please check your inbox.");
        setTimeout(() => setMessage(""), 6000);
      } else {
        setErrors({ identifier: data.message || "Failed to send OTP. Please try again." });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      if (error.response?.status === 429) {
        const waitSecs = error.response?.data?.waitSeconds || 60;
        setResendTimer(waitSecs);
        setOtpSent(true); // Treat as sent since we need to wait
        setErrors({});
      } else {
        const serverMessage = error.response?.data?.message;
        setErrors({ identifier: serverMessage || "Unable to send OTP. Please check your connection." });
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const validateEmail = (email, fieldName) => {
      if (!email.trim()) {
        return "Email is required";
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        if (!email.includes('@')) {
          return "Email must include @ symbol";
        } else if (!email.includes('.')) {
          return "Email must include a domain (e.g., .com, .org)";
        } else if (email.startsWith('@')) {
          return "Email cannot start with @ symbol";
        } else if (email.endsWith('@')) {
          return "Email domain is required after @";
        } else if (email.split('@')[1] && !email.split('@')[1].includes('.')) {
          return "Email domain must include a dot (e.g., gmail.com)";
        } else {
          return "Please enter a valid email address";
        }
      }

      const localPart = email.split('@')[0];
      const domainPart = email.split('@')[1];

      if (localPart.length === 0) {
        return "Email username is required before @";
      }
      if (domainPart.length === 0) {
        return "Email domain is required after @";
      }
      if (domainPart.startsWith('.') || domainPart.endsWith('.')) {
        return "Email domain cannot start or end with a dot";
      }

      return null;
    };

    if (formType === "login") {
      const emailError = validateEmail(formData.identifier, "identifier");
      if (emailError) {
        newErrors.identifier = emailError;
      }

      if (loginMode === "password") {
        if (!formData.password || formData.password.trim().length === 0) {
          newErrors.password = "Password is required";
        } else if (formData.password.length < 6) {
          newErrors.password = "Password must be at least 6 characters long";
        }
      } else {
        if (!formData.otp || formData.otp.trim().length === 0) {
          newErrors.otp = "OTP is required";
        } else if (!/^\d{6}$/.test(formData.otp)) {
          newErrors.otp = "OTP must be exactly 6 digits";
        }
      }
    } else if (formType === "signup") {
      if (!formData.firstName || !formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
      } else if (formData.firstName.trim().length < 2) {
        newErrors.firstName = "First name must be at least 2 characters long";
      } else if (!/^[a-zA-Z\s]+$/.test(formData.firstName.trim())) {
        newErrors.firstName = "First name can only contain letters and spaces";
      }

      if (!formData.lastName || !formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
      } else if (formData.lastName.trim().length < 1) {
        newErrors.lastName = "Last name cannot be empty";
      } else if (!/^[a-zA-Z\s]+$/.test(formData.lastName.trim())) {
        newErrors.lastName = "Last name can only contain letters and spaces";
      }

      const emailError = validateEmail(formData.email, "email");
      if (emailError) {
        newErrors.email = emailError;
      }

      if (!formData.phone || !formData.phone.trim()) {
        newErrors.phone = "Phone number is required";
      } else if (!/^\d+$/.test(formData.phone)) {
        newErrors.phone = "Phone number can only contain digits";
      } else if (formData.phone.length < 7 || formData.phone.length > 15) {
        newErrors.phone = "Invalid length (7-15 digits)";
      }

      if (!formData.password || formData.password.trim().length === 0) {
        newErrors.password = "Password is required";
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters long";
      } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one number";
      }
    } else if (formType === "forgot") {
      if (resetStep === "email") {
        const emailError = validateEmail(formData.resetEmail, "resetEmail");
        if (emailError) {
          newErrors.resetEmail = emailError;
        }
      } else {
        if (!formData.resetCode || formData.resetCode.trim().length === 0) {
          newErrors.resetCode = "OTP is required";
        } else if (!/^\d{6}$/.test(formData.resetCode)) {
          newErrors.resetCode = "OTP must be exactly 6 digits";
        }

        if (!formData.newPassword || formData.newPassword.trim().length === 0) {
          newErrors.newPassword = "New password is required";
        } else if (formData.newPassword.length < 8) {
          newErrors.newPassword = "Password must be at least 8 characters long";
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent any parent form submission

    setMessage("");
    // Don't clear errors here - let them persist until user fixes them
    // setErrors({});

    if (!validateForm()) return;

    setLoading(true);

    try {
      if (formType === "login") {
        // Try to login as main user first, then as sub user if main user fails
        try {
          let data;

          if (loginMode === "password") {
            // Try main user login first
            try {
              data = await authAPI.login(formData.identifier, formData.password);

              localStorage.setItem("token", data.data.token);
              localStorage.setItem("user", JSON.stringify(data.data.user));
              localStorage.setItem('userType', 'mainUser');

              onLoginSuccess?.(data.data.user);
              return;
            } catch (mainUserError) {
              // If main user login fails, try sub user login
              try {
                data = await subUserService.subUserLogin(formData.identifier, formData.password);

                // Store sub-user data and token
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('user', JSON.stringify({
                  ...data.data.subUser,
                  accessibleBusinesses: data.data.accessibleBusinesses
                }));
                localStorage.setItem('userType', 'subUser');

                onLoginSuccess?.(data.data.subUser);
                return;
              } catch (subUserError) {
                // If both fail, throw the main user error (more likely to be relevant)
                throw mainUserError;
              }
            }
          } else {
            // OTP login is only for main users
            data = await authAPI.verifyOTP(formData.identifier, formData.otp);

            localStorage.setItem("token", data.data.token);
            localStorage.setItem("user", JSON.stringify(data.data.user));
            localStorage.setItem('userType', 'mainUser');

            onLoginSuccess?.(data.data.user);
          }
        } catch (error) {
          throw error; // Re-throw to be handled by the outer catch block
        }
      } else if (formType === "signup") {
        // 🔥 NEW FLOW: Do NOT create account immediately.
        // Save details to sessionStorage and redirect to Checkout.
        sessionStorage.setItem('normalNewUser', JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          phoneCode: formData.phoneCode,
          password: formData.password
        }));

        const websiteUrl = import.meta.env.VITE_WEBSITE_URL || import.meta.env.VITE_WEBSITE_LOCAL;
        const checkoutUrl = `${websiteUrl}/#/checkout?firstName=${encodeURIComponent(formData.firstName)}&lastName=${encodeURIComponent(formData.lastName)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}&phoneCode=${encodeURIComponent(formData.phoneCode)}&password=${encodeURIComponent(formData.password)}&type=trial`;

        setLoading(false);
        window.location.href = checkoutUrl;
        return;
      } else if (formType === "forgot") {
        if (resetStep === "email") {
          const data = await authAPI.forgotPassword(formData.resetEmail);
          setMessage(data.message || "Password reset OTP sent successfully! Please check your email.");
          setFormData(prev => ({ ...prev, resetCode: "" })); // Explicitly clear
          setResetStep("otp");
          setResendTimer(60); // Start 60s timer
          setLoading(false);
        } else {
          const data = await authAPI.resetPassword(
            formData.resetEmail,
            formData.resetCode,
            formData.newPassword
          );
          setToastMessage(data.message || "Password reset successful. You can now login with your new password.");
          setShowToast(true);
          setTimeout(() => {
            setFormType("login");
            resetForm();
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Login error:', error);

      // 🔥 MAIN FIX: Proper field-specific error handling WITHOUT page refresh
      if (formType === "signup" && error.response?.status === 400) {
        // Signup validation errors - check for existing email/phone
        const errorMessage = error.response?.data?.message?.toLowerCase() || '';


        if (errorMessage.includes('email already registered')) {
          setErrors({
            email: "This email address is already registered. Please use a different email or sign in instead.",
          });
        } else if (errorMessage.includes('phone number already registered') ||
          errorMessage.includes('phone already registered')) {
          setErrors({
            phone: "This phone number is already registered. Please use a different phone number.",
          });
        } else {
          setErrors({
            general: error.response?.data?.message || "Registration failed. Please try again."
          });
        }
      } else if (error.response?.status === 404) {
        // User not found
        if (formType === "forgot") {
          setErrors({ resetEmail: "No account found with this email address." });
        } else {
          setErrors({ identifier: "No account found with this email address." });
        }
      } else if (error.response?.status === 401) {
        // Handle account deactivation
        const errorMessage = error.response?.data?.message || "";
        if (errorMessage.toLowerCase().includes("account is deactivated")) {
          setErrors({
            identifier: "Your account is deactivated. Please contact your admin.",
          });
          return;
        }

        // Wrong credentials - field specific errors
        if (formType === "forgot") {
          setErrors({ resetCode: "Invalid or expired OTP. Please try again." });
        } else if (loginMode === "password") {
          setErrors({
            password: "Incorrect password. Please check and try again.",
          });
        } else {
          setErrors({
            otp: "Invalid OTP. Please check the code and try again.",
          });
        }
      } else if (error.response?.status === 403) {
        const errorMessage = error.response?.data?.message || "";
        if (errorMessage.toLowerCase().includes("account is deactivated")) {
          setErrors({
            identifier: "Your account is deactivated. Please contact your admin.",
          });
        } else {
          setErrors({
            general: errorMessage || "Account access denied."
          });
        }

      } else if (error.response?.data?.message) {
        // Server returned specific error message
        const errorMessage = error.response.data.message;

        // Check which field the error is related to
        if (errorMessage.toLowerCase().includes('email') ||
          errorMessage.toLowerCase().includes('user not found')) {
          if (formType === "forgot") {
            setErrors({ resetEmail: errorMessage });
          } else {
            setErrors({ identifier: errorMessage });
          }
        } else if (errorMessage.toLowerCase().includes('password')) {
          if (formType === "forgot") {
            setErrors({ newPassword: errorMessage });
          } else {
            setErrors({ password: errorMessage });
          }
        } else if (errorMessage.toLowerCase().includes('otp') || errorMessage.toLowerCase().includes('reset code')) {
          if (formType === "forgot") {
            if (resetStep === "email") {
              setErrors({ resetEmail: errorMessage });
            } else {
              setErrors({ resetCode: errorMessage });
            }
          } else {
            setErrors({ otp: errorMessage });
          }
        } else {
          if (formType === "forgot" && resetStep === "email") {
            setErrors({ resetEmail: errorMessage });
          } else {
            setErrors({ general: errorMessage });
          }
        }
      } else if (error.response?.status === 429) {
        // 🔥 Rate Limit Hit: Start timer instead of showing error message
        const waitSecs = error.response?.data?.waitSeconds || 60;
        setResendTimer(waitSecs);
        // Clear general error if it was just about waiting
        setErrors({});
      } else {
        setErrors({
          general: "Request failed. Please check your connection and try again."
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      identifier: "",
      password: "",
      otp: "",
      resetEmail: "",
      resetCode: "",
      newPassword: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      phoneCode: "+91",
    });
    setErrors({});
    setMessage("");
    setOtpSent(false);
    setShowPassword(false);
    setResetStep("email");
  };

  // Add handleResendOTP function
  const handleResendOTP = async () => {
    if (resendTimer > 0) return;

    setLoading(true);
    setErrors({});
    try {
      if (formType === "forgot") {
        await authAPI.forgotPassword(formData.resetEmail);
        setToastMessage("OTP resent successfully!");
      } else if (loginMode === "otp") {
        await authAPI.sendOTP(formData.identifier);
        setToastMessage("OTP resent successfully!");
      }
      setShowToast(true);
      setResendTimer(60);
    } catch (error) {
      if (error.response?.status === 429) {
        const waitSecs = error.response?.data?.waitSeconds || 60;
        setResendTimer(waitSecs);
        setErrors({});
      } else {
        const msg = error.response?.data?.message || "Failed to resend OTP.";
        setErrors({ general: msg });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (tokenResponse) => {
    setLoading(true);
    setErrors({});
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_BACKEND_URL_DEV;
      const res = await fetch(`${backendUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ access_token: tokenResponse.access_token }),
      });
      const data = await res.json();
      if (data.success) {
        if (data.isNewUser) {
          // New user → save Google profile to sessionStorage, redirect to Checkout
          // User will complete signup with mobile number and password on checkout page
          sessionStorage.setItem('googleNewUser', JSON.stringify({
            firstName: data.data.user.firstName,
            lastName: data.data.user.lastName,
            email: data.data.user.email,
            picture: data.data.user.picture,
            provider: 'google'
          }));
          const websiteUrl = import.meta.env.VITE_WEBSITE_URL || import.meta.env.VITE_WEBSITE_LOCAL;
          const checkoutUrl = `${websiteUrl}/#/checkout?firstName=${encodeURIComponent(data.data.user.firstName)}&lastName=${encodeURIComponent(data.data.user.lastName)}&email=${encodeURIComponent(data.data.user.email)}&type=google`;

          setLoading(false);
          window.location.href = checkoutUrl;
        } else {
          // Existing user → normal login
          localStorage.setItem('token', data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          localStorage.setItem('userType', 'mainUser');
          onLoginSuccess?.(data.data.user);
        }
      } else {
        setErrors({ general: data.message || 'Google login failed. Please try again.' });
      }
    } catch (err) {
      console.error('Google auth error:', err);
      setErrors({ general: 'Google login failed. Please check your connection.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = () => {
    setErrors({ general: 'Google Sign-In was cancelled or failed. Please try again.' });
  };

  // Custom Google login hook for full-width button
  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: handleGoogleError,
  });

  // Filtered country codes based on search term
  const filteredCountryCodes = countryCodes.filter((c) =>
    c.name.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.code.toLowerCase().includes(phoneCodeSearchTerm.toLowerCase()) ||
    c.dial_code.includes(phoneCodeSearchTerm)
  );

  return (
    <div className="min-h-screen flex">
      {/* Custom CSS for animations */}
      <style jsx="true">{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .animate-slide-in-right {
          animation: slide-in-right 0.5s ease-out;
        }
      `}</style>
      {/* Loading Spinner Overlay */}
      {(otpLoading || loading) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-gray-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#129046] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-800">
                {otpLoading ? "Sending OTP" : formType === "signup" ? "Creating Your Account" : formType === "forgot" ? "Sending OTP" : "Signing In"}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {formType === "signup" ? "Setting up your account..." : "Please wait..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Construction Building Background Image */}
      <div className="fixed inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat filter blur-sm"
          style={{
            backgroundImage: `url("${import.meta.env.BASE_URL}login_bg.png")`,
          }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-50/80 via-orange-50/70 to-yellow-50/80"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/20 via-orange-100/15 to-yellow-200/20"></div>
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%),
              linear-gradient(-45deg, rgba(255, 255, 255, 0.1) 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, rgba(255, 255, 255, 0.1) 75%),
              linear-gradient(-45deg, transparent 75%, rgba(255, 255, 255, 0.1) 75%)
            `,
            backgroundSize: "20px 20px",
          }}
        ></div>
      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
          <div className="bg-white border-2 border-[#129046] text-[#129046] pl-2 pr-1 pt-1.5 pb-0 rounded-xl shadow-[0_10px_30px_rgba(18,144,70,0.15)] max-w-[260px]">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 bg-[#129046]/10 p-1 rounded-full">
                <svg className="w-5 h-5 text-[#129046]" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-sm leading-tight">{toastMessage}</p>
              </div>
              <button
                onClick={() => setShowToast(false)}
                className="flex-shrink-0 text-gray-400 hover:text-[#129046] transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            {/* Progress Bar */}
            <div className="mt-2 bg-gray-50 rounded-full h-0.5 overflow-hidden">
              <div
                className="bg-[#129046] h-full rounded-full transition-all duration-[3000ms] ease-linear"
                style={{
                  width: "100%",
                  animation: "progress 3s linear forwards"
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 flex w-full h-screen">
        {/* Left Section - Modern Branding */}
        <div className="hidden lg:flex lg:w-1/2 h-full flex-col justify-center items-center p-8 text-center">
          <div className="mb-4">
            <div className="w-full max-w-sm mx-auto rounded-2xl overflow-hidden shadow-2xl transform hover:scale-105 transition-transform duration-300">
              <img
                src={`${import.meta.env.BASE_URL}logo-png.png`}
                alt="InvoiceBillBook Logo"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Construction Feature Cards */}
          <div className="grid grid-cols-3 gap-1 w-full max-w-sm mx-auto">
            <div className="bg-amber-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-amber-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiBarChart2 className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Reports</p>
            </div>
            <div className="bg-orange-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-orange-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiUsers className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Parties</p>
            </div>
            <div className="bg-amber-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-amber-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiShield className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Secure</p>
            </div>
            <div className="bg-orange-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-orange-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiClock className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Fast</p>
            </div>
            <div className="bg-amber-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-amber-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiSettings className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Easy</p>
            </div>
            <div className="bg-orange-100/60 backdrop-blur-sm rounded-xl p-4 text-center hover:shadow-2xl hover:bg-orange-200/70 transition-all duration-300 transform hover:-translate-y-1 cursor-pointer group border border-[#129046]/50">
              <FiTool className="mx-auto mb-1 text-[#129046] group-hover:text-[#129046] transition-colors" size={24} />
              <p className="text-xs font-medium text-gray-700">Invoice</p>
            </div>
          </div>
        </div>

        {/* Right Section - Modern Scrollable Form */}
        <div className="w-full lg:w-1/2 h-full flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl border-1 border-[#129046] overflow-hidden">
            <div className={`p-4 ${formType === "signup" ? "max-h-[30rem] overflow-y-auto" : ""}`}>
              <div className="text-center mb-3">
                {formType === "forgot" && (
                  <button
                    onClick={() => {
                      setFormType("login");
                      resetForm();
                    }}
                    className="flex items-center gap-2 text-gray-600 hover:text-black mb-4 transition-colors group"
                  >
                    <FiArrowLeft
                      size={16}
                      className="group-hover:-translate-x-1 transition-transform"
                    />
                    Back to Login
                  </button>
                )}

                {/* Mobile Logo */}
                <div className="lg:hidden mb-4">
                  <div className="w-full max-w-[200px] mx-auto rounded-2xl overflow-hidden shadow-xl transform hover:scale-105 transition-transform">
                    <img
                      src={`${import.meta.env.BASE_URL}logo-png.png`}
                      alt="InvoiceBillBook Logo"
                      className="w-full h-auto object-contain"
                    />
                  </div>
                </div>

                <div className="mb-2">
                  <h2 className="text-2xl lg:text-4xl font-bold bg-gradient-to-r from-[#129046] to-[#9ccc53] bg-clip-text text-transparent mb-2">
                    {formType === "login" && "Welcome"}
                    {formType === "signup" && "Create Account"}
                    {formType === "forgot" && "Reset Password"}
                  </h2>
                  <div className="w-24 h-1 bg-[#129046] rounded-full mx-auto"></div>
                </div>
                <p className="text-gray-700 font-medium">
                  {formType === "login" && "Sign in to your account"}
                  {formType === "signup" && "Join InvoiceBillBook today"}
                  {formType === "forgot" && "Enter your email to reset password"}
                </p>
              </div>

              {/* Success/Error Messages */}
              {message && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm">{message}</p>
                </div>
              )}

              {errors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 text-sm">{errors.general}</p>
                </div>
              )}

              {/* Forms */}
              <form onSubmit={handleSubmit} noValidate className="space-y-3" autoComplete="off">
                {formType === "login" && (
                  <>
                    {/* Email Field */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <FiMail
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#006400]"
                          size={20}
                        />
                        <input
                          type="email"
                          name="identifier"
                          value={formData.identifier}
                          onChange={handleInputChange}
                          onBlur={handleEmailBlur}
                          autoComplete="off"
                          className={`w-full pl-12 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.identifier
                            ? "border-red-300 bg-red-50"
                            : "border-[#006400]"
                            }`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.identifier && (
                        <p className="mt-2 text-sm text-red-600 font-medium">
                          {errors.identifier}
                        </p>
                      )}
                    </div>

                    {/* Password or OTP Field */}
                    {loginMode === "password" ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <FiLock
                            className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#006400]"
                            size={20}
                          />
                          <input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={`w-full pl-12 pr-12 py-2.5 rounded-xl transition-colors duration-200 border focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.password
                              ? "border-red-300 bg-red-50"
                              : "border-[#006400]"
                              }`}
                            placeholder="Enter your password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#006400] hover:text-black transition-colors"
                          >
                            {showPassword ? (
                              <FiEyeOff size={20} />
                            ) : (
                              <FiEye size={20} />
                            )}
                          </button>
                        </div>
                        {errors.password && (
                          <p className="mt-2 text-sm text-red-600 font-medium">
                            {errors.password}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          OTP
                        </label>
                        <div className="relative">
                          <FiKey
                            className="absolute md:left-4 left-3 top-1/2 transform -translate-y-1/2 text-[#006400] z-10"
                            size={18}
                          />
                          <div className={`relative w-full rounded-xl border transition-colors duration-200 focus-within:outline-none focus-within:ring-1 focus-within:ring-[#006400] focus-within:bg-[#006400]/10 ${errors.otp ? "border-red-300 bg-red-50" : "border-[#006400]"
                            } bg-white h-[50px] overflow-hidden`}>
                            <div className="w-full h-full flex items-center md:pl-12 md:pr-[140px] pl-10 pr-16 relative">
                              <div className="flex md:gap-2 gap-0.5 items-start pointer-events-none z-0 h-full">
                                {[0, 1, 2, 3, 4, 5].map((i) => (
                                  <div key={i} className="relative md:w-6 w-4 h-full">
                                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 md:text-xl text-base font-bold text-black leading-none" style={{ lineHeight: '1' }}>{formData.otp[i] || ""}</span>
                                    <div className="absolute bottom-2 w-full md:h-1 h-0.5 bg-gray-300 shadow-sm rounded"></div>
                                  </div>
                                ))}
                              </div>
                              <input
                                type="text"
                                name="otp"
                                maxLength="6"
                                value={formData.otp}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (/^\d*$/.test(val)) {
                                    handleInputChange(e);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                  }
                                }}
                                autoComplete="off"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                              />

                              {/* Integrated Timer & Resend Button */}
                              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-30">
                                {resendTimer > 0 && (
                                  <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#129046]/10 text-[#129046] rounded-lg text-[13px] font-black border border-[#129046]/20 shadow-sm animate-pulse">
                                    0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={handleSendOTP}
                                  disabled={resendTimer > 0 || otpLoading}
                                  className={`md:text-xs text-[10px] md:px-3 px-2 py-2 rounded-lg font-bold transition-all shadow-sm ${resendTimer > 0
                                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                      : "bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:shadow-md active:scale-95"
                                    }`}
                                >
                                  {otpSent ? "Resend" : "Get"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                        {errors.otp && (
                          <p className="mt-2 text-sm text-red-600 font-medium">
                            {errors.otp}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Toggle Login Mode */}
                    <div className={`flex items-center ${loginMode === 'password' ? 'justify-between' : 'justify-end'} !mt-2`}>
                      {loginMode === "otp" ? (
                        <button
                          type="button"
                          onClick={() => {
                            setLoginMode("password");
                            setErrors({});
                          }}
                          className="text-sm text-[#129046] hover:text-black transition-colors"
                        >
                          Login with Password
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setLoginMode("otp");
                              setErrors({});
                            }}
                            className="flex items-center gap-1 text-sm text-[#129046] hover:text-black transition-colors"
                          >
                            <FiArrowLeft size={16} />
                            Login with OTP
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setFormType("forgot");
                              resetForm();
                            }}
                            className="text-sm text-[#129046] hover:text-black transition-colors"
                          >
                            Forgot Password?
                          </button>
                        </>
                      )}
                    </div>

                    {/* Info note for OTP */}


                  </>
                )}

                {formType === "signup" && (
                  <>
                    {/* Sign Up Form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          First Name
                        </label>
                        <div className="relative">
                          <FiUser
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                            size={18}
                          />
                          <input
                            type="text"
                            name="firstName"
                            value={formData.firstName}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.firstName
                              ? "border-red-300 bg-red-50"
                              : "border-[#006400]"
                              }`}
                            placeholder="Enter first name"
                          />
                        </div>
                        {errors.firstName && (
                          <p className="mt-1 text-sm text-red-600 font-medium">
                            {errors.firstName}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Last Name
                        </label>
                        <div className="relative">
                          <FiUser
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                            size={18}
                          />
                          <input
                            type="text"
                            name="lastName"
                            value={formData.lastName}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.lastName
                              ? "border-red-300 bg-red-50"
                              : "border-[#006400]"
                              }`}
                            placeholder="Enter last name"
                          />
                        </div>
                        {errors.lastName && (
                          <p className="mt-1 text-sm text-red-600 font-medium">
                            {errors.lastName}
                          </p>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <div className="relative">
                        <FiMail
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                          size={18}
                        />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          onBlur={handleEmailBlur}
                          autoComplete="off"
                          className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.email
                            ? "border-red-300 bg-red-50"
                            : "border-[#006400]"
                            }`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600 font-medium">
                          {errors.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone
                      </label>
                      <div className="flex gap-2">
                        {/* Searchable Country Code Dropdown */}
                        <div className="w-[100px] relative" ref={phoneCodeDropdownRef}>
                          <div className="relative">
                            <input
                              type="text"
                              value={showPhoneCodeDropdown ? phoneCodeSearchTerm : formData.phoneCode}
                              onChange={(e) => {
                                setPhoneCodeSearchTerm(e.target.value);
                                if (!showPhoneCodeDropdown) setShowPhoneCodeDropdown(true);
                              }}
                              onFocus={() => setShowPhoneCodeDropdown(true)}
                              placeholder="+91"
                              className="w-full px-3 py-2.5 rounded-xl border border-[#006400] transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 bg-white text-sm"
                            />
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showPhoneCodeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>

                          {showPhoneCodeDropdown && (
                            <div className="absolute z-[100] w-64 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto left-0 animate-in fade-in slide-in-from-top-2 duration-200">
                              {filteredCountryCodes.length > 0 ? (
                                filteredCountryCodes.map((item) => (
                                  <button
                                    key={`${item.code}-${item.dial_code}`}
                                    type="button"
                                    onClick={() => {
                                      setFormData(prev => ({ ...prev, phoneCode: item.dial_code }));
                                      setShowPhoneCodeDropdown(false);
                                      setPhoneCodeSearchTerm("");
                                    }}
                                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-[#129046]/10 transition-colors flex items-center justify-between group ${formData.phoneCode === item.dial_code ? 'bg-[#129046]/5 text-[#129046] font-semibold' : 'text-gray-700'
                                      }`}
                                  >
                                    <span>{item.name}</span>
                                    <span className="text-gray-400 group-hover:text-[#129046]">{item.dial_code}</span>
                                  </button>
                                ))
                              ) : (
                                <div className="px-4 py-3 text-sm text-gray-500 text-center italic">No results found</div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Phone Number Input */}
                        <div className="flex-1 relative">
                          <FiUser
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                            size={18}
                          />
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleInputChange}
                            autoComplete="off"
                            className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.phone
                              ? "border-red-300 bg-red-50"
                              : "border-[#006400]"
                              }`}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600 font-medium">
                          {errors.phone}
                        </p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <FiLock
                          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                          size={18}
                        />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          autoComplete="off"
                          className={`w-full pl-10 pr-12 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.password
                            ? "border-red-300 bg-red-50"
                            : "border-[#006400]"
                            }`}
                          placeholder="Enter your password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#006400] hover:text-black transition-colors"
                        >
                          {showPassword ? (
                            <FiEyeOff size={20} />
                          ) : (
                            <FiEye size={20} />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="mt-1 text-sm text-red-600 font-medium">
                          {errors.password}
                        </p>
                      )}
                    </div>
                  </>
                )}

                {formType === "forgot" && (
                  <>
                    {/* Forgot Password Flow */}
                    {resetStep === "email" ? (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                          </label>
                          <div className="relative">
                            <FiMail
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                              size={18}
                            />
                            <input
                              type="email"
                              name="resetEmail"
                              value={formData.resetEmail}
                              onChange={handleInputChange}
                              onBlur={handleEmailBlur}
                              autoComplete="off"
                              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.resetEmail
                                ? "border-red-300 bg-red-50"
                                : "border-[#006400]"
                                }`}
                              placeholder="Enter your email address"
                            />
                          </div>
                          {errors.resetEmail && (
                            <p className="mt-1 text-sm text-red-600 font-medium">
                              {errors.resetEmail}
                            </p>
                          )}
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <FiKey
                              className="text-yellow-600 mt-0.5 flex-shrink-0"
                              size={16}
                            />
                            <div className="text-sm text-yellow-800">
                              <p className="font-medium mb-1">Password Reset</p>
                              <p>
                                Enter your email address and we'll send you an OTP
                                to reset your password.
                              </p>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            6-Digit OTP
                          </label>
                          <div className="relative">
                            <FiKey
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400] z-10"
                              size={18}
                            />
                            <input
                              type="text"
                              name="resetCode"
                              id="resetCode"
                              maxLength="6"
                              value={formData.resetCode}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (/^\d*$/.test(val)) {
                                  handleInputChange(e);
                                }
                              }}
                              autoComplete="one-time-code"
                              className={`w-full pl-10 pr-[140px] py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.resetCode
                                ? "border-red-300 bg-red-50"
                                : "border-[#006400]"
                                }`}
                              placeholder="Enter 6-digit OTP"
                            />

                            {/* Integrated Timer & Resend Button */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 z-30">
                              {resendTimer > 0 && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#129046]/10 text-[#129046] rounded-lg text-[13px] font-black border border-[#129046]/20 shadow-sm animate-pulse">
                                  0:{resendTimer < 10 ? `0${resendTimer}` : resendTimer}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={handleResendOTP}
                                disabled={resendTimer > 0 || loading}
                                className={`md:text-xs text-[10px] md:px-3 px-2 py-2 rounded-lg font-bold transition-all shadow-sm ${resendTimer > 0
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white hover:shadow-md active:scale-95"
                                  }`}
                              >
                                Resend
                              </button>
                            </div>
                          </div>
                          {errors.resetCode && (
                            <p className="mt-1 text-sm text-red-600 font-medium">
                              {errors.resetCode}
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            New Password
                          </label>
                          <div className="relative">
                            <FiLock
                              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#006400]"
                              size={18}
                            />
                            <input
                              type={showPassword ? "text" : "password"}
                              name="newPassword"
                              value={formData.newPassword}
                              onChange={handleInputChange}
                              autoComplete="off"
                              className={`w-full pl-10 pr-12 py-2.5 rounded-xl border transition-colors duration-200 focus:outline-none focus:ring-1 focus:ring-[#006400] focus:bg-[#006400]/10 !important placeholder:text-black ${errors.newPassword
                                ? "border-red-300 bg-red-50"
                                : "border-[#006400]"
                                }`}
                              placeholder="Enter new password (min 8 chars)"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[#006400] hover:text-black transition-colors"
                            >
                              {showPassword ? (
                                <FiEyeOff size={20} />
                              ) : (
                                <FiEye size={20} />
                              )}
                            </button>
                          </div>
                          {errors.newPassword && (
                            <p className="mt-1 text-sm text-red-600 font-medium">
                              {errors.newPassword}
                            </p>
                          )}
                        </div>

                      </>
                    )}
                  </>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || (formType === "forgot" && resetStep === "email" && resendTimer > 0)}
                  className="w-full bg-gradient-to-r from-[#129046] to-[#9ccc53] text-white py-2.5 px-6 rounded-xl hover:from-[#129046]/90 hover:to-[#9ccc53]/90 focus:ring-4 focus:ring-[#9ccc53]/50 focus:ring-offset-2 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {formType === "login" && (
                        <>
                          <FiLogIn size={20} /> <span>Sign in</span>
                        </>
                      )}
                      {formType === "signup" && (
                        <>
                          <FiUser size={20} /> <span>Sign up</span>
                        </>
                      )}
                      {formType === "forgot" && (
                        <>
                          <FiKey size={20} /> 
                          <span>
                            {resetStep === 'email' 
                              ? (resendTimer > 0 ? `Wait ${resendTimer}s` : 'Send OTP') 
                              : 'Reset Password'}
                          </span>
                        </>
                      )}
                    </>
                  )}
                </button>

                {/* Old Resend div removed as it is now integrated into the field */}

                {/* Google SSO - shown on login and signup only */}
                {(formType === "login" || formType === "signup") && (
                  <div className="mt-3">
                    {/* Divider */}
                    <div className="flex items-center gap-3 my-2">
                      <div className="flex-1 h-px bg-gray-200" />
                      <span className="text-xs text-gray-400 font-medium select-none">OR CONTINUE WITH</span>
                      <div className="flex-1 h-px bg-gray-200" />
                    </div>

                    {/* Custom Full-Width Google Button - same size as Sign in */}
                    <button
                      type="button"
                      onClick={() => googleLogin()}
                      disabled={loading}
                      className="w-full bg-white border-2 border-gray-300 text-gray-700 py-2.5 px-6 rounded-xl hover:bg-gray-50 hover:border-[#129046] focus:ring-4 focus:ring-[#129046]/20 focus:ring-offset-2 transition-all duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105"
                    >
                      {/* Google Icon */}
                      <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>{formType === "signup" ? "Sign up with Google" : "Sign in with Google"}</span>
                    </button>
                  </div>
                )}

                {/* Form Toggle Links */}
                <div className="text-center mt-2 mb-1">
                  {formType === "login" && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormType("signup");
                        resetForm();
                      }}
                      className="text-sm text-[#129046] hover:text-black transition-colors"
                    >
                      Don't have an account? Sign Up
                    </button>
                  )}
                  {formType === "signup" && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormType("login");
                        resetForm();
                      }}
                      className="text-sm text-[#129046] hover:text-black transition-colors"
                    >
                      Already have an account? Sign In
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
