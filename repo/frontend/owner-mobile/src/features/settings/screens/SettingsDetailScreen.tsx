import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  ToastAndroid,
  View,
} from "react-native";

import { describeApiError } from "../../../api/apiClient";
import { appDialog } from "../../../components/common/DialogProvider";
import { colors } from "../../../theme/colors";
import {
  changeAccountPassword,
  getAccountProfile,
  updateAccountProfile,
} from "../../auth/services/accountService";
import { useAuth } from "../../auth/AuthContext";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";
import { SettingsCard } from "../components/SettingsCard";
import {
  InlineNotice,
  PrimaryButton,
  SecondaryButton,
  SettingsSectionTitle,
  ToggleRow,
} from "../components/SettingsControls";
import { SettingsField } from "../components/SettingsField";
import { SettingsPageScaffold } from "../components/SettingsPageScaffold";
import { ServiceEditorModal } from "../components/ServiceEditorModal";
import {
  operatingDays,
  pickupWindows,
  settingsDefaults,
} from "../data/settingsConfig";
import type {
  OperatingDay,
  PickupWindowSetting,
  ServiceSetting,
  SettingsPageId,
} from "../models/settings";
import {
  createLaundryService,
  getBusinessSettings,
  getLaundryServices,
  getOperatingDays,
  getPickupWindows,
  setLaundryServiceAvailability,
  updateBusinessProfile,
  updateNotificationSettings,
  updatePaymentMethods,
  updatePickupServiceArea,
  updateSchedules,
  updateLaundryService,
  type BusinessSettingsDto,
} from "../services/settingsService";
import { captureCurrentLocation } from "../services/deviceLocation";

const ownerProfile = require("../../../../assets/profile/owner-profile.png");
const logo = require("../../../../assets/branding/logo.jpg");

interface SettingsDetailScreenProps {
  onBackPress: () => void;
  page: SettingsPageId;
}

const pageCopy: Record<SettingsPageId, { title: string; subtitle: string }> = {
  profile: {
    title: "Profile Information",
    subtitle: "Manage your owner account details",
  },
  password: {
    title: "Change Password",
    subtitle: "Create a new secure password",
  },
  notifications: {
    title: "Notification Preferences",
    subtitle: "Business alerts and customer messages",
  },
  business: {
    title: "Business Information",
    subtitle: "Manage customer-facing details",
  },
  services: {
    title: "Services & Pricing",
    subtitle: "Manage laundry services and prices",
  },
  hours: {
    title: "Operating Hours",
    subtitle: "Business and pickup availability",
  },
  payments: {
    title: "Payment Methods",
    subtitle: "Manage how customers can pay",
  },
  pickupArea: {
    title: "Pickup Service Area",
    subtitle: "Set the centre and reach of your pickups",
  },
  help: { title: "Help Center", subtitle: "Find answers and get support" },
  terms: { title: "Terms of Service", subtitle: "Effective May 1, 2025" },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How your business data is handled",
  },
  about: { title: "About App", subtitle: "Engr. Spin Owner" },
};

export function SettingsDetailScreen({
  onBackPress,
  page,
}: SettingsDetailScreenProps) {
  const copy = pageCopy[page];

  return (
    <SettingsPageScaffold
      onBackPress={onBackPress}
      subtitle={copy.subtitle}
      title={copy.title}
    >
      {page === "profile" ? <ProfileInformationPage /> : null}
      {page === "password" ? <ChangePasswordPage /> : null}
      {page === "notifications" ? <NotificationPreferencesPage /> : null}
      {page === "business" ? <BusinessInformationPage /> : null}
      {page === "services" ? <ServicesPricingPage /> : null}
      {page === "hours" ? <OperatingHoursPage /> : null}
      {page === "payments" ? <PaymentMethodsPage /> : null}
      {page === "pickupArea" ? <PickupServiceAreaPage /> : null}
      {page === "help" ? <HelpCenterPage /> : null}
      {page === "terms" ? <TermsPage /> : null}
      {page === "privacy" ? <PrivacyPage /> : null}
      {page === "about" ? <AboutAppPage /> : null}
    </SettingsPageScaffold>
  );
}

function showSaved(label: string) {
  if (Platform.OS === "android") {
    ToastAndroid.show(label, ToastAndroid.SHORT);
    return;
  }
  void appDialog.notify({ message: label, title: "Saved", tone: "success" });
}

function showApiError(title: string, error: unknown) {
  void appDialog.notify({
    message: describeApiError(error, "Please try again."),
    title,
    tone: "danger",
  });
}

function showValidation(title: string, message: string) {
  void appDialog.notify({ message, title, tone: "warning" });
}

