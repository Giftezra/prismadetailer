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
import { useEffect } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SnackbarProvider } from "./contexts/SnackbarContext";

export default function RootLayout() {
  const backgroundColor = useThemeColor({}, "background");

  useEffect(() => {
    // Handle deep links when app is already running
    const handleDeepLink = (url: string) => {
      const parsed = Linking.parse(url);
      const { hostname, queryParams, path } = parsed;

      // Handle password reset deep links
      if (
        hostname === "onboarding" &&
        path === "ResetPasswordScreen" &&
        queryParams?.token
      ) {
        router.push({
          pathname: "/onboarding/ResetPasswordScreen",
          params: { token: queryParams.token as string },
        });
      } else if (hostname === "reset-password" && queryParams?.token) {
        // Legacy format support
        router.push({
          pathname: "/onboarding/ResetPasswordScreen",
          params: { token: queryParams.token as string },
        });
      }
    };

    // Listen for deep links
    const subscription = Linking.addEventListener("url", ({ url }) => {
      handleDeepLink(url);
    });

    // Handle deep link if app was opened from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink(url);
      }
    });

    return () => {
      subscription?.remove();
    };
  }, []);

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
                  <Stack.Screen name="main" options={{ headerShown: false }} />
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
