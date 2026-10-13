import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import type { ErrorFallbackProps } from '@/components/ErrorFallback';
import { getErrorDiagnosticCode } from '@/lib/errorDiagnostics';

/** Optional push failures must be visible, but must not block account navigation. */
export default function NotificationStartupFallback({ error, diagnosticCode, resetError }: ErrorFallbackProps) {
  const shown = useRef(false);
  useEffect(() => {
    if (shown.current) return;
    shown.current = true;
    Alert.alert(
      'Phone notifications couldn’t start',
      `You can still use Creator Studio, but phone notifications may be unavailable until restarted. Support code: ${diagnosticCode ?? getErrorDiagnosticCode(error, null, 'NOTIFY')}`,
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'Retry notifications', onPress: resetError },
      ],
    );
  }, [diagnosticCode, error, resetError]);
  return null;
}
