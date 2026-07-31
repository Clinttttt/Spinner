import Ionicons from "@expo/vector-icons/Ionicons";
import type { PropsWithChildren } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";

import { colors } from "../../../theme/colors";

interface ManualOrderFormSectionProps extends PropsWithChildren {
  icon: keyof typeof Ionicons.glyphMap;
  subtitle?: string;
  title: string;
}

export function ManualOrderFormSection({
  children,
  icon,
  subtitle,
  title,
}: ManualOrderFormSectionProps) {
  const { width } = useWindowDimensions();
  const compact = width <= 390;

  return (
    <View style={[styles.card, compact && styles.compactCard]}>
      <View style={[styles.heading, compact && styles.compactHeading]}>
        <View style={[styles.iconShell, compact && styles.compactIconShell]}>
          <Ionicons color={colors.navy} name={icon} size={19} />
        </View>
        <View style={styles.headingCopy}>
          <Text style={[styles.title, compact && styles.compactTitle]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, compact && styles.compactSubtitle]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.body, compact && styles.compactBody]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 14 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
  },
  compactBody: { marginTop: 12 },
  compactCard: { borderRadius: 18, padding: 12 },
  compactHeading: { gap: 8 },
  compactIconShell: { borderRadius: 11, height: 34, width: 34 },
  compactSubtitle: { fontSize: 11, lineHeight: 15 },
  compactTitle: { fontSize: 15, lineHeight: 20 },
  heading: { alignItems: "center", flexDirection: "row", gap: 10 },
  headingCopy: { flex: 1, minWidth: 0 },
  iconShell: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 13,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 1,
  },
  title: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
});
