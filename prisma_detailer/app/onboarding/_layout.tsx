import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const OnboardingLayout = () => {
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="SignUpScreen" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
};

export default OnboardingLayout;

const styles = StyleSheet.create({});
