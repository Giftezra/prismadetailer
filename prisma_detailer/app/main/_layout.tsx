import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  BackHandler,
} from "react-native";
import React, { useState, useEffect } from "react";
import { router, Stack, useFocusEffect, useNavigation } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Divider } from "react-native-paper";
import { useAlertContext } from "../contexts/AlertContext";
import StyledText from "../components/helpers/StyledText";
import { RootState, useAppSelector } from "../store/my_store";

/* Create a custom header that displays the user's name and back arrow, with notification and settings icons */
const CustomHeader = ({ name }: { name: string }) => {
  const backgroundColor = useThemeColor({}, "background");
  const iconColor = useThemeColor({}, "icons");
  const secondaryButtonColor = useThemeColor({}, "secondaryButton");
  const textColor = useThemeColor({}, "text");
  const [isArrowBackVisible, setIsArrowBackVisible] = useState(false);
  const { setAlertConfig } = useAlertContext();
  const navigation = useNavigation();

  // Update arrow visibility based on navigation state
  useFocusEffect(
    React.useCallback(() => {
      setIsArrowBackVisible(router.canGoBack());
    }, [])
  );

  // Listen to navigation state changes
  useEffect(() => {
    const unsubscribe = navigation.addListener("state", () => {
      setIsArrowBackVisible(router.canGoBack());
    });

    return unsubscribe;
  }, [navigation]);

  // Also update when component mounts
  useEffect(() => {
    setIsArrowBackVisible(router.canGoBack());
  }, []);

  const handleBackPress = () => {
    if (router.canGoBack()) {
      router.back();
      // Navigation listener will automatically update the arrow visibility
    } else {
      // Show exit app confirmation
      setAlertConfig({
        isVisible: true,
        title: "Exit App",
        message: "Are you sure you want to close the app?",
        type: "warning",
        onConfirm: () => {
          if (Platform.OS === "android") {
            BackHandler.exitApp();
          }
          // iOS doesn't allow programmatic app closure
        },
        onClose: () => {
          // Do nothing, just close the alert
        },
      });
    }
  };

  return (
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <View style={styles.headerLeft}>
        {Platform.OS === "ios" && isArrowBackVisible && (
          <Pressable onPress={handleBackPress} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={iconColor} />
          </Pressable>
        )}
        <Pressable
          style={styles.nameContainer}
          onPress={() => router.push("/main/(tabs)/profile/ProfileScreen")}
        >
          <StyledText variant="titleMedium" style={{ color: textColor }}>
            {"Hi There, " + name}
          </StyledText>
        </Pressable>
      </View>
      <View style={styles.headerLeft}>
        <Pressable
          style={[styles.buttons, { backgroundColor, shadowColor: textColor }]}
          onPress={() => router.push("/main/NotificationScreen")}
        >
          <Ionicons name="notifications-outline" size={24} color={iconColor} />
        </Pressable>
        <Pressable
          style={[styles.buttons, { backgroundColor, shadowColor: textColor }]}
          onPress={() => router.push("/main/SettingsScreen")}
        >
          <Ionicons name="settings-outline" size={24} color={iconColor} />
        </Pressable>
      </View>
    </View>
  );
};

const MainLayout = () => {
  const user = useAppSelector((state: RootState) => state.auth.user);

  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
      <CustomHeader name={user?.first_name || ""} />
      <Divider />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="NotificationScreen"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="SettingsScreen" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
};

export default MainLayout;

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    paddingHorizontal: 20,
  },

  headerLeft: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  backButton: {
    padding: 5,
  },
  nameContainer: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  buttons: {
    borderWidth: 2,
    borderRadius: 30,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
    padding: 5,
  },
});
