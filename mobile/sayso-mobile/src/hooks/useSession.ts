import { useAuth } from '../providers/AuthProvider';

export function useAuthSession() {
  const { user, session, isLoading, signInWithPassword, signInWithGoogle, signOut } = useAuth();
  return {
    user,
    session,
    isLoading,
    signInWithPassword,
    signInWithGoogle,
    signOut,
  };
}
