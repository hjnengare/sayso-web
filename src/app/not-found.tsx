"use client";

import ErrorPage from "./components/ErrorPages/ErrorPage";
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
