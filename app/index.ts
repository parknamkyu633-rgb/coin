import * as Sentry from '@sentry/react-native';
import { registerRootComponent } from 'expo';

import App from './App';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.2,
});

registerRootComponent(Sentry.wrap(App));
