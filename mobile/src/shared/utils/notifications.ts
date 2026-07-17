import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import http from '../../core/network/http.client';

// Configure how notifications are handled when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync(pushEnabledStatus?: boolean) {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    const Constants = require('expo-constants').default;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: Constants?.expoConfig?.extra?.eas?.projectId,
    });
    const token = tokenData.data;

    // Save token to backend user profile (PATCH /api/users/me)
    const enabled = pushEnabledStatus !== undefined ? pushEnabledStatus : true;
    await http.patch('/users/me', { pushToken: token, pushEnabled: enabled });
    console.log('[Push] Registered push token:', token);
    return token;
  } catch (error) {
    console.warn('[Push] Error registering push notifications:', error);
    return null;
  }
}

export function setupNotificationListeners(
  onReceived?: (notification: Notifications.Notification) => void,
  onResponseReceived?: (response: Notifications.NotificationResponse) => void
) {
  // Listen for incoming notifications when app is in foreground
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    console.log('[Push] Notification received in foreground:', notification);
    if (onReceived) onReceived(notification);
  });

  // Listen for interaction with notifications (when clicked)
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
    console.log('[Push] User interacted with notification:', response);
    if (onResponseReceived) onResponseReceived(response);
  });

  return () => {
    subscription.remove();
    responseSubscription.remove();
  };
}
