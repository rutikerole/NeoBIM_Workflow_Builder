"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Chrome, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { validateEmail } from "@/lib/form-validation";
import { cn } from "@/lib/utils";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  function handleEmailChange(value: string) {
    setEmail(value);
    setError("");

    if (touched.email) {
      const validation = validateEmail(value);
      setEmailError(validation.isValid ? "" : validation.error || "");
    }
  }

  function handleEmailBlur() {
    setTouched(prev => ({ ...prev, email: true }));
    const validation = validateEmail(email);
    setEmailError(validation.isValid ? "" : validation.error || "");
  }

  function handlePasswordBlur() {
    setTouched(prev => ({ ...prev, password: true }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || "Invalid email");
      return;
    }

    if (!password || password.length === 0) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Invalid email or password. Please try again.");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      await signIn("google", { callbackUrl });
    } catch {
      setError("Google sign-in failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="w-full max-w-[420px] bg-[#0f1019] border border-white/[0.08] rounded-2xl p-10 shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
    >
      {/* Header */}
      <div className="mb-[30px]">
        <h2 className="text-[22px] font-bold text-[#F0F0F5] mb-1.5 tracking-[-0.02em]">
          Welcome back
        </h2>
        <p className="text-[13.5px] text-[#6C6C8A]">
          Sign in to continue to BuildFlow
        </p>
      </div>

      {/* Google OAuth */}
      <motion.button
        whileHover={{ scale: 1.008 }}
        whileTap={{ scale: 0.995 }}
        onClick={handleGoogle}
        disabled={loading}
        className={cn(
          "w-full h-[42px] px-4 rounded-xl border border-white/[0.08] bg-[rgba(26,26,42,0.8)] text-[#E0E0EE] text-[13px] font-medium cursor-pointer",
          "flex items-center justify-center gap-2 mb-[22px] transition-all duration-200",
          "shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.02)]",
          loading && "opacity-50",
        )}
      >
        <Chrome size={14} />
        Continue with Google
      </motion.button>

      <div className="flex items-center gap-3 mb-[22px]">
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[10.5px] text-[#3A3A50] tracking-[0.04em] uppercase font-medium">or email</span>
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>

      <form onSubmit={handleSubmit}>
        {/* Email field */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mb-3.5"
        >
          <label className="block text-[12.5px] font-medium text-[#7C7C96] mb-1.5 tracking-[-0.005em]">
            Email
          </label>
          <div className="relative">
            <Mail size={13} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#3A3A50]" />
            <input
              type="email"
              value={email}
              onChange={e => handleEmailChange(e.target.value)}
              onBlur={handleEmailBlur}
              required
              placeholder="you@example.com"
              aria-invalid={!!emailError}
              aria-describedby={emailError ? "email-error" : undefined}
              className={cn(
                "w-full h-11 bg-[#08080f] border rounded-xl pl-9 pr-3.5 text-[14px] text-[#F0F0F5] placeholder-[#3a3a50] focus:border-[#4F8AFF]/40 focus:outline-none transition-all",
                emailError ? "border-red-500/50" : "border-white/[0.08]",
              )}
            />
          </div>
          {emailError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              id="email-error"
              className="mt-1.5 text-[11.5px] text-[#EF4444] flex items-center gap-1"
            >
              <AlertCircle size={11} />
              {emailError}
            </motion.div>
          )}
        </motion.div>

        {/* Password field */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="mb-[22px]"
        >
          <label className="block text-[12.5px] font-medium text-[#7C7C96] mb-1.5 tracking-[-0.005em]">
            Password
          </label>
          <div className="relative">
            <Lock size={13} className="absolute left-[13px] top-1/2 -translate-y-1/2 text-[#3A3A50]" />
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(""); }}
              onBlur={handlePasswordBlur}
              required
              placeholder="••••••••"
              className="w-full h-11 bg-[#08080f] border border-white/[0.08] rounded-xl pl-9 pr-3.5 text-[14px] text-[#F0F0F5] placeholder-[#3a3a50] focus:border-[#4F8AFF]/40 focus:outline-none transition-all"
            />
          </div>
        </motion.div>

        {/* Form-level error */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="px-3.5 py-2.5 rounded-xl bg-red-500/[0.08] border border-red-500/[0.15] text-[12.5px] text-[#F87171] mb-4 flex items-center gap-2"
          >
            <AlertCircle size={13} />
            {error}
          </motion.div>
        )}

        <motion.button
          whileHover={{ scale: 1.008 }}
          whileTap={{ scale: 0.995 }}
          type="submit"
          disabled={loading || !!emailError}
          className={cn(
            "w-full h-11 rounded-xl border-none text-white text-[13.5px] font-semibold tracking-[-0.01em]",
            "flex items-center justify-center gap-2 transition-all duration-200",
            (loading || emailError)
              ? "bg-[rgba(79,138,255,0.3)] cursor-not-allowed opacity-50"
              : "bg-gradient-to-r from-[#4F8AFF] to-[#6366F1] cursor-pointer shadow-[0_1px_3px_rgba(79,138,255,0.3),0_4px_12px_rgba(79,138,255,0.15),inset_0_1px_0_rgba(255,255,255,0.1)]",
          )}
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Signing in...
            </>
          ) : (
            "Sign in"
          )}
        </motion.button>
      </form>

      <p className="text-center text-[12.5px] text-[#5C5C78] mt-6">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#4F8AFF] no-underline font-semibold hover:brightness-110 transition-all duration-150">
          Create account
        </Link>
      </p>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="bg-[rgba(18,18,30,0.95)] border border-white/[0.05] rounded-2xl p-7 text-center text-[13px] text-[#5C5C78]">
        Loading...
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
