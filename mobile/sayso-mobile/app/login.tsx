import { useState } from 'react';
import { useRouter } from 'expo-router';
import { SafeAreaView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuthSession } from '../src/hooks/useSession';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithPassword, signInWithGoogle } = useAuthSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A' }}>Sign in</Text>
        <TextInput
          placeholder="Email"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, marginTop: 16 }}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          style={{ borderWidth: 1, borderColor: '#DDD', borderRadius: 10, padding: 12, marginTop: 12 }}
        />
        <TouchableOpacity
          onPress={async () => {
            await signInWithPassword(email, password);
            router.replace('/(tabs)');
          }}
          style={{ marginTop: 16, backgroundColor: '#1A1A1A', borderRadius: 12, padding: 12 }}
        >
          <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '600' }}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={async () => {
            await signInWithGoogle();
            router.replace('/(tabs)');
          }}
          style={{
            marginTop: 10,
            backgroundColor: '#F4F4F4',
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: '#E2E2E2',
          }}
        >
          <Text style={{ color: '#1A1A1A', textAlign: 'center', fontWeight: '600' }}>
            Continue with Google
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
