import { ReactNode } from "react";
import PortalLayout from "../components/BusinessPortal/PortalLayout";

export default function BusinessPortalGroupLayout({ children }: { children: ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>;
}
