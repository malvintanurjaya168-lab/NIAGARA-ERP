"use server";

import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { landingPathForRole } from "@/lib/roles";

export type LoginState = { error?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
});

export async function loginAction(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const email = parsed.data.email.toLowerCase();

  const account = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isActive: true },
  });

  const redirectTo =
    account && account.isActive ? landingPathForRole(account.role) : "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password: parsed.data.password,
      redirectTo,
    });
    return undefined;
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          error: "Email atau kata sandi salah, atau akun Anda tidak aktif.",
        };
      }
      return { error: "Gagal masuk. Silakan coba beberapa saat lagi." };
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
