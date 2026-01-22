import { redirect } from "next/navigation";

export default function OwnersBusinessLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/my-businesses/businesses/${params.id}`);
}
