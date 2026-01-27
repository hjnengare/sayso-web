"use client";

import { usePredefinedPageTitle } from "../hooks/usePageTitle";
import AuthPage from "../components/Auth/AuthPage";

export default function RegisterPage() {
  usePredefinedPageTitle("register");
  return <AuthPage defaultAuthMode="register" />;
}
