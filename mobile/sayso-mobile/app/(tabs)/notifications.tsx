import { SafeAreaView, Text, View } from 'react-native';
import { useNotifications } from '../../src/hooks/useNotifications';

export default function NotificationsScreen() {
  const { unreadCount } = useNotifications();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: '#1A1A1A' }}>Notifications</Text>
        <Text style={{ marginTop: 8, color: '#555' }}>Unread: {unreadCount}</Text>
      </View>
    </SafeAreaView>
  );
}