function ProfileInformationPage() {
  const { updateAccountIdentity } = useAuth();
  const [name, setName] = useState<string>(settingsDefaults.owner.fullName);
  const [email, setEmail] = useState<string>(settingsDefaults.owner.email);
  const [phone, setPhone] = useState<string>(settingsDefaults.owner.phone);
  const [role, setRole] = useState<string>(settingsDefaults.owner.role);
  const [status, setStatus] = useState<string>(settingsDefaults.owner.status);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void getAccountProfile()
      .then((profile) => {
        setName(profile.fullName);
        setEmail(profile.emailAddress);
        setPhone(profile.mobileNumber ?? "");
        setRole(profile.role);
        setStatus(profile.isActive ? "Active" : "Inactive");
      })
      .catch((error) => showApiError("Unable to load profile", error));
  }, []);

  const saveProfile = async () => {
    if (!name.trim()) {
      showValidation("Name required", "Full name is required.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      showValidation("Invalid email", "Enter a valid email address.");
      return;
    }
    if (phone.trim() && phone.replace(/\D/g, "").length < 7) {
      showValidation("Invalid phone number", "Enter a valid phone number.");
      return;
    }

    setSaving(true);
    try {
      const profile = await updateAccountProfile({
        fullName: name.trim(),
        emailAddress: email.trim(),
        mobileNumber: phone.trim() || undefined,
      });
      setName(profile.fullName);
      setEmail(profile.emailAddress);
      setPhone(profile.mobileNumber ?? "");
      await updateAccountIdentity({
        emailAddress: profile.emailAddress,
        fullName: profile.fullName,
      });
      showSaved("Profile updated successfully.");
    } catch (error) {
      showApiError("Unable to update profile", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsCard style={styles.profileCard}>
        <Image resizeMode="cover" source={ownerProfile} style={styles.avatar} />
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileRole}>{role}</Text>
        </View>
      </SettingsCard>
      <SettingsSectionTitle subtitle="Used for account access and staff identification.">
        Personal details
      </SettingsSectionTitle>
      <SettingsCard style={styles.formCard}>
        <SettingsField label="Full Name" onChangeText={setName} value={name} />
        <SettingsField
          keyboardType="email-address"
          label="Email Address"
          onChangeText={setEmail}
          value={email}
        />
        <SettingsField
          keyboardType="phone-pad"
          label="Phone Number"
          onChangeText={setPhone}
          value={phone}
        />
        <SettingsField
          editable={false}
          label="Role"
          onChangeText={() => undefined}
          value={role}
        />
        <SettingsField
          editable={false}
          label="Account Status"
          onChangeText={() => undefined}
          value={status}
        />
      </SettingsCard>
      <PrimaryButton
        disabled={saving}
        icon="checkmark-circle-outline"
        label={saving ? "Saving..." : "Save Changes"}
        loading={saving}
        onPress={() => void saveProfile()}
      />
    </>
  );
}

function ChangePasswordPage() {
  const { logOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const updatePassword = async () => {
    if (!currentPassword) {
      showValidation(
        "Current password required",
        "Current password is required.",
      );
      return;
    }
    if (!newPassword) {
      showValidation(
        "New password required",
        "New password must contain at least 8 characters.",
      );
      return;
    }
    if (!confirmPassword) {
      showValidation("Confirm your password", "Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      showValidation("Password is too short", "Use at least 8 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      showValidation(
        "Choose a different password",
        "New password must be different from the current password.",
      );
      return;
    }
    if (newPassword !== confirmPassword) {
      showValidation(
        "Passwords do not match",
        "Re-enter the new password confirmation.",
      );
      return;
    }
    setSaving(true);
    try {
      await changeAccountPassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await logOut();
    } catch (error) {
      showApiError("Unable to update password", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <InlineNotice>
        Use at least 8 characters with a mix of letters and numbers.
      </InlineNotice>
      <SettingsCard style={styles.formCard}>
        <SettingsField
          label="Current Password"
          onChangeText={setCurrentPassword}
          placeholder="Enter current password"
          secureTextEntry
          value={currentPassword}
        />
        <SettingsField
          label="New Password"
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          secureTextEntry
          value={newPassword}
        />
        <SettingsField
          label="Confirm New Password"
          onChangeText={setConfirmPassword}
          placeholder="Re-enter new password"
          secureTextEntry
          value={confirmPassword}
        />
      </SettingsCard>
      <PrimaryButton
        disabled={saving}
        icon="lock-closed-outline"
        label={saving ? "Updating..." : "Update Password"}
        loading={saving}
        onPress={() => void updatePassword()}
      />
    </>
  );
}

function NotificationPreferencesPage() {
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    bookingSms: true,
    bookingEmail: true,
    statusSms: true,
    statusEmail: true,
    receiptEmail: true,
  });

  const update = (key: keyof typeof preferences) => (value: boolean) =>
    setPreferences((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => {
        setPreferences((current) => ({
          ...current,
          bookingSms:
            settings.isSmsBookingReceivedEnabled &&
            settings.isSmsBookingConfirmedEnabled,
          bookingEmail: settings.isEmailBookingConfirmedEnabled,
          statusSms:
            settings.isSmsPickedUpEnabled &&
            settings.isSmsReadyForDeliveryEnabled &&
            settings.isSmsCompletedEnabled,
          statusEmail: settings.isEmailCompletedEnabled,
          receiptEmail: settings.isEmailReceiptEnabled,
        }));
      })
      .catch((error: unknown) =>
        showApiError("Unable to load preferences", error),
      );
  }, []);

  const savePreferences = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateNotificationSettings({
        isSmsBookingReceivedEnabled: preferences.bookingSms,
        isSmsBookingConfirmedEnabled: preferences.bookingSms,
        isSmsPickedUpEnabled: preferences.statusSms,
        isSmsReadyForDeliveryEnabled: preferences.statusSms,
        isSmsCompletedEnabled: preferences.statusSms,
        isEmailBookingConfirmedEnabled: preferences.bookingEmail,
        isEmailReceiptEnabled: preferences.receiptEmail,
        isEmailCompletedEnabled: preferences.statusEmail,
      });
      showSaved("Notification preferences saved.");
    } catch (error) {
      showApiError("Unable to save preferences", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsSectionTitle subtitle="Updates automatically sent to customers.">
        Customer Notifications
      </SettingsSectionTitle>
      <SettingsCard>
        <ToggleRow
          description="Send confirmation after a booking is accepted"
          icon="chatbubble-outline"
          onValueChange={update("bookingSms")}
          title="Booking Confirmation by SMS"
          value={preferences.bookingSms}
        />
        <ToggleRow
          description="Send confirmation when a customer email is available"
          icon="mail-outline"
          onValueChange={update("bookingEmail")}
          title="Booking Confirmation by Email"
          value={preferences.bookingEmail}
        />
        <ToggleRow
          description="Send updates as the laundry order progresses"
          icon="chatbubble-ellipses-outline"
          onValueChange={update("statusSms")}
          title="Status Updates by SMS"
          value={preferences.statusSms}
        />
        <ToggleRow
          description="Email updates when a customer email is available"
          icon="mail-unread-outline"
          onValueChange={update("statusEmail")}
          title="Status Updates by Email"
          value={preferences.statusEmail}
        />
        <ToggleRow
          description="Email the receipt when an address is available"
          icon="document-text-outline"
          isLast
          onValueChange={update("receiptEmail")}
          title="Digital Receipt by Email"
          value={preferences.receiptEmail}
        />
      </SettingsCard>
      <InlineNotice>
        Email notifications are sent only when the customer provided an email
        address.
      </InlineNotice>
      <PrimaryButton
        disabled={saving}
        label={saving ? "Saving..." : "Save Preferences"}
        loading={saving}
        onPress={() => void savePreferences()}
      />
    </>
  );
}

function BusinessInformationPage() {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState<string>(settingsDefaults.business.name);
  const [address, setAddress] = useState<string>(
    settingsDefaults.business.addressLine,
  );
  const [phone, setPhone] = useState<string>(settingsDefaults.business.phone);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => {
        setName(settings.businessName);
        setPhone(settings.phoneNumber);
        setAddress(settings.address);
        setLogoUrl(settings.logoUrl);
      })
      .catch((error: unknown) =>
        showApiError("Unable to load business information", error),
      );
  }, []);

  const saveBusiness = async () => {
    if (saving) return;
    if (!name.trim() || !phone.trim() || !address.trim()) {
      showValidation(
        "Required information",
        "Business name, contact number, and address are required.",
      );
      return;
    }

    setSaving(true);
    try {
      await updateBusinessProfile({
        businessName: name.trim(),
        logoUrl,
        phoneNumber: phone.trim(),
        address: address.trim(),
      });
      showSaved("Business information updated.");
    } catch (error) {
      showApiError("Unable to update business information", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsCard style={styles.logoCard}>
        <Image resizeMode="cover" source={logo} style={styles.businessLogo} />
        <View style={styles.logoCopy}>
          <Text style={styles.logoTitle}>Business Logo</Text>
          <Text style={styles.logoSubtitle}>
            Managed by the application deployment
          </Text>
        </View>
      </SettingsCard>
      <SettingsSectionTitle subtitle="Keep customer-facing information current.">
        Business profile
      </SettingsSectionTitle>
      <SettingsCard style={styles.formCard}>
        <SettingsField
          label="Business Name"
          onChangeText={setName}
          value={name}
        />
        <SettingsField
          keyboardType="phone-pad"
          label="Contact Number"
          onChangeText={setPhone}
          value={phone}
        />
        <SettingsField
          label="Address"
          onChangeText={setAddress}
          value={address}
        />
      </SettingsCard>
      <PrimaryButton
        disabled={saving}
        icon="save-outline"
        label={saving ? "Saving..." : "Save Business Information"}
        loading={saving}
        onPress={() => void saveBusiness()}
      />
    </>
  );
}

function ServicesPricingPage() {
  const [services, setServices] = useState<ServiceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [serviceEditor, setServiceEditor] = useState<
    ServiceSetting | "new" | null
  >(null);

  useEffect(() => {
    void getLaundryServices()
      .then(setServices)
      .catch((error: unknown) => showApiError("Unable to load services", error))
      .finally(() => setLoading(false));
  }, []);

  const setServiceLocally = (serviceId: string, enabled: boolean) =>
    setServices((current) =>
      current.map((service) =>
        service.id === serviceId ? { ...service, isActive: enabled } : service,
      ),
    );

  const toggleService = async (serviceId: string, enabled: boolean) => {
    setServiceLocally(serviceId, enabled);
    try {
      const updated = await setLaundryServiceAvailability(serviceId, enabled);
      setServices((current) =>
        current.map((service) =>
          service.id === serviceId ? updated : service,
        ),
      );
    } catch (error) {
      setServiceLocally(serviceId, !enabled);
      showApiError("Unable to update service", error);
    }
  };

  const saveService = async (
    input: Parameters<typeof createLaundryService>[0],
  ) => {
    if (serviceEditor === null) return;
    if (serviceEditor === "new") {
      const created = await createLaundryService(input);
      setServices((current) =>
        [...current, created].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      showSaved("Service created.");
      return;
    }

    const updated = await updateLaundryService(serviceEditor.id, input);
    setServices((current) =>
      current
        .map((service) => (service.id === updated.id ? updated : service))
        .sort((left, right) => left.name.localeCompare(right.name)),
    );
    showSaved("Service updated.");
  };

  return (
    <>
      <View style={styles.titleActionRow}>
        <SettingsSectionTitle subtitle={`Total Services: ${services.length}`}>
          Laundry Services
        </SettingsSectionTitle>
        <Pressable
          onPress={() => setServiceEditor("new")}
          style={styles.addButton}
        >
          <Ionicons color={colors.surface} name="add" size={18} />
          <Text style={styles.addButtonLabel}>Add Service</Text>
        </Pressable>
      </View>
      <SettingsCard>
        {loading ? (
          <Text style={styles.emptyState}>Loading services...</Text>
        ) : null}
        {!loading && services.length === 0 ? (
          <Text style={styles.emptyState}>
            No services are configured. Add the first service to begin.
          </Text>
        ) : null}
        {services.map((service, index) => (
          <View
            key={service.id}
            style={[
              styles.serviceRow,
              index < services.length - 1 && styles.divider,
            ]}
          >
            <View style={styles.serviceIcon}>
              <Ionicons color={colors.navy} name={service.icon} size={21} />
            </View>
            <View style={styles.serviceCopy}>
              <Text numberOfLines={1} style={styles.serviceName}>
                {service.name}
              </Text>
              <Text numberOfLines={2} style={styles.serviceDetail}>
                {service.description}
              </Text>
              <Text style={styles.servicePrice}>
                {service.price} · {service.unit}
              </Text>
            </View>
            <View style={styles.serviceActions}>
              <Switch
                onValueChange={(enabled) =>
                  void toggleService(service.id, enabled)
                }
                thumbColor={colors.surface}
                trackColor={{ false: "#D8DEE7", true: colors.navy }}
                value={service.isActive}
              />
              <Pressable
                onPress={() => setServiceEditor(service)}
                style={styles.editIconButton}
              >
                <Ionicons color={colors.navy} name="create-outline" size={18} />
              </Pressable>
            </View>
          </View>
        ))}
      </SettingsCard>
      <InlineNotice>
        Disabled services remain in your records but will not appear as
        available booking options.
      </InlineNotice>
      {serviceEditor !== null ? (
        <ServiceEditorModal
          key={serviceEditor === "new" ? "new" : serviceEditor.id}
          onClose={() => setServiceEditor(null)}
          onSave={saveService}
          service={serviceEditor === "new" ? undefined : serviceEditor}
        />
      ) : null}
    </>
  );
}

function OperatingHoursPage() {
  const [saving, setSaving] = useState(false);
  const [days, setDays] = useState<OperatingDay[]>(operatingDays);
  const [windows, setWindows] = useState<PickupWindowSetting[]>(pickupWindows);

  const toggleDay = (dayName: string, open: boolean) =>
    setDays((current) =>
      current.map((day) => (day.day === dayName ? { ...day, open } : day)),
    );

  const updateDayHours = (dayName: string, hours: string) =>
    setDays((current) =>
      current.map((day) => (day.day === dayName ? { ...day, hours } : day)),
    );

  const toggleWindow = (windowId: string, enabled: boolean) =>
    setWindows((current) =>
      current.map((window) =>
        window.id === windowId ? { ...window, enabled } : window,
      ),
    );

  const updateWindowHours = (windowId: string, hours: string) =>
    setWindows((current) =>
      current.map((window) =>
        window.id === windowId ? { ...window, hours } : window,
      ),
    );

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => {
        setDays(getOperatingDays(settings, operatingDays));
        setWindows(getPickupWindows(settings, pickupWindows));
      })
      .catch((error: unknown) =>
        showApiError("Unable to load operating hours", error),
      );
  }, []);

  const saveSchedules = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateSchedules(days, windows);
      showSaved("Operating hours updated.");
    } catch (error) {
      showApiError("Unable to update operating hours", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <SettingsSectionTitle subtitle="Enter a readable opening and closing time for each active day.">
        Business Hours
      </SettingsSectionTitle>
      <SettingsCard>
        {days.map((day, index) => (
          <View
            key={day.day}
            style={[styles.hoursRow, index < days.length - 1 && styles.divider]}
          >
            <Switch
              onValueChange={(open) => toggleDay(day.day, open)}
              thumbColor={colors.surface}
              trackColor={{ false: "#D8DEE7", true: colors.navy }}
              value={day.open}
            />
            <Text style={styles.dayName}>{day.day}</Text>
            <TextInput
              accessibilityLabel={`${day.day} operating hours`}
              editable={day.open}
              onChangeText={(hours) => updateDayHours(day.day, hours)}
              placeholder="8:00 AM – 7:00 PM"
              placeholderTextColor={colors.textMuted}
              style={[styles.timeInput, !day.open && styles.disabled]}
              value={day.open ? day.hours : "Closed"}
            />
          </View>
        ))}
      </SettingsCard>
      <SettingsSectionTitle subtitle="Customer pickup and delivery availability.">
        Pickup & Delivery Windows
      </SettingsSectionTitle>
      <SettingsCard>
        {windows.map((window, index) => (
          <View
            key={window.id}
            style={[
              styles.scheduleCard,
              index < windows.length - 1 && styles.divider,
            ]}
          >
            <View style={styles.scheduleIcon}>
              <Ionicons color={colors.navy} name="car-outline" size={24} />
            </View>
            <View style={styles.scheduleCopy}>
              <Text style={styles.scheduleTitle}>{window.label}</Text>
              <TextInput
                accessibilityLabel={`${window.label} hours`}
                editable={window.enabled}
                onChangeText={(hours) => updateWindowHours(window.id, hours)}
                placeholder="9:00 AM – 12:00 PM"
                placeholderTextColor={colors.textMuted}
                style={[
                  styles.scheduleTimeInput,
                  !window.enabled && styles.disabled,
                ]}
                value={window.hours}
              />
            </View>
            <Switch
              onValueChange={(enabled) => toggleWindow(window.id, enabled)}
              thumbColor={colors.surface}
              trackColor={{ false: "#D8DEE7", true: colors.navy }}
              value={window.enabled}
            />
          </View>
        ))}
      </SettingsCard>
      <PrimaryButton
        disabled={saving}
        label={saving ? "Saving..." : "Save Operating Hours"}
        loading={saving}
        onPress={() => void saveSchedules()}
      />
    </>
  );
}

