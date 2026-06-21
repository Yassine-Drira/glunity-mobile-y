import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export const PERM_KEY = '@app_perms_requested_v1';

export async function requestStartupPermissions(): Promise<boolean> {
  try {
    const done = await AsyncStorage.getItem(PERM_KEY);
    if (done) return false;

    // Request media library permission
    try {
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    } catch (e) {
      // silently ignore if not available
    }

    // Request camera permission
    try {
      await ImagePicker.requestCameraPermissionsAsync();
    } catch (e) {
      // silently ignore if not available
    }

    // Request microphone permission via expo-av if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const ExpoAV = require('expo-av');
      if (ExpoAV && ExpoAV.Audio && typeof ExpoAV.Audio.requestPermissionsAsync === 'function') {
        await ExpoAV.Audio.requestPermissionsAsync();
      }
    } catch (e) {
      // silently ignore if audio module not present or on web
    }

    await AsyncStorage.setItem(PERM_KEY, String(Date.now()));
    return true;
  } catch (e) {
    // best-effort only
    return false;
  }
}
