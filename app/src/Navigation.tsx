import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import CameraScreen from './screens/CameraScreen';
import ResultScreen from './screens/ResultScreen';
import CollectionScreen from './screens/CollectionScreen';
import MarketScreen from './screens/MarketScreen';
import AppraisalScreen from './screens/AppraisalScreen';
import ChatScreen from './screens/ChatScreen';
import CreateListingScreen from './screens/CreateListingScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const headerDark = { headerStyle: { backgroundColor: '#111' }, headerTintColor: '#fff' };

function ScanStack() {
  return (
    <Stack.Navigator screenOptions={headerDark}>
      <Stack.Screen name="Camera" component={CameraScreen} options={{ title: '코인 스캔' }} />
      <Stack.Screen name="Result" component={ResultScreen} options={{ title: '식별 결과' }} />
      <Stack.Screen name="Appraisal" component={AppraisalScreen} options={{ title: '전문가 감정 의뢰' }} />
    </Stack.Navigator>
  );
}

function MarketStack() {
  return (
    <Stack.Navigator screenOptions={headerDark}>
      <Stack.Screen name="MarketList" component={MarketScreen} options={{ title: '거래 마켓' }} />
      <Stack.Screen name="CreateListing" component={CreateListingScreen} options={{ title: '매물 등록' }} />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }: any) => ({ title: route.params?.listingTitle ?? '채팅' })}
      />
    </Stack.Navigator>
  );
}

export default function Navigation() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: { backgroundColor: '#111', borderTopColor: '#222' },
          tabBarActiveTintColor: '#f59e0b',
          tabBarInactiveTintColor: '#6b7280',
        }}
      >
        <Tab.Screen
          name="ScanTab"
          component={ScanStack}
          options={{ title: '스캔', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text> }}
        />
        <Tab.Screen
          name="Collection"
          component={CollectionScreen}
          options={{
            title: '컬렉션',
            tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🪙</Text>,
            headerShown: true,
            headerTitle: '내 컬렉션',
            ...headerDark,
          }}
        />
        <Tab.Screen
          name="MarketTab"
          component={MarketStack}
          options={{ title: '거래', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🛒</Text> }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
