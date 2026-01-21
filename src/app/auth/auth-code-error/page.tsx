"use client";

import { useSearchParams } from "next/navigation";
import ErrorPage from "../../components/ErrorPages/ErrorPage";
import { IoArrowBack } from "react-icons/io5";

export default function AuthCodeErrorPage() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error') || 'Authentication failed';

  return (
    <ErrorPage
      errorType="401"
      title="Authentication Error"
      description={errorParam}
      secondaryAction={{
        label: "Try Again",
        onClick: () => window.history.back(),
        icon: <IoArrowBack className="w-5 h-5" />,
      }}
    />
  );
}
