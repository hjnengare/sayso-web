import HomeClient from './HomeClient';
import GuestHome from './GuestHome';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function HomePage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams
    ? await Promise.resolve(searchParams)
    : undefined;

  const guestParam = resolvedSearchParams?.guest;
  const isGuest =
    guestParam === 'true' ||
    (Array.isArray(guestParam) && guestParam.includes('true'));

  return isGuest ? <GuestHome /> : <HomeClient />;
}

