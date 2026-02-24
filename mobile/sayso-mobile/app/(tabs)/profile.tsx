import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { useAuthSession } from '../../src/hooks/useSession';

export default function ProfileScreen() {
  const { user, signOut } = useAuthSession();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>Profile</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>{user?.email || 'Not signed in'}</Text>
        <TouchableOpacity
          onPress={signOut}
          style={{ marginTop: 16, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12 }}
        >
          <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