function PaymentMethodsPage() {
  const [saving, setSaving] = useState(false);
  const [cod, setCod] = useState<boolean>(
    settingsDefaults.paymentMethods.cashOnDelivery,
  );
  const [online, setOnline] = useState<boolean>(
    settingsDefaults.paymentMethods.qrOnlinePayment,
  );

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => {
        setCod(settings.isCashOnDeliveryEnabled);
        setOnline(settings.isQrCodeOnlinePaymentEnabled);
      })
      .catch((error: unknown) =>
        showApiError("Unable to load payment methods", error),
      );
  }, []);

  const savePaymentMethods = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updatePaymentMethods({
        isCashOnDeliveryEnabled: cod,
        isQrCodeOnlinePaymentEnabled: online,
      });
      showSaved("Payment methods updated.");
    } catch (error) {
      showApiError("Unable to update payment methods", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <InlineNotice>
        Cash payments can be confirmed manually. Online payments are marked paid
        only after a verified provider callback.
      </InlineNotice>
      <SettingsSectionTitle subtitle="Methods customers can choose at booking.">
        Accepted payments
      </SettingsSectionTitle>
      <SettingsCard>
        <ToggleRow
          description="The customer pays in cash when the order is delivered or claimed"
          icon="cash-outline"
          onValueChange={setCod}
          title="Cash on Delivery / Pay on Claim"
          value={cod}
        />
        <ToggleRow
          description="The customer pays through a generated QR code or payment link"
          icon="qr-code-outline"
          isLast
          onValueChange={setOnline}
          title="QR Code Online Payment"
          value={online}
        />
      </SettingsCard>
      <InlineNotice>
        Staff confirms cash payments using “Mark Paid & Send Receipt.” Online
        payments are confirmed automatically by the provider.
      </InlineNotice>
      {online ? (
        <InlineNotice>
          Provider credentials and QR assets must be configured securely on the
          backend deployment before this option is offered to customers.
        </InlineNotice>
      ) : null}
      <PrimaryButton
        disabled={saving}
        label={saving ? "Saving..." : "Save Payment Methods"}
        loading={saving}
        onPress={() => void savePaymentMethods()}
      />
    </>
  );
}

function PickupServiceAreaPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [radiusKm, setRadiusKm] = useState("15");
  const [accuracyMeters, setAccuracyMeters] = useState<number | null>(null);
  const [isConfigured, setIsConfigured] = useState(false);

  const applySettings = (settings: BusinessSettingsDto) => {
    // Tolerates an older API that predates these fields: they arrive undefined
    // rather than null, which would otherwise render "undefined" in the inputs.
    const latitudeValue = settings.pickupOriginLatitude ?? null;
    const longitudeValue = settings.pickupOriginLongitude ?? null;
    const radiusValue = settings.pickupServiceRadiusKm ?? 15;

    setLatitude(latitudeValue === null ? "" : String(latitudeValue));
    setLongitude(longitudeValue === null ? "" : String(longitudeValue));
    setRadiusKm(String(radiusValue));
    setIsConfigured(Boolean(settings.hasPickupServiceArea));
  };

  useEffect(() => {
    void getBusinessSettings()
      .then(applySettings)
      .catch((error: unknown) =>
        showApiError("Unable to load pickup service area", error),
      )
      .finally(() => setLoading(false));
  }, []);

  // Not named "useCurrentLocation": a use* prefix marks a React hook.
  const captureShopLocation = async () => {
    if (locating) return;
    setLocating(true);
    try {
      const position = await captureCurrentLocation();
      // Six decimals is roughly 0.1 m, far finer than a pickup ever needs.
      setLatitude(position.latitude.toFixed(6));
      setLongitude(position.longitude.toFixed(6));
      setAccuracyMeters(position.accuracyMeters);
      showSaved("Coordinates captured. Review, then save.");
    } catch (error) {
      showApiError("Unable to read your location", error);
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    if (saving) return;

    const parsedRadius = Number(radiusKm.trim());
    if (!Number.isFinite(parsedRadius) || parsedRadius <= 0) {
      showValidation(
        "Radius required",
        "Enter a pickup radius in kilometres, greater than zero.",
      );
      return;
    }

    const hasLatitude = latitude.trim().length > 0;
    const hasLongitude = longitude.trim().length > 0;

    if (hasLatitude !== hasLongitude) {
      showValidation(
        "Coordinates incomplete",
        "Enter both latitude and longitude, or clear both to turn checking off.",
      );
      return;
    }

    const parsedLatitude = hasLatitude ? Number(latitude.trim()) : null;
    const parsedLongitude = hasLongitude ? Number(longitude.trim()) : null;

    if (parsedLatitude !== null && !Number.isFinite(parsedLatitude)) {
      showValidation("Invalid latitude", "Latitude must be a number.");
      return;
    }
    if (parsedLongitude !== null && !Number.isFinite(parsedLongitude)) {
      showValidation("Invalid longitude", "Longitude must be a number.");
      return;
    }
    if (
      parsedLatitude !== null &&
      (parsedLatitude < -90 || parsedLatitude > 90)
    ) {
      showValidation(
        "Invalid latitude",
        "Latitude must be between -90 and 90.",
      );
      return;
    }
    if (
      parsedLongitude !== null &&
      (parsedLongitude < -180 || parsedLongitude > 180)
    ) {
      showValidation(
        "Invalid longitude",
        "Longitude must be between -180 and 180.",
      );
      return;
    }

    setSaving(true);
    try {
      const updated = await updatePickupServiceArea({
        originLatitude: parsedLatitude,
        originLongitude: parsedLongitude,
        radiusKm: parsedRadius,
      });
      applySettings(updated);
      showSaved(
        updated.hasPickupServiceArea
          ? "Pickup service area saved."
          : "Pickup area checking turned off.",
      );
    } catch (error) {
      showApiError("Unable to save pickup service area", error);
    } finally {
      setSaving(false);
    }
  };

  const clearArea = async () => {
    setLatitude("");
    setLongitude("");
    setAccuracyMeters(null);
    showSaved("Coordinates cleared. Save to turn checking off.");
  };

  if (loading) {
    return (
      <SettingsCard style={styles.formCard}>
        <ActivityIndicator color={colors.navy} />
      </SettingsCard>
    );
  }

  return (
    <>
      <SettingsCard style={styles.statusCard}>
        <View
          style={[
            styles.statusIcon,
            isConfigured ? styles.statusIconOn : styles.statusIconOff,
          ]}
        >
          <Ionicons
            color={isConfigured ? colors.success : colors.goldText}
            name={
              isConfigured ? "checkmark-circle-outline" : "alert-circle-outline"
            }
            size={22}
          />
        </View>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>
            {isConfigured ? "Pickup area is active" : "Pickup area is off"}
          </Text>
          <Text style={styles.statusSubtitle}>
            {isConfigured
              ? `Bookings farther than ${radiusKm} km from the shop are refused.`
              : "Every pickup location is accepted until you set the shop coordinates."}
          </Text>
        </View>
      </SettingsCard>

      <SettingsSectionTitle subtitle="Stand at the shop and tap the button, or type the coordinates.">
        Shop location
      </SettingsSectionTitle>
      <SettingsCard style={styles.formCard}>
        <SettingsField
          keyboardType="numbers-and-punctuation"
          label="Latitude"
          onChangeText={setLatitude}
          placeholder="9.238178"
          value={latitude}
        />
        <SettingsField
          keyboardType="numbers-and-punctuation"
          label="Longitude"
          onChangeText={setLongitude}
          placeholder="125.962452"
          value={longitude}
        />
        {accuracyMeters !== null ? (
          <Text style={styles.helperText}>
            Captured with about {accuracyMeters} m accuracy.
          </Text>
        ) : null}
        <SecondaryButton
          disabled={locating}
          icon="locate-outline"
          label={locating ? "Reading location..." : "Use my current location"}
          loading={locating}
          onPress={() => void captureShopLocation()}
        />
      </SettingsCard>

      <SettingsSectionTitle subtitle="Straight-line distance from the shop.">
        Pickup reach
      </SettingsSectionTitle>
      <SettingsCard style={styles.formCard}>
        <SettingsField
          keyboardType="decimal-pad"
          label="Maximum radius (km)"
          onChangeText={setRadiusKm}
          placeholder="15"
          value={radiusKm}
        />
      </SettingsCard>

      <InlineNotice>
        Customers are checked by map coordinates, not by their written address.
        A booking with no map pin is always accepted so staff can confirm it by
        phone.
      </InlineNotice>

      <PrimaryButton
        disabled={saving}
        icon="save-outline"
        label={saving ? "Saving..." : "Save Pickup Service Area"}
        loading={saving}
        onPress={() => void save()}
      />

      {latitude.trim() || longitude.trim() ? (
        <SecondaryButton
          icon="close-circle-outline"
          label="Clear shop coordinates"
          onPress={() => void clearArea()}
        />
      ) : null}
    </>
  );
}

