import { SafeAreaView, Text, View } from 'react-native';

export default function SavedScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>Saved</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>Use `/api/user/saved` with bearer auth.</Text>
      </View>
    </SafeAreaView>
  );
}
