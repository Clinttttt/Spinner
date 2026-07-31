import type {
  OperatingDay,
  PickupWindowSetting,
  SettingsMenuSection,
} from "../models/settings";

export const settingsMenuSections: SettingsMenuSection[] = [
  {
    title: "Account",
    items: [
      {
        id: "profile",
        icon: "person-outline",
        title: "Profile Information",
        subtitle: "Update your personal information",
      },
      {
        id: "password",
        icon: "lock-closed-outline",
        title: "Change Password",
        subtitle: "Update your account password",
      },
      {
        id: "notifications",
        icon: "notifications-outline",
        title: "Notification Preferences",
        subtitle: "Manage alerts and customer notifications",
      },
    ],
  },
  {
    title: "Business",
    items: [
      {
        id: "business",
        icon: "storefront-outline",
        title: "Business Information",
        subtitle: "Update your laundromat details",
      },
      {
        id: "services",
        icon: "shirt-outline",
        title: "Services & Pricing",
        subtitle: "Manage your services and prices",
      },
      {
        id: "hours",
        icon: "time-outline",
        title: "Operating Hours",
        subtitle: "Set your business and pickup hours",
      },
      {
        id: "payments",
        icon: "card-outline",
        title: "Payment Methods",
        subtitle: "Manage customer payment options",
      },
    ],
  },
  {
    title: "App & Support",
    items: [
      {
        id: "help",
        icon: "help-circle-outline",
        title: "Help Center",
        subtitle: "Get help and support",
      },
      {
        id: "terms",
        icon: "document-text-outline",
        title: "Terms of Service",
        subtitle: "Read the app terms and conditions",
      },
      {
        id: "privacy",
        icon: "shield-checkmark-outline",
        title: "Privacy Policy",
        subtitle: "Learn how business and customer data is handled",
      },
      {
        id: "about",
        icon: "information-circle-outline",
        title: "About App",
        subtitle: "App version 1.0.0",
      },
    ],
  },
];

export const settingsDefaults = {
  owner: {
    fullName: "Owner",
    email: "",
    phone: "Not set",
    role: "Owner / Staff",
    status: "Active",
  },
  business: {
    name: "ENGR. SPIN Laundromat",
    phone: "Not set",
    email: "Not set",
    addressLine: "Business address not configured",
    cityProvince: "",
    pickupServiceArea: "Not configured",
  },
  paymentMethods: {
    cashOnDelivery: false,
    qrOnlinePayment: false,
  },
  app: {
    name: "Engr. Spin Owner",
    version: "1.0.0",
    tagline: "Laundry operations made simple",
    buildNumber: "Managed by EAS",
    environment: "Not set",
    supportContact: "Support contact not configured",
  },
} as const;

export const operatingDays: OperatingDay[] = [
  { day: "Monday", hours: "Not configured", open: false },
  { day: "Tuesday", hours: "Not configured", open: false },
  { day: "Wednesday", hours: "Not configured", open: false },
  { day: "Thursday", hours: "Not configured", open: false },
  { day: "Friday", hours: "Not configured", open: false },
  { day: "Saturday", hours: "Not configured", open: false },
  { day: "Sunday", hours: "Not configured", open: false },
];

export const pickupWindows: PickupWindowSetting[] = [
  {
    id: "morning",
    label: "Morning Window",
    hours: "Not configured",
    enabled: false,
  },
  {
    id: "afternoon",
    label: "Afternoon Window",
    hours: "Not configured",
    enabled: false,
  },
];
