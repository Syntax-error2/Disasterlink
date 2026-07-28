import { useEffect } from 'react';
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
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
    PushNotifications.addListener('pushNotificationReceived', async (notification) => {
      console.log('Push received: ', notification);
      
      // FORCE HAPTIC VIBRATION FEEDBACK WHEN ALERT APPEARS!
      try {
        await Haptics.vibrate({ duration: 1500 }); // Strong long vibration
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1600);
        setTimeout(() => Haptics.impact({ style: ImpactStyle.Heavy }), 1800);
      } catch (e) {
        // Fallback for devices without advanced haptics
      }
    });

    // Method called when tapping on a notification
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action performed: ', action);
      // Store in session storage so cold-booting CommunityPortal can catch it
      sessionStorage.setItem("pending_mass_alert_body", action.notification.body || "");
      window.dispatchEvent(new CustomEvent('mass_alert_tapped', { detail: action.notification.body }));
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, [isAuthenticated, user]);

  return null; // This is a logic-only component
}
