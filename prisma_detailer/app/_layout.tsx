import { Stack } from "expo-router";
import { Provider } from "react-redux";
import store from "./store/my_store";
import { StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import ThemeProvider from "./contexts/ThemeProvider";
import AuthContextProvider from "./contexts/AuthContextProvider";
import { AlertProvider } from "./contexts/AlertContext";
import { useThemeColor } from "@/hooks/useThemeColor";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SnackbarProvider } from "./contexts/SnackbarContext";

export default function RootLayout() {
  const backgroundColor = useThemeColor({}, "background");

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={backgroundColor} />
      <Provider store={store}>
        <ThemeProvider>
          <AlertProvider>
            <SnackbarProvider>
              <AuthContextProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                      name="main"
                      options={{ headerShown: false }}
                    />
                    <Stack.Screen
                      name="onboarding"
                      options={{ headerShown: false }}
                    />
                  </Stack>
                </GestureHandlerRootView>
              </AuthContextProvider>
            </SnackbarProvider>
          </AlertProvider>
        </ThemeProvider>
      </Provider>
    </SafeAreaProvider>
  );
}
