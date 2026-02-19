import {
  ASK_SESSION_CREATED_EVENT,
  type AskSessionCreatedEventPayload,
} from '@coda/core/contracts';
import { type PluginListener, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  isPermissionGranted,
  onAction,
  registerActionTypes,
  requestPermission,
  sendNotification,
} from '@tauri-apps/plugin-notification';
import { useEffect, useRef } from 'react';

const ASK_NOTIFICATION_TITLE = 'New ask needs your response';
const ASK_NOTIFICATION_PREVIEW_MAX_LENGTH = 92;
const ASK_NOTIFICATION_ACTION_TYPE_ID = 'ask-arrival-actions';
const ASK_NOTIFICATION_OPEN_ACTION_ID = 'open-coda';

const isMacOS = (): boolean => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const platform = navigator.platform.toLowerCase();
  const userAgent = navigator.userAgent.toLowerCase();
  return (
    platform.includes('mac') ||
    userAgent.includes('macintosh') ||
    userAgent.includes('mac os') ||
    userAgent.includes('darwin')
  );
};

const buildNotificationPreview = (firstQuestionText: string | null): string => {
  const fallbackText = 'Open Coda to answer the pending ask';
  const sourceText = firstQuestionText?.trim().length ? firstQuestionText.trim() : fallbackText;
  const clipped = sourceText.slice(0, ASK_NOTIFICATION_PREVIEW_MAX_LENGTH).trimEnd();
  return `${clipped}...`;
};

const focusMainWindow = async (): Promise<void> => {
  const currentWindow = getCurrentWindow();
  try {
    await currentWindow.unminimize();
    await currentWindow.show();
    await currentWindow.setFocus();
  } catch (error: unknown) {
    console.warn('Unable to focus window from notification action', error);
  }
};

export const useAskNotifications = (): void => {
  const permissionGrantedRef = useRef<boolean | null>(null);
  const notifiedAskIdsRef = useRef<Set<string>>(new Set<string>());

  useEffect(() => {
    if (!isTauri() || !isMacOS()) {
      return;
    }

    let unlistenAskCreated: (() => void) | null = null;
    let notificationActionListener: PluginListener | null = null;
    let cleanupRequested = false;

    const notifyForAsk = async (payload: AskSessionCreatedEventPayload): Promise<void> => {
      if (notifiedAskIdsRef.current.has(payload.askId)) {
        return;
      }
      notifiedAskIdsRef.current.add(payload.askId);

      try {
        let permissionGranted = permissionGrantedRef.current;
        if (permissionGranted === null) {
          permissionGranted = await isPermissionGranted();
        }

        if (!permissionGranted) {
          permissionGranted = (await requestPermission()) === 'granted';
        }

        permissionGrantedRef.current = permissionGranted;
        if (!permissionGranted) {
          return;
        }

        sendNotification({
          title: ASK_NOTIFICATION_TITLE,
          body: buildNotificationPreview(payload.firstQuestionText),
          sound: 'Ping',
          actionTypeId: ASK_NOTIFICATION_ACTION_TYPE_ID,
        });
      } catch (error: unknown) {
        console.warn('Unable to send ask notification', error);
      }
    };

    const subscribe = async (): Promise<void> => {
      try {
        unlistenAskCreated = await listen<AskSessionCreatedEventPayload>(
          ASK_SESSION_CREATED_EVENT,
          (event): void => {
            void notifyForAsk(event.payload);
          }
        );
      } catch (error: unknown) {
        console.warn('Unable to subscribe to ask notification events', error);
      }

      try {
        await registerActionTypes([
          {
            id: ASK_NOTIFICATION_ACTION_TYPE_ID,
            actions: [
              {
                id: ASK_NOTIFICATION_OPEN_ACTION_ID,
                title: 'Open Coda',
                foreground: true,
              },
            ],
          },
        ]);
      } catch (error: unknown) {
        console.warn('Unable to register notification action types', error);
      }

      try {
        notificationActionListener = await onAction((): void => {
          void focusMainWindow();
        });
      } catch (error: unknown) {
        // Some runtimes may not expose action callbacks; keep notification delivery active.
        console.warn('Unable to subscribe to notification action callbacks', error);
      }

      if (cleanupRequested) {
        unlistenAskCreated?.();
        void notificationActionListener?.unregister();
        unlistenAskCreated = null;
        notificationActionListener = null;
      }
    };

    void subscribe();

    return () => {
      cleanupRequested = true;
      unlistenAskCreated?.();
      void notificationActionListener?.unregister();
    };
  }, []);
};
