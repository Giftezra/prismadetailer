import React from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import StyledButton from "../components/helpers/StyledButton";
import StyledText from "../components/helpers/StyledText";
import StyledTextInput from "../components/helpers/StyledTextInput";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOnboarding } from "@/app/app-hooks/useOnboarding";

const { width, height } = Dimensions.get("window");

const SignUpScreen = () => {
  const {
    currentStep,
    errors,
    showPassword,
    steps,
    formData,
    handleNext,
    handleBack,
    updateFormData,
    togglePasswordVisibility,
  } = useOnboarding();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const cardColor = useThemeColor({}, "cards");
  const borderColor = useThemeColor({}, "borders");
  const buttonColor = useThemeColor({}, "button");
  const iconColor = useThemeColor({}, "icons");

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.stepContainer}>
          <View
            style={[
              styles.stepCircle,
              {
                backgroundColor:
                  currentStep >= step.id ? buttonColor : borderColor,
                borderColor: currentStep >= step.id ? buttonColor : borderColor,
              },
            ]}
          >
            {currentStep > step.id ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <StyledText
                variant="labelLarge"
                style={[
                  styles.stepNumber,
                  {
                    color: currentStep >= step.id ? "#FFFFFF" : textColor,
                  },
                ]}
              >
                {step.id}
              </StyledText>
            )}
          </View>
          <StyledText
            variant="labelMedium"
            style={[
              styles.stepTitle,
              {
                color: currentStep >= step.id ? buttonColor : textColor,
              },
            ]}
          >
            {step.title}
          </StyledText>
          {index < steps.length - 1 && (
            <View
              style={[
                styles.stepLine,
                {
                  backgroundColor:
                    currentStep > step.id ? buttonColor : borderColor,
                },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <StyledText
              variant="headlineSmall"
              style={[styles.stepHeader, { color: textColor }]}
            >
              Personal Information
            </StyledText>
            <StyledText
              variant="bodyMedium"
              style={[styles.stepDescription, { color: textColor }]}
            >
              Tell us about yourself to get started
            </StyledText>

            <StyledTextInput
              label="First Name"
              placeholder="Enter your first name"
              value={formData?.first_name}
              onChangeText={(text) => updateFormData("first_name", text)}
              style={styles.input}
              importantForAutofill="yes"
              autoComplete="given-name"
            />
            {errors.first_name && (
              <StyledText
                variant="bodySmall"
                style={[styles.errorText, { color: "#D32F2F" }]}
              >
                {errors.first_name}
              </StyledText>
            )}

            <StyledTextInput
              label="Last Name"
              placeholder="Enter your last name"
              value={formData?.last_name}
              onChangeText={(text) => updateFormData("last_name", text)}
              style={styles.input}
              importantForAutofill="yes"
              autoComplete="family-name"
            />
            {errors.last_name && (
              <StyledText
                variant="bodySmall"
                style={[styles.errorText, { color: "#D32F2F" }]}
              >
                {errors.last_name}
              </StyledText>
            )}

            <StyledTextInput
              label="Email Address"
              placeholder="Enter your email address"
              value={formData?.email}
              onChangeText={(text) => updateFormData("email", text)}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              importantForAutofill="yes"
              autoComplete="email"
            />
            {errors.email && (
              <StyledText
                variant="bodySmall"
                style={[styles.errorText, { color: "#D32F2F" }]}
              >
                {errors.email}
              </StyledText>
            )}

            <StyledTextInput
              label="Phone Number"
              placeholder="Enter your phone number"
              value={formData?.phone}
              onChangeText={(text) => updateFormData("phone", text)}
              keyboardType="phone-pad"
              style={styles.input}
              importantForAutofill="yes"
              autoComplete="tel"
            />
            {errors.phone && (
              <StyledText
                variant="bodySmall"
                style={[styles.errorText, { color: "#D32F2F" }]}
              >
                {errors.phone}
              </StyledText>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <StyledText
              variant="titleLarge"
              style={[styles.stepHeader, { color: textColor }]}
            >
              Security Setup
            </StyledText>
            <StyledText
              variant="bodyMedium"
              style={[styles.stepDescription, { color: textColor }]}
            >
              Create a secure password for your account
            </StyledText>

            <View style={styles.passwordContainer}>
              <StyledTextInput
                label="Password"
                placeholder="Create a strong password"
                value={formData?.password}
                onChangeText={(text) => updateFormData("password", text)}
                secureTextEntry={!showPassword}
                style={[styles.input, styles.passwordInput]}
              />
              <StyledButton
                variant="icon"
                onPress={togglePasswordVisibility}
                style={styles.passwordToggle}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color={textColor}
                />
              </StyledButton>
            </View>

            <View style={styles.passwordRequirements}>
              <StyledText
                variant="labelSmall"
                style={[styles.requirementTitle, { color: textColor }]}
              >
                Password Requirements:
              </StyledText>
              <View style={styles.requirementList}>
                <View style={styles.requirementItem}>
                  <Ionicons
                    name={
                      formData?.password?.length >= 8
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={16}
                    color={
                      formData?.password?.length >= 8 ? "#4CAF50" : textColor
                    }
                  />
                  <StyledText
                    variant="bodySmall"
                    style={[styles.requirementText, { color: textColor }]}
                  >
                    At least 8 characters
                  </StyledText>
                </View>
              </View>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <StyledText
              variant="headlineSmall"
              style={[styles.stepHeader, { color: textColor }]}
            >
              Location Details
            </StyledText>
            <StyledText
              variant="bodyMedium"
              style={[styles.stepDescription, { color: textColor }]}
            >
              Help us understand your service area
            </StyledText>

            <StyledTextInput
              label="Street Address"
              placeholder="Enter your street address"
              value={formData?.address}
              onChangeText={(text) => updateFormData("address", text)}
              style={styles.input}
              importantForAutofill="yes"
              autoComplete="street-address"
            />

            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <StyledTextInput
                  label="City"
                  placeholder="Enter your city"
                  value={formData?.city}
                  onChangeText={(text) => updateFormData("city", text)}
                  style={styles.input}
                  importantForAutofill="yes"
                  autoComplete="address-line1"
                />
              </View>
              <View style={styles.halfWidth}>
                <StyledTextInput
                  label="Postcode"
                  placeholder="Enter postcode"
                  value={formData?.postcode}
                  onChangeText={(text) => updateFormData("postcode", text)}
                  style={styles.input}
                  importantForAutofill="yes"
                  autoComplete="postal-code"
                />
              </View>
            </View>

            <StyledTextInput
              label="Country"
              placeholder="Enter your country"
              value={formData?.country}
              onChangeText={(text) => updateFormData("country", text)}
              style={styles.input}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <LinearGradient
        colors={[buttonColor, backgroundColor]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <StyledButton
          variant="icon"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={20} color={iconColor} />
        </StyledButton>

        <StyledText variant="headlineSmall" style={styles.headerTitle}>
          Join Our Team
        </StyledText>
        <StyledText variant="bodyMedium" style={styles.headerSubtitle}>
          Step {currentStep} of {steps.length}
        </StyledText>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStepIndicator()}
        {renderStepContent()}

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <StyledButton
              variant="tonal"
              onPress={handleBack}
              style={styles.backButtonLarge}
            >
              Back
            </StyledButton>
          )}

          <StyledButton
            variant="large"
            onPress={handleNext}
            style={styles.nextButton}
          >
            {currentStep === 3 ? "Submit Application" : "Continue"}
          </StyledButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 10,
    paddingHorizontal: 12,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 12,
    zIndex: 1,
  },
  headerTitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    color: "#FFFFFF",
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  stepContainer: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  stepNumber: {
    fontWeight: "bold",
  },
  stepTitle: {
    marginTop: 8,
    textAlign: "center",
    fontSize: 12,
  },
  stepLine: {
    position: "absolute",
    top: 20,
    left: "50%",
    width: "100%",
    height: 2,
    zIndex: -1,
  },
  stepContent: {
    marginBottom: 40,
  },
  stepHeader: {
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  stepDescription: {
    textAlign: "center",
    marginBottom: 32,
    opacity: 0.7,
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
  passwordToggle: {
    position: "absolute",
    right: 5,
    top: 20,
    backgroundColor: "transparent",
  },
  passwordRequirements: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(139, 92, 246, 0.1)",
  },
  requirementTitle: {
    marginBottom: 8,
    fontWeight: "600",
  },
  requirementList: {
    gap: 4,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  requirementText: {
    opacity: 0.8,
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 16,
    marginTop: 20,
  },
  backButtonLarge: {
    flex: 1,
  },
  nextButton: {
    flex: 2,
  },
  errorText: {
    marginTop: -16,
    marginBottom: 16,
    marginLeft: 10,
  },
});

export default SignUpScreen;
