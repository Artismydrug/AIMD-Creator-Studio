import Constants from 'expo-constants';
import { Platform } from 'react-native';

export const isAndroidExpoGo =
  Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient';

export const supportsRemotePushNotifications = !isAndroidExpoGo;
