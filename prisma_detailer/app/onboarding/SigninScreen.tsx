import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useAuthContext } from "../contexts/AuthContextProvider";
import StyledText from "../components/helpers/StyledText";
import StyledTextInput from "../components/helpers/StyledTextInput";
import StyledButton from "../components/helpers/StyledButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import LinearGradientComponent from "../components/helpers/LinearGradientComponent";

const SigninScreen = () => {
  const { handleLogin, isLoading } = useAuthContext();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borders");
  const primaryColor = useThemeColor({}, "primary");
  const cardColor = useThemeColor({}, "cards");

  /**
   * Handle the sign-in process
   */
  const handleSignIn = async () => {
    // Basic validation
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    if (!password.trim()) {
      Alert.alert("Error", "Please enter your password");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      await handleLogin(email.trim(), password, rememberMe);
    } catch (error) {
      console.error("Sign-in error:", error);
    }
  };

  /**
   * Handle forgot password action
   */
  const handleForgotPassword = () => {
    console.log("Forgot password pressed");
    Alert.alert(
      "Forgot Password",
      "Password reset functionality will be implemented soon.",
      [{ text: "OK" }]
    );
  };

  /**
   * Navigate to sign up screen
   */
  const handleSignUp = () => {
    router.push("/onboarding/SignUpScreen");
  };

  return (
    <LinearGradientComponent
      color1={backgroundColor}
      color2={primaryColor}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 4, y: 1 }}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            <StyledText
              variant="headlineSmall"
              style={[styles.title, { color: textColor }]}
            >
              Welcome Back
            </StyledText>
            <StyledText
              variant="bodyMedium"
              style={[styles.subtitle, { color: textColor }]}
            >
              Sign in to your account to continue
            </StyledText>
          </View>

          {/* Form Section */}
          <View
            style={[
              styles.formContainer,
              { backgroundColor: cardColor, borderColor },
            ]}
          >
            {/* Email Input */}
            <StyledTextInput
              label="Email Address"
              placeholder="Enter your email address"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            {/* Password Input */}
            <View style={styles.passwordContainer}>
              <StyledTextInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, styles.passwordInput]}
              />
              <TouchableOpacity
                style={[styles.eyeIcon, { borderColor }]}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={textColor}
                />
              </TouchableOpacity>
            </View>

            {/* Remember Me & Forgot Password Row */}
            <View style={styles.optionsRow}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <View style={[styles.checkbox, { borderColor }]}>
                  {rememberMe && (
                    <Ionicons name="checkmark" size={16} color={primaryColor} />
                  )}
                </View>
                <StyledText
                  variant="bodyMedium"
                  style={[styles.rememberMeText, { color: textColor }]}
                >
                  Remember me
                </StyledText>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleForgotPassword}>
                <StyledText
                  variant="bodyMedium"
                  style={[styles.forgotPassword, { color: primaryColor }]}
                >
                  Forgot Password?
                </StyledText>
              </TouchableOpacity>
            </View>

            {/* Sign In Button */}
            <StyledButton
              variant="small"
              onPress={handleSignIn}
              disabled={isLoading}
              style={styles.signInButton}
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </StyledButton>
          </View>

          {/* Sign Up Section */}
          <View style={styles.signUpContainer}>
            <StyledText
              variant="bodyMedium"
              style={[styles.signUpText, { color: textColor }]}
            >
              Don't have an account?{" "}
            </StyledText>
            <TouchableOpacity onPress={handleSignUp}>
              <StyledText
                variant="bodyMedium"
                style={[styles.signUpLink, { color: primaryColor }]}
              >
                Sign Up
              </StyledText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradientComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingTop: 60,
    paddingBottom: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.7,
  },
  formContainer: {
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    marginBottom: 24,
  },
  input: {
    marginBottom: 20,
  },
  passwordContainer: {
    position: "relative",
    marginBottom: 20,
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeIcon: {
    position: "absolute",
    right: 10,
    top: 25,
    padding: 8,
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  rememberMeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 4,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rememberMeText: {
    fontSize: 14,
  },
  forgotPassword: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  signInButton: {
    width: "100%",
  },
  signUpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  signUpText: {
    fontSize: 14,
  },
  signUpLink: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
});

export default SigninScreen;
