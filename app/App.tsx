import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Navigation from './src/Navigation';
import { syncPushToken } from './src/services/notifications';

const queryClient = new QueryClient();

export default function App() {
  useEffect(() => {
    syncPushToken();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Navigation />
    </QueryClientProvider>
  );
}
