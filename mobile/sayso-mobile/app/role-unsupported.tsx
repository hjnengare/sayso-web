import { SafeAreaView, Text, View } from 'react-native';

export default function RoleUnsupportedScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A' }}>Use web portal</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>
          Business-owner and admin roles are available on web in v1.
        </Text>
      </View>
    </SafeAreaView>
  );
}
