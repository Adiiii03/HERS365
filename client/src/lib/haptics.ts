import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

async function press(style: ImpactStyle = ImpactStyle.Light) {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.impact({ style });
}

async function selection() {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.selectionStart();
  await Haptics.selectionEnd();
}

async function notify(type: NotificationType = NotificationType.Success) {
  if (!Capacitor.isNativePlatform()) return;
  await Haptics.notification({ type });
}

export const haptics = { press, selection, notify };

export function useHaptics() {
  return haptics;
}
