import { SafeAreaView, Text, View } from 'react-native';

export default function SearchScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>Search</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>
          Hook this tab to `/api/businesses/search` and discovery endpoints.
        </Text>
      </View>
    </SafeAreaView>
  );
}
