"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resendVerificationAction,
  resetPasswordWithCodeAction,
  sendResetPasswordAction,
  signInAction,
  signUpAction,
  verifyEmailAction,
} from "@/lib/auth/actions";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNeedsVerification(false);
    setSubmitting(true);

    try {
      const result = await signInAction({ email, password });
      if (!result.ok) {
        setError(result.error ?? "Sign in failed.");
        setNeedsVerification(Boolean(result.emailNotVerified));
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive space-y-1"
        >
          <p>{error}</p>
          {needsVerification ? (
            <Link
              href={`/verify-email?email=${encodeURIComponent(email)}`}
              className="inline-block text-xs font-medium underline"
            >
              Verify your email now →
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign in"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-primary font-medium hover:underline"
        >
          Create one free
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ defaultPlan }: { defaultPlan?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"register" | "verify">("register");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await signUpAction({ fullName, email, password });
      if (!result.ok) {
        setError(result.error ?? "Unable to create account.");
        return;
      }

      if (result.requiresVerification) {
        setInfoMessage(
          result.message ?? "Enter the 6-digit verification code sent to your email."
        );
        setStep("verify");
        return;
      }

      router.push("/dashboard/onboarding");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await verifyEmailAction({ email, otp });
      if (!result.ok) {
        setError(result.error ?? "Verification failed.");
        return;
      }

      router.push("/dashboard/onboarding");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfoMessage(null);
    const result = await resendVerificationAction({ email });
    if (!result.ok) {
      setError(result.error ?? "Could not resend code.");
      return;
    }
    setInfoMessage(result.message ?? "Verification code resent.");
  }

  if (step === "verify") {
    return (
      <form onSubmit={handleVerify} className="space-y-4" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        {infoMessage ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {infoMessage}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="verify-otp">6-digit verification code</Label>
          <Input
            id="verify-otp"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="123456"
            required
          />
          <p className="text-xs text-muted-foreground">
            Sent to <span className="font-medium text-foreground">{email}</span>
          </p>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleResend}
        >
          Resend verification code
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4" noValidate>
      {defaultPlan ? (
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Selected plan:{" "}
          <span className="font-semibold capitalize text-foreground">
            {defaultPlan}
          </span>
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="register-name">Full name</Label>
        <Input
          id="register-name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jordan Taylor"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-email">Work email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="register-confirm">Confirm password</Label>
        <Input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Repeat password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account...
          </>
        ) : (
          "Create Account"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await sendResetPasswordAction({ email });
      if (!result.ok) {
        setError(result.error ?? "Unable to send reset code.");
        return;
      }
      setMessage(result.message ?? "Reset code sent.");
      setStep("confirm");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await resetPasswordWithCodeAction({
        email,
        code,
        newPassword,
      });
      if (!result.ok) {
        setError(result.error ?? "Unable to reset password.");
        return;
      }
      setMessage(result.message ?? "Password updated.");
      setStep("done");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1.5">
          <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            <span>Password updated</span>
          </div>
          <p className="text-muted-foreground">{message}</p>
        </div>
        <Link href="/login" className="block">
          <Button className="w-full">Continue to Sign in</Button>
        </Link>
      </div>
    );
  }

  if (step === "confirm") {
    return (
      <form onSubmit={handleConfirm} className="space-y-4" noValidate>
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
            {message}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label htmlFor="reset-code">6-digit reset code</Label>
          <Input
            id="reset-code"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reset-new-password">New password</Label>
          <Input
            id="reset-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            "Reset Password"
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleRequest} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="forgot-email">Account email</Label>
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Sending code...
          </>
        ) : (
          "Send Reset Code"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered your password?{" "}
        <Link
          href="/login"
          className="text-primary font-medium hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}

export function VerifyEmailForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setSubmitting(true);

    try {
      const result = await verifyEmailAction({ email, otp: code });
      if (!result.ok) {
        setError(result.error ?? "Invalid or expired code.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setError(null);
    setInfoMessage(null);
    const result = await resendVerificationAction({ email });
    if (!result.ok) {
      setError(result.error ?? "Unable to resend code.");
      return;
    }
    setInfoMessage(result.message ?? "Verification code resent.");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}
      {infoMessage ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-400">
          {infoMessage}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="verify-email">Email address</Label>
        <Input
          id="verify-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="verify-code">Verification code</Label>
        <Input
          id="verify-code"
          inputMode="numeric"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          "Verify Email"
        )}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="w-full"
        onClick={handleResend}
      >
        Resend code
      </Button>
    </form>
  );
}
