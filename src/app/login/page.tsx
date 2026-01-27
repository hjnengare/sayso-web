"use client";

import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import AuthPage from "../components/Auth/AuthPage";

export default function LoginPage() {
  usePredefinedPageTitle("login");
  return <AuthPage defaultAuthMode="login" />;
}
