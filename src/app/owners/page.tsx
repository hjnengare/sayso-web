import { redirect } from "next/navigation";

export default function OwnersLegacyRedirect() {
  redirect("/my-businesses");
}
