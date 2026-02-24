import { SafeAreaView, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: '#1A1A1A' }}>Sayso</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>Home feed is ready for API integration.</Text>
      </View>
    </SafeAreaView>
  );
}
