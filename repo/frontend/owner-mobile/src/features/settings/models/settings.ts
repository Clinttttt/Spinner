import Ionicons from "@expo/vector-icons/Ionicons";

export type SettingsPageId =
  | "profile"
  | "password"
  | "notifications"
  | "business"
  | "services"
  | "hours"
  | "payments"
  | "pickupArea"
  | "help"
  | "terms"
  | "privacy"
  | "about";

export interface SettingsMenuItem {
  id: SettingsPageId;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export interface SettingsMenuSection {
  title: string;
  items: SettingsMenuItem[];
}

export interface ServiceSetting {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  description: string;
  pricingType: "fixed" | "custom";
  price: string;
  unit: string;
  isActive: boolean;
  basePrice: number;
  deliveryFee: number | null;
  supportsPickupAndDelivery: boolean;
}

export interface OperatingDay {
  day: string;
  hours: string;
  open: boolean;
}

export interface PickupWindowSetting {
  id: string;
  label: string;
  hours: string;
  enabled: boolean;
}
