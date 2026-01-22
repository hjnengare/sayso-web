import { redirect } from "next/navigation";

export default function OwnersBusinessReviewsLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/my-businesses/businesses/${params.id}/reviews`);
}
