# Error Page Implementation Examples

This document provides practical code examples for implementing the unified error page design system across the KLIO platform.

## Standard Error Implementations

### 404 - Page Not Found
```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function NotFound() {
  return (
    <ErrorPage
      errorType="404"
      secondaryAction={{
        label: "Go Back",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
```

### 401 - Authentication Required
```typescript
"use client";

import { useSearchParams } from "next/navigation";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Authentication failed';

  return (
    <ErrorPage
      errorType="401"
      title="Authentication Required"
      description={error}
      secondaryAction={{
        label: "Try Again",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
```

### 403 - Access Denied
```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function AccessDeniedPage() {
  return (
    <ErrorPage
      errorType="403"
      title="Access Denied"
      description="You don't have permission to access this resource."
      primaryAction={{
        label: "Go Home",
        href: "/interests",
      }}
    />
  );
}
```

### 500 - Server Error
```typescript
"use client";

import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function ServerErrorPage() {
  return (
    <ErrorPage
      errorType="500"
      description="Something went wrong on our end. Our team has been notified."
      primaryAction={{
        label: "Go Home",
        href: "/",
      }}
    />
  );
}
```

## Error Boundary Usage

### Basic Setup
```typescript
"use client";

import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";
import MyComponent from "./MyComponent";

export default function Page() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### With Error Logging
```typescript
"use client";

import { ErrorBoundary } from "@/app/components/ErrorBoundary/ErrorBoundary";
import { ErrorInfo } from "react";

export default function Page() {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Component Error:', {
      error: error.toString(),
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

## Onboarding Error Boundary

```typescript
"use client";

import { OnboardingErrorBoundary } from "@/app/components/Onboarding";
import OnboardingFlow from "./OnboardingFlow";

export default function OnboardingPage() {
  return (
    <OnboardingErrorBoundary>
      <OnboardingFlow />
    </OnboardingErrorBoundary>
  );
}
```

## Fetch Error Handling

```typescript
"use client";

import { useState, useEffect } from "react";
import ErrorPage from "@/app/components/ErrorPages/ErrorPage";

export default function DataPage() {
  const [data, setData] = useState(null);
  const [errorType, setErrorType] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/api/data");

        if (!response.ok) {
          switch (response.status) {
            case 401:
              setErrorType("401");
              break;
            case 403:
              setErrorType("403");
              break;
            case 404:
              setErrorType("404");
              break;
            case 500:
              setErrorType("500");
              break;
            case 503:
              setErrorType("503");
              break;
            default:
              setErrorType("error");
          }
          return;
        }

        const json = await response.json();
        setData(json);
      } catch (error) {
        console.error("Fetch error:", error);
        setErrorType("error");
      }
    };

    fetchData();
  }, []);

  if (errorType) {
    return (
      <ErrorPage
        errorType={errorType as any}
        primaryAction={{
          label: "Retry",
          href: "/",
        }}
      />
    );
  }

  if (!data) {
    return <LoadingComponent />;
  }

  return <DataContent data={data} />;
}
```

## Accessibility Checklist

When implementing error pages, ensure:

- [ ] Text has sufficient contrast (WCAG AA: 4.5:1 for body text)
- [ ] Focus states are visible (sage-colored ring)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Error messages are clear and descriptive
- [ ] Page is responsive on all screen sizes
- [ ] Color is not the only way to convey information

## Best Practices Summary

1. **Keep it simple**: Error pages should be fast and easy to understand
2. **Be specific**: Explain what went wrong and why
3. **Provide action**: Always give users a clear next step
4. **Match brand**: Use consistent colors, typography, spacing
5. **Test thoroughly**: Check on all device sizes and browsers

---

For more details, see [ERROR_DESIGN_SYSTEM.md](./ERROR_DESIGN_SYSTEM.md)
