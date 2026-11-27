"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getPublicEnv } from "@/config/env";
import { createSupabaseServerClient } from "@/lib/database/server";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
});

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

const verifyEmailSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  otp: z.string().trim().min(6, "Enter the 6-digit verification code."),
});

const resetRequestSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const resetConfirmSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  code: z.string().trim().min(6, "Enter the 6-digit reset code."),
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
});

export interface AuthActionResult {
  ok: boolean;
  error?: string;
  requiresVerification?: boolean;
  emailNotVerified?: boolean;
  message?: string;
}

export async function signInAction(input: {
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid login details.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data?.user) {
    const msg = error?.message ?? "";
    const emailNotVerified =
      msg.toLowerCase().includes("email not confirmed") ||
      error?.status === 403;
    return {
      ok: false,
      emailNotVerified,
      error:
        error?.message ??
        (emailNotVerified
          ? "Please verify your email address before signing in."
          : "Invalid email or password."),
    };
  }

  return { ok: true };
}

export async function signUpAction(input: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid registration details.",
    };
  }

  const env = getPublicEnv();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.fullName,
        name: parsed.data.fullName,
      },
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard/onboarding`,
    },
  });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Unable to create account.",
    };
  }

  if (data?.user && !data?.session) {
    return {
      ok: true,
      requiresVerification: true,
      message:
        "Check your email to confirm your account (enter the 6-digit code or click the confirmation link).",
    };
  }

  return { ok: true, requiresVerification: false };
}

export async function verifyEmailAction(input: {
  email: string;
  otp: string;
}): Promise<AuthActionResult> {
  const parsed = verifyEmailSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid verification code.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.otp,
    type: "signup",
  });

  if (error || !data?.user) {
    return {
      ok: false,
      error: error?.message ?? "Invalid or expired verification code.",
    };
  }

  return { ok: true };
}

export async function resendVerificationAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
  });

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Could not resend verification email.",
    };
  }

  return {
    ok: true,
    message: "A fresh verification email has been sent.",
  };
}

export async function sendResetPasswordAction(input: {
  email: string;
}): Promise<AuthActionResult> {
  const parsed = resetRequestSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
    };
  }

  const env = getPublicEnv();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard/settings`,
    }
  );

  if (error) {
    return {
      ok: false,
      error: error.message ?? "Unable to send reset code.",
    };
  }

  return {
    ok: true,
    message:
      "If an account exists for that email, a password reset code has been sent.",
  };
}

export async function resetPasswordWithCodeAction(input: {
  email: string;
  code: string;
  newPassword: string;
}): Promise<AuthActionResult> {
  const parsed = resetConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid reset details.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
    email: parsed.data.email,
    token: parsed.data.code,
    type: "recovery",
  });

  if (verifyError || !verifyData?.user) {
    return {
      ok: false,
      error: verifyError?.message ?? "Invalid or expired reset code.",
    };
  }

  const { error: resetError } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (resetError) {
    return {
      ok: false,
      error: resetError.message ?? "Could not update password.",
    };
  }

  return {
    ok: true,
    message: "Your password has been updated. You can now sign in.",
  };
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