const frequentlyAskedQuestions = [
  {
    id: "confirm",
    question: "How do I confirm a new booking?",
    answer:
      "Open Bookings, select a new request, review the order, and tap Confirm Order.",
  },
  {
    id: "pickup",
    question: "How do I mark an order as picked up?",
    answer:
      "Open Pickup, select the scheduled customer, and tap Mark Picked Up.",
  },
  {
    id: "status",
    question: "How do I update the laundry status?",
    answer:
      "Open the booking details and move the order through Confirmed, In Process, Ready, and Completed.",
  },
  {
    id: "cash",
    question: "How do I confirm a cash payment?",
    answer:
      "For cash orders, use Mark Paid & Send Receipt after receiving the payment.",
  },
  {
    id: "receipt",
    question: "How do I send a digital receipt?",
    answer:
      "Open the order’s receipt and customer-update flow, then send the receipt link by SMS or email.",
  },
  {
    id: "prices",
    question: "How do I change service prices?",
    answer:
      "Open Settings, choose Services & Pricing, select the service, and tap Edit.",
  },
];

function HelpCenterPage() {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(
    "confirm",
  );

  return (
    <>
      <SettingsCard style={styles.helpHero}>
        <View style={styles.helpHeroIcon}>
          <Ionicons color={colors.navy} name="headset-outline" size={30} />
        </View>
        <View style={styles.helpHeroCopy}>
          <Text style={styles.helpHeroTitle}>Find answers and get support</Text>
          <Text style={styles.helpHeroSubtitle}>
            Guidance for the Engr. Spin Owner app.
          </Text>
        </View>
      </SettingsCard>
      <InlineNotice>
        {settingsDefaults.app.supportContact}. The in-app guide remains
        available below.
      </InlineNotice>
      <SettingsSectionTitle>Frequently Asked Questions</SettingsSectionTitle>
      <SettingsCard>
        {frequentlyAskedQuestions.map((faq, index) => {
          const expanded = expandedQuestion === faq.id;
          return (
            <Pressable
              key={faq.id}
              onPress={() => setExpandedQuestion(expanded ? null : faq.id)}
              style={[
                styles.faqRow,
                index < frequentlyAskedQuestions.length - 1 && styles.divider,
              ]}
            >
              <View style={styles.faqHeading}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  color={colors.textSecondary}
                  name={expanded ? "chevron-up" : "chevron-down"}
                  size={18}
                />
              </View>
              {expanded ? (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </SettingsCard>
    </>
  );
}

interface LegalSection {
  heading: string;
  body: string;
}

function LegalDocument({
  intro,
  notice,
  sections,
}: {
  intro: string;
  notice: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <InlineNotice>{notice}</InlineNotice>
      <SettingsCard style={styles.documentCard}>
        <Text style={styles.documentIntro}>{intro}</Text>
        {sections.map((section, index) => (
          <View
            key={section.heading}
            style={[
              styles.documentSection,
              index > 0 && styles.documentDivider,
            ]}
          >
            <Text style={styles.documentHeading}>{section.heading}</Text>
            <Text style={styles.documentBody}>{section.body}</Text>
          </View>
        ))}
      </SettingsCard>
    </>
  );
}

function TermsPage() {
  return (
    <LegalDocument
      intro="Terms for authorized use of the Engr. Spin Owner app."
      notice="Draft content for the application interface. Final legal text requires review before production release."
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: "By using the Engr. Spin Owner app, authorized users agree to follow these terms and the business’s operating policies.",
        },
        {
          heading: "2. Authorized Account Use",
          body: "The owner is responsible for protecting account credentials and for activity performed through the account.",
        },
        {
          heading: "3. Booking and Order Management",
          body: "The app supports customer bookings, pickup schedules, order-status updates, payment tracking, and digital receipts.",
        },
        {
          heading: "4. Payments and Receipts",
          body: "Cash payments must be confirmed by authorized staff. Supported online payments are updated through the configured payment provider.",
        },
        {
          heading: "5. Service Information",
          body: "The business is responsible for keeping service descriptions, prices, schedules, and payment options accurate.",
        },
        {
          heading: "6. Acceptable Use",
          body: "The app must not be used for fraudulent activity, unauthorized access, or misuse of customer information.",
        },
        {
          heading: "7. Availability and Changes",
          body: "Features may be updated, improved, or temporarily unavailable during maintenance.",
        },
        {
          heading: "8. Contact",
          body: "Contact the configured support channel for questions about these terms.",
        },
      ]}
    />
  );
}

function PrivacyPage() {
  return (
    <LegalDocument
      intro="How business and customer information is handled inside the owner app."
      notice="Draft content for the application interface. Final privacy wording requires review before production release."
      sections={[
        {
          heading: "1. Information Collected",
          body: "The system may store owner account details, customer contact information, booking details, service selections, addresses, payment status, and receipt records.",
        },
        {
          heading: "2. How Information Is Used",
          body: "Information is used to manage bookings, schedule pickups and deliveries, update order status, process payments, send notifications, generate receipts, and prepare business reports.",
        },
        {
          heading: "3. Customer Notifications",
          body: "SMS and email messages are sent only for operational updates such as booking confirmation, order progress, payment instructions, and digital receipts.",
        },
        {
          heading: "4. Information Sharing",
          body: "Information may be shared only with service providers needed to operate features such as hosting, notifications, and online payment processing.",
        },
        {
          heading: "5. Data Security",
          body: "Reasonable safeguards should be used to protect account and customer information from unauthorized access.",
        },
        {
          heading: "6. Data Retention",
          body: "Business and order records may be retained as needed for operations, reporting, customer support, and applicable record-keeping requirements.",
        },
        {
          heading: "7. User Responsibilities",
          body: "Authorized users must keep account credentials secure and access customer information only for legitimate business purposes.",
        },
        {
          heading: "8. Contact",
          body: "Privacy questions should be sent through the configured support channel.",
        },
      ]}
    />
  );
}

function AboutAppPage() {
  return (
    <>
      <SettingsCard style={styles.aboutHero}>
        <Image resizeMode="cover" source={logo} style={styles.aboutLogo} />
        <Text style={styles.aboutName}>{settingsDefaults.app.name}</Text>
        <Text style={styles.aboutVersion}>
          Version {settingsDefaults.app.version}
        </Text>
        <Text style={styles.aboutTagline}>{settingsDefaults.app.tagline}</Text>
        <Text style={styles.aboutDescription}>
          Engr. Spin Owner is a laundry booking and operations app for managing
          customer orders, pickup schedules, order tracking, payments, digital
          receipts, and business reports.
        </Text>
      </SettingsCard>
      <SettingsSectionTitle>Key Features</SettingsSectionTitle>
      <SettingsCard style={styles.featuresCard}>
        {[
          ["globe-outline", "Online Booking"],
          ["car-outline", "Pickup Scheduling"],
          ["navigate-outline", "Order Tracking"],
          ["people-outline", "Staff Operations"],
          ["receipt-outline", "Digital Receipts"],
          ["bar-chart-outline", "Daily Reports"],
        ].map(([icon, label]) => (
          <View key={label} style={styles.featureItem}>
            <Ionicons
              color={colors.navy}
              name={icon as keyof typeof Ionicons.glyphMap}
              size={19}
            />
            <Text style={styles.featureLabel}>{label}</Text>
          </View>
        ))}
      </SettingsCard>
      <SettingsCard>
        <InfoRow
          icon="business-outline"
          label="Business"
          value={settingsDefaults.business.name}
        />
        <InfoRow
          icon="construct-outline"
          label="Build"
          value={settingsDefaults.app.buildNumber}
        />
        <InfoRow
          icon="flask-outline"
          label="Environment"
          value={settingsDefaults.app.environment}
        />
        <InfoRow
          icon="mail-outline"
          isLast
          label="Support"
          value={settingsDefaults.app.supportContact}
        />
      </SettingsCard>
      <Text style={styles.copyright}>
        © 2026 {settingsDefaults.business.name}. All rights reserved.
      </Text>
    </>
  );
}

function InfoRow({
  icon,
  isLast,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  isLast?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.infoRow, !isLast && styles.divider]}>
      <Ionicons color={colors.navy} name={icon} size={20} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.infoValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  statusIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  statusIconOn: { backgroundColor: colors.greenSoft },
  statusIconOff: { backgroundColor: colors.surfaceGoldSoft },
  statusCopy: { flex: 1, minWidth: 0 },
  statusTitle: {
    color: colors.navy,
    fontSize: 14.5,
    fontWeight: "700",
    lineHeight: 19,
  },
  statusSubtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 3,
  },
  helperText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  aboutDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 12,
    maxWidth: 285,
    textAlign: "center",
  },
  aboutHero: { alignItems: "center", padding: spacing.xl },
  aboutLogo: { borderRadius: 40, height: 80, width: 80 },
  aboutName: {
    color: colors.navy,
    fontSize: 19,
    fontWeight: "700",
    lineHeight: 24,
    marginTop: 14,
    textAlign: "center",
  },
  aboutTagline: {
    color: colors.goldText,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 8,
    textAlign: "center",
  },
  aboutVersion: {
    color: colors.goldText,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 3,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  addButtonLabel: { color: colors.surface, fontSize: 13, fontWeight: "700" },
  avatar: { borderRadius: 32, height: 64, width: 64 },
  businessLogo: { borderRadius: 27, height: 54, width: 54 },
  copyright: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: "center",
  },
  dayName: {
    color: colors.navy,
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 18,
    minWidth: 0,
  },
  disabled: { opacity: 0.52 },
  divider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  documentBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 5,
  },
  documentCard: { padding: spacing.lg },
  documentDivider: {
    borderTopColor: colors.divider,
    borderTopWidth: 1,
    paddingTop: 16,
  },
  documentHeading: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  documentIntro: { color: colors.neutralText, fontSize: 14, lineHeight: 21 },
  documentSection: { marginTop: 18 },
  editIconButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  faqAnswer: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 8,
    paddingRight: 22,
  },
  faqHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  faqQuestion: {
    color: colors.navy,
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    lineHeight: 19,
  },
  faqRow: { minHeight: 58, paddingHorizontal: spacing.md, paddingVertical: 14 },
  featureItem: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.md,
    flexBasis: "47%",
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 12,
  },
  featureLabel: {
    color: colors.navy,
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
  },
  featuresCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: spacing.md,
  },
  formCard: { gap: 14, padding: spacing.md },
  helpCopy: { flex: 1, minWidth: 0 },
  helpHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
  },
  helpHeroCopy: { flex: 1, minWidth: 0 },
  helpHeroIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 27,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  helpHeroSubtitle: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 3,
  },
  helpHeroTitle: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  helpIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 11,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  helpRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 72,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  helpSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  helpTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 18,
  },
  hoursRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    minHeight: 62,
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  infoLabel: {
    color: colors.neutralText,
    fontSize: 13,
    fontWeight: "600",
    width: 68,
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 62,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  infoValue: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: "right",
  },
  logoCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  logoCopy: { flex: 1, minWidth: 0 },
  logoSubtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  logoTitle: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  outlineButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  outlineButtonLabel: { color: colors.navy, fontSize: 12.5, fontWeight: "600" },
  paymentActionButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flex: 1,
    gap: 5,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 6,
  },
  paymentActionLabel: {
    color: colors.navy,
    fontSize: 11.5,
    fontWeight: "600",
    lineHeight: 15,
    textAlign: "center",
  },
  paymentActions: { flexDirection: "row", gap: 8 },
  pressed: { opacity: 0.72 },
  profileCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  profileCopy: { flex: 1, minWidth: 0 },
  profileName: {
    color: colors.navy,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  profileRole: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  providerCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  providerCopy: { flex: 1, minWidth: 0 },
  providerIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  providerSubtitle: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  providerTitle: {
    color: colors.navy,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  scheduleCard: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  scheduleCopy: { flex: 1, minWidth: 0 },
  scheduleIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  scheduleTitle: {
    color: colors.navy,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  scheduleTimeInput: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
    minHeight: 30,
    padding: 0,
  },
  serviceActions: { alignItems: "center", gap: 7 },
  serviceCopy: { flex: 1, minWidth: 0 },
  serviceDetail: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  serviceIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 12,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  serviceName: {
    color: colors.navy,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 18,
  },
  servicePrice: {
    color: colors.navy,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 17,
    marginTop: 4,
  },
  serviceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 91,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  smallAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  timeInput: {
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 15,
    maxWidth: 148,
    minHeight: 38,
    paddingHorizontal: 9,
  },
  emptyState: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
    textAlign: "center",
  },
  titleActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
