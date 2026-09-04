import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import DseDashboardScreen from './src/screens/DseDashboardScreen';
import CustomerHubScreen from './src/screens/CustomerHubScreen';
import OrderFormScreen from './src/screens/OrderFormScreen';
import CartSummaryScreen from './src/screens/CartSummaryScreen';
import PaymentEntryScreen from './src/screens/PaymentEntryScreen';
import PaymentListScreen from './src/screens/PaymentListScreen';
import EODSummaryScreen from './src/screens/EODSummaryScreen';
import AdHocCustomersScreen from './src/screens/AdHocCustomersScreen';
import CreateCustomerScreen from './src/screens/CreateCustomerScreen';
import CustomerDashboardScreen from './src/screens/CustomerDashboardScreen';
import CustomerProfileScreen from './src/screens/CustomerProfileScreen';
import CustomerEditScreen from './src/screens/CustomerEditScreen';
import PriceAlertsScreen from './src/screens/PriceAlertsScreen';
import PendingOrdersScreen from './src/screens/PendingOrdersScreen';
import PendingPaymentsScreen from './src/screens/PendingPaymentsScreen';
import RouteBriefingScreen from './src/screens/RouteBriefingScreen';
import { useAppStore } from './src/store';

const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  const currentUser = useAppStore(state => state.currentUser);
  const checkAndAutoClear = useAppStore(state => state.checkAndAutoClear);

  React.useEffect(() => {
    checkAndAutoClear();
  }, [checkAndAutoClear]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {!currentUser ? (
              <Stack.Screen name="Login" component={LoginScreen} />
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="DseDashboard" component={DseDashboardScreen} />
                <Stack.Screen name="CustomerHub" component={CustomerHubScreen} />
                <Stack.Screen name="CustomerDashboard" component={CustomerDashboardScreen} />
                <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
                <Stack.Screen name="CustomerEdit" component={CustomerEditScreen} />
                <Stack.Screen name="CreateCustomer" component={CreateCustomerScreen} />
                <Stack.Screen name="AdHocCustomers" component={AdHocCustomersScreen} />
                <Stack.Screen name="PriceAlerts" component={PriceAlertsScreen} />
                <Stack.Screen name="OrderForm" component={OrderFormScreen} />
                <Stack.Screen name="CartSummary" component={CartSummaryScreen} />
                <Stack.Screen name="PaymentList" component={PaymentListScreen} />
                <Stack.Screen name="PaymentEntry" component={PaymentEntryScreen} />
                <Stack.Screen name="PendingOrders" component={PendingOrdersScreen} />
                <Stack.Screen name="PendingPayments" component={PendingPaymentsScreen} />
                <Stack.Screen name="RouteBriefing" component={RouteBriefingScreen} />
                <Stack.Screen name="EODSummary" component={EODSummaryScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
