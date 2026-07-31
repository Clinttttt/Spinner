import { StyleSheet, Text, View } from "react-native";

import { colors } from "../../theme/colors";
import { typography } from "../../theme/typography";

interface GreetingSectionProps {
  compact: boolean;
  ownerName: string;
}

function getTimeBasedGreeting(hour: number) {
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
}

export function GreetingSection({ compact, ownerName }: GreetingSectionProps) {
  const greeting = getTimeBasedGreeting(new Date().getHours());

  return (
    <View>
      <Text style={[styles.title, compact && styles.compactTitle]}>
        {greeting}, {ownerName}
      </Text>
      <Text style={styles.subtitle}>Here’s your business at a glance.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.greetingTitle,
    color: colors.navyStrong,
    letterSpacing: -0.4,
  },
  compactTitle: {
    fontSize: 27,
    lineHeight: 33,
  },
  subtitle: {
    ...typography.greetingSubtitle,
    color: colors.textSecondary,
    marginTop: 6,
  },
});
