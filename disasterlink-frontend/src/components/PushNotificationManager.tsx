import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import axiosInstance from '@/lib/axios';
import { useAuth } from '@/context/AuthContext';

export function PushNotificationManager() {
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Only run on native devices (Android/iOS) and only when authenticated
    if (!Capacitor.isNativePlatform() || !isAuthenticated || !user) return;

    const registerPush = async () => {
      // Create Android 8.0+ notification channel
      if (Capacitor.getPlatform() === 'android') {
        try {
          await PushNotifications.createChannel({
            id: 'emergency_alerts',
            name: 'Emergency Alerts',
            description: 'Critical mass alerts from the LGU Command Center',
            importance: 5, // High importance (heads-up notification)
            visibility: 1, // Show on lock screen
            vibration: true,
            lights: true,
            lightColor: '#EF4444' // Red light
          });
        } catch (e) {
          console.error("Failed to create push channel", e);
        }
      }

      // Request permission to use push notifications
      const permStatus = await PushNotifications.requestPermissions();

      if (permStatus.receive === 'granted') {
        // Register with Apple / Google to receive push via APNS/FCM
        await PushNotifications.register();
      }
    };

    registerPush();

    // On success, we should be able to receive notifications
    PushNotifications.addListener('registration', async (token) => {
      console.log('Push registration success, token: ' + token.value);
      try {
        // Send the FCM token to Laravel Backend
        await axiosInstance.post('/fcm-token', {
          token: token.value
        });
      } catch (error) {
        console.error('Failed to sync FCM token with backend', error);
      }
    });

    // Some issue with our setup and push will not work
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Error on registration: ' + JSON.stringify(error));
    });

    // Show us the notification payload if the app is open on our device
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
      // Optional: Show a local toast or alert here if app is in foreground
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthenticated, user]);

  return null; // This is a logic-only component
}
