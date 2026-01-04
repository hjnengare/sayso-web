import { AuthUser } from "./AuthContext";

export interface OnboardingStep {
  path: string;
  name: string;
  isComplete: (user: AuthUser | null) => boolean;
  requiredPrevious?: string[];
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    path: "/onboarding",
    name: "Get Started",
    isComplete: () => true, // Always accessible
  },
  {
    path: "/register",
    name: "Register",
    isComplete: (user) => !!user?.email, // Must have registered
    requiredPrevious: ["/onboarding"]
  },
  {
    path: "/login",
    name: "Login",
    isComplete: (user) => !!user?.email, // Must be logged in
  },
  {
    path: "/interests",
    name: "Interests",
    isComplete: (user) => (user?.profile?.interests_count ?? 0) > 0,
    requiredPrevious: ["/register", "/login"]
  },
  {
    path: "/subcategories",
    name: "Subcategories",
    isComplete: (user) => (user?.profile?.subcategories_count ?? 0) > 0,
    requiredPrevious: ["/interests"]
  },
  {
    path: "/deal-breakers",
    name: "Deal Breakers",
    isComplete: (user) => {
      const n = user?.profile?.dealbreakers_count ?? 0;
      return n >= 2 && n <= 3;
    },
    requiredPrevious: ["/subcategories"]
  },
  {
    path: "/complete",
    name: "Complete",
    isComplete: (user) => !!user?.profile?.onboarding_complete,
    requiredPrevious: ["/deal-breakers"]
  }
];
