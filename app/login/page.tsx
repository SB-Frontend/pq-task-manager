import { redirect } from "next/navigation";

import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth/auth";

export const metadata = { title: "Login" };

export default async function LoginPage() {
  // Someone already signed in has no reason to see this page.
  if (await getCurrentUser()) redirect("/app");

  return (
    <AuthCard title="Sign in" description="Welcome back.">
      <LoginForm />
    </AuthCard>
  );
}
