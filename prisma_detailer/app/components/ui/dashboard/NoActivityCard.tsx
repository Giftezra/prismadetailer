import React from "react";
import { View, StyleSheet } from "react-native";
import { useThemeColor } from "@/hooks/useThemeColor";
import StyledText from "@/app/components/helpers/StyledText";
import LinearGradientComponent from "../../helpers/LinearGradientComponent";

const NoActivityCard: React.FC = () => {
  const backgroundColor = useThemeColor({}, "cards");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "borders");

  return (
    <LinearGradientComponent
      color1={backgroundColor}
      color2={textColor}
      style={[styles.container]}
      start={{ x: 0, y: 0 }}
      end={{ x: 4, y: 1 }}
    >
      <View style={styles.content}>
        <View
          style={[styles.iconContainer, { backgroundColor: textColor + "20" }]}
        >
          <StyledText style={[styles.icon, { color: textColor }]}>
            📊
          </StyledText>
        </View>
        <StyledText
          variant="titleMedium"
          style={[styles.title, { color: textColor }]}
        >
          No Recent Activity
        </StyledText>
        <StyledText
          variant="bodySmall"
          style={[styles.subtitle, { color: textColor, opacity: 0.7 }]}
        >
          You haven't completed any jobs recently. Your activity will appear
          here once you start working!
        </StyledText>
      </View>
    </LinearGradientComponent>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 5,
    marginVertical: 8,
    borderRadius: 5,
    borderWidth: 1,
    padding: 20,
    minHeight: 300,
    flex: 1,
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  icon: {
    fontSize: 24,
  },
  title: {
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 20,
  },
});

export default NoActivityCard;


