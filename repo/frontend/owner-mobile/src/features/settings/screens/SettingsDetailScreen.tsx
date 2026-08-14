import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Linking,
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
import { supportConfig } from "../../../api/supportConfig";
import { refreshBusinessIdentity } from "../services/businessIdentityStore";
import {
  ImagePermissionError,
  pickImageFromLibrary,
} from "../../media/services/imagePicker";
import {
  uploadLogo,
  uploadProfilePhoto,
} from "../../media/services/mediaService";
import { setAccountPhoto } from "../../auth/services/accountPhotoStore";
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
import {
  getStaffInvitations,
  getStaffAccounts,
  setStaffAccountActive,
  type StaffAccountDto,
  inviteStaff,
  revokeStaffInvitation,
  type IssuedInvitationDto,
  type StaffInvitationDto,
  type StaffRole,
} from "../services/staffService";
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
  staff: {
    title: "Staff Accounts",
    subtitle: "Invite staff and control who can sign in",
  },
  help: { title: "Help Center", subtitle: "Find answers and get support" },
  terms: { title: "Terms of Service", subtitle: "Effective May 1, 2025" },
  privacy: {
    title: "Privacy Policy",
    subtitle: "How your business data is handled",
  },
  about: { title: "About App", subtitle: "Version and app details" },
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
      {page === "staff" ? <StaffAccountsPage /> : null}
      {page === "help" ? <HelpCenterPage /> : null}
      {page === "terms" ? <TermsPage /> : null}
      {page === "privacy" ? <PrivacyPage /> : null}
      {page === "about" ? <AboutAppPage /> : null}
    </SettingsPageScaffold>
  );
}

/**
 * Up to two letters for an avatar, from whatever name is available.
 *
 * Returns nothing for an empty name rather than a placeholder letter, so a circle that is
 * still loading stays blank instead of showing a letter that then changes.
 */
function initialsFrom(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";

  const letters =
    parts.length === 1
      ? parts[0].slice(0, 2)
      : `${parts[0][0]}${parts[parts.length - 1][0]}`;

  return letters.toUpperCase();
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
  // Deliberately empty rather than seeded with placeholders. Pre-filling meant that if the
  // profile failed to load, the form still showed a plausible-looking name and role, and
  // saving would write that placeholder over the real account.
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  // What the server last confirmed, so choosing a picture saves those details rather than
  // whatever is half-typed in the fields. It matters more here than elsewhere: changing an
  // email address invalidates its verification and sends a new code.
  const [savedProfile, setSavedProfile] = useState({
    emailAddress: "",
    fullName: "",
    mobileNumber: "",
  });

  useEffect(() => {
    void getAccountProfile()
      .then((profile) => {
        setName(profile.fullName);
        setEmail(profile.emailAddress);
        setPhone(profile.mobileNumber ?? "");
        setRole(profile.role);
        setStatus(profile.isActive ? "Active" : "Inactive");
        setPhotoUrl(profile.photoUrl ?? null);
        setSavedProfile({
          emailAddress: profile.emailAddress,
          fullName: profile.fullName,
          mobileNumber: profile.mobileNumber ?? "",
        });
        setLoaded(true);
      })
      .catch((error) => showApiError("Unable to load profile", error));
  }, []);

  const changePhoto = async () => {
    if (uploadingPhoto || saving) return;

    if (!savedProfile.emailAddress) {
      showValidation(
        "Profile not loaded",
        "Your profile has not loaded yet. Go back and reopen this page before changing your photo.",
      );
      return;
    }

    try {
      const image = await pickImageFromLibrary(true);
      // Cancelling the picker is an ordinary outcome, not a failure.
      if (!image) return;

      setUploadingPhoto(true);

      const uploaded = await uploadProfilePhoto(image);

      // Saved straight away, using the details the server already has, so one action gives
      // one result and no uploaded image is left in storage with nothing pointing at it.
      const profile = await updateAccountProfile({
        emailAddress: savedProfile.emailAddress,
        fullName: savedProfile.fullName,
        mobileNumber: savedProfile.mobileNumber || undefined,
        photoUrl: uploaded.url,
      });

      setPhotoUrl(profile.photoUrl ?? null);
      // The header shows the same face, so it is told directly rather than left stale
      // until the app restarts.
      setAccountPhoto(profile.photoUrl ?? null);
      showSaved("Profile photo updated.");
    } catch (error) {
      if (error instanceof ImagePermissionError) {
        showValidation("Photo access needed", error.message);
        return;
      }

      showApiError("Unable to change your photo", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const removePhoto = async () => {
    if (uploadingPhoto || saving || !photoUrl) return;

    setUploadingPhoto(true);
    try {
      const profile = await updateAccountProfile({
        emailAddress: savedProfile.emailAddress,
        fullName: savedProfile.fullName,
        mobileNumber: savedProfile.mobileNumber || undefined,
        photoUrl: null,
      });

      setPhotoUrl(profile.photoUrl ?? null);
      setAccountPhoto(profile.photoUrl ?? null);
      showSaved("Profile photo removed.");
    } catch (error) {
      showApiError("Unable to remove your photo", error);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const saveProfile = async () => {
    // Saving before the account is known would write an empty form over it.
    if (!loaded) {
      showValidation(
        "Profile not loaded",
        "Your profile has not loaded yet. Go back and reopen this page before saving.",
      );
      return;
    }

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
        // Sent deliberately. The API treats an absent photo as "remove it", so leaving this
        // out would delete the person's picture every time they edited their phone number.
        photoUrl,
      });
      setName(profile.fullName);
      setEmail(profile.emailAddress);
      setPhone(profile.mobileNumber ?? "");
      setPhotoUrl(profile.photoUrl ?? null);
      setSavedProfile({
        emailAddress: profile.emailAddress,
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber ?? "",
      });
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
        {/*
          The account's own picture, or its own initials.

          This was a photograph bundled with the app, so every account saw the same face:
          a staff member opening their profile was shown the owner's photo as their own.
          Initials come from the profile that has just been loaded, so the avatar is whoever
          is signed in, and nobody's likeness ships inside the binary.
        */}
        {photoUrl ? (
          <Image
            accessibilityIgnoresInvertColors
            fadeDuration={0}
            resizeMode="cover"
            source={{ uri: photoUrl }}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>{initialsFrom(name)}</Text>
          </View>
        )}
        <View style={styles.profileCopy}>
          <Text style={styles.profileName}>{name}</Text>
          <Text style={styles.profileRole}>{role}</Text>
          <View style={styles.photoActions}>
            <Pressable
              accessibilityLabel={
                photoUrl ? "Change profile photo" : "Add a profile photo"
              }
              accessibilityRole="button"
              accessibilityState={{
                busy: uploadingPhoto,
                disabled: uploadingPhoto || saving,
              }}
              disabled={uploadingPhoto || saving}
              onPress={() => void changePhoto()}
              style={({ pressed }) => [
                styles.logoAction,
                pressed && styles.logoActionPressed,
                (uploadingPhoto || saving) && styles.logoActionDisabled,
              ]}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={colors.navy} size="small" />
              ) : (
                <Ionicons color={colors.navy} name="camera-outline" size={16} />
              )}
              <Text style={styles.logoActionLabel}>
                {photoUrl ? "Change photo" : "Add photo"}
              </Text>
            </Pressable>
            {photoUrl ? (
              <Pressable
                accessibilityLabel="Remove profile photo"
                accessibilityRole="button"
                disabled={uploadingPhoto || saving}
                onPress={() => void removePhoto()}
                style={({ pressed }) => [
                  styles.photoRemove,
                  pressed && styles.logoActionPressed,
                  (uploadingPhoto || saving) && styles.logoActionDisabled,
                ]}
              >
                <Text style={styles.photoRemoveLabel}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
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
    bookingEmail: true,
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
          bookingEmail: settings.isEmailBookingConfirmedEnabled,
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
        // The shop has no SMS gateway, so these are held off rather than offered as
        // switches. They were on by default, which meant the outbox queued a text for
        // every booking and status change, the logging provider accepted it, and the
        // notification history recorded "Sent" for a message no customer ever received.
        // A log that lies is worse than no log. The fields stay in the API so a real
        // gateway can be turned on later without a migration.
        isSmsBookingReceivedEnabled: false,
        isSmsBookingConfirmedEnabled: false,
        isSmsPickedUpEnabled: false,
        isSmsReadyForDeliveryEnabled: false,
        isSmsCompletedEnabled: false,
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
      <SettingsSectionTitle subtitle="Emails automatically sent to customers.">
        Customer Notifications
      </SettingsSectionTitle>
      <SettingsCard>
        <ToggleRow
          description="Send confirmation after a booking is accepted"
          icon="mail-outline"
          onValueChange={update("bookingEmail")}
          title="Booking Confirmation"
          value={preferences.bookingEmail}
        />
        <ToggleRow
          description="Send updates as the laundry order progresses"
          icon="mail-unread-outline"
          onValueChange={update("statusEmail")}
          title="Status Updates"
          value={preferences.statusEmail}
        />
        <ToggleRow
          description="Send the receipt once the order is paid"
          icon="document-text-outline"
          isLast
          onValueChange={update("receiptEmail")}
          title="Digital Receipt"
          value={preferences.receiptEmail}
        />
      </SettingsCard>
      <InlineNotice>
        Sent only to customers who gave an email address. To reach a customer
        directly, use Call or Message on the order.
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  // Deliberately empty rather than seeded with the sample business. Pre-filling meant
  // that if the load failed the form still showed a plausible-looking name and
  // address, and saving would write that sample over the shop's real profile.
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // What the server last confirmed. Changing the logo saves immediately, and it saves
  // these rather than whatever is currently in the fields, so a half-typed business name
  // is never written to the shop's profile as a side effect of picking a picture.
  const [savedProfile, setSavedProfile] = useState({
    address: "",
    businessName: "",
    phoneNumber: "",
  });

  useEffect(() => {
    let active = true;

    void getBusinessSettings()
      .then((settings) => {
        if (!active) return;
        setName(settings.businessName);
        setPhone(settings.phoneNumber);
        setAddress(settings.address);
        setLogoUrl(settings.logoUrl);
        setSavedProfile({
          address: settings.address,
          businessName: settings.businessName,
          phoneNumber: settings.phoneNumber,
        });
        setLoaded(true);
      })
      .catch((error: unknown) => {
        if (active) showApiError("Unable to load business information", error);
      });

    return () => {
      active = false;
    };
  }, []);

  const changeLogo = async () => {
    if (uploadingLogo || saving) return;

    if (!loaded) {
      showValidation(
        "Details not loaded",
        "Your business information has not loaded yet. Pull down to retry before changing the logo.",
      );
      return;
    }

    try {
      const image = await pickImageFromLibrary(true);
      // Cancelling the picker is an ordinary outcome, not a failure.
      if (!image) return;

      setUploadingLogo(true);

      const uploaded = await uploadLogo(image);

      // Stored, but not yet the shop's logo until the profile points at it. Saved here so
      // one action is one result: no upload sitting in storage that nothing refers to.
      await updateBusinessProfile({
        address: savedProfile.address,
        businessName: savedProfile.businessName,
        logoUrl: uploaded.url,
        phoneNumber: savedProfile.phoneNumber,
      });

      setLogoUrl(uploaded.url);
      void refreshBusinessIdentity();
      showSaved("Logo updated.");
    } catch (error) {
      if (error instanceof ImagePermissionError) {
        showValidation("Photo access needed", error.message);
        return;
      }

      showApiError("Unable to change the logo", error);
    } finally {
      setUploadingLogo(false);
    }
  };

  const saveBusiness = async () => {
    if (saving) return;

    // Saving before the current details are known would replace them with whatever is
    // in an unloaded form.
    if (!loaded) {
      showValidation(
        "Details not loaded",
        "Your business information has not loaded yet. Pull down to retry before saving.",
      );
      return;
    }

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
      setSavedProfile({
        address: address.trim(),
        businessName: name.trim(),
        phoneNumber: phone.trim(),
      });
      // The header reads the name and logo from the shared store, so it is re-read here
      // rather than leaving the previous one on screen until the app restarts.
      void refreshBusinessIdentity();
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
        <Image
          fadeDuration={0}
          resizeMode="cover"
          // The shop's own logo once it has one, otherwise the mark shipped with the app.
          source={logoUrl?.trim() ? { uri: logoUrl.trim() } : logo}
          style={styles.businessLogo}
        />
        <View style={styles.logoCopy}>
          <Text style={styles.logoTitle}>Business Logo</Text>
          <Text style={styles.logoSubtitle}>
            {/* This read "Managed by the application deployment", which told the owner
                their own logo was someone else's to change — and there was no field to
                change it with, even though the API has always accepted one. */}
            {uploadingLogo
              ? "Uploading..."
              : logoUrl?.trim()
                ? "Shown in the app header and on your emails"
                : "Using the default mark"}
          </Text>
        </View>
        <Pressable
          accessibilityLabel="Change business logo"
          accessibilityRole="button"
          accessibilityState={{ busy: uploadingLogo, disabled: uploadingLogo }}
          disabled={uploadingLogo || saving}
          onPress={() => void changeLogo()}
          style={({ pressed }) => [
            styles.logoAction,
            pressed && styles.logoActionPressed,
            (uploadingLogo || saving) && styles.logoActionDisabled,
          ]}
        >
          {uploadingLogo ? (
            <ActivityIndicator color={colors.navy} size="small" />
          ) : (
            <Ionicons color={colors.navy} name="image-outline" size={16} />
          )}
          <Text style={styles.logoActionLabel}>Change</Text>
        </Pressable>
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
          keyboardType="url"
          label="Logo image link"
          onChangeText={setLogoUrl}
          placeholder="Or paste a link to an image"
          value={logoUrl ?? ""}
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
      {/* One notice, not three. This page carried the same point twice over — that cash
          is confirmed by hand and online is confirmed by the provider — and then a third
          note telling whoever reads it to configure provider credentials on the backend
          deployment, which is an instruction for whoever installs the software and means
          nothing to the person running the shop. What is left is the part the owner acts
          on: which payment they have to mark themselves. */}
      <InlineNotice>
        Cash is marked paid by you, using Mark Paid &amp; Send Receipt on the
        order. Online payments are confirmed by the provider on their own.
      </InlineNotice>
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

/**
 * Issues and manages the codes that let a new account be created.
 *
 * Registration is invitation-only after the shop's first account, so without this
 * screen the only way to add staff was to call the API by hand.
 */
function StaffAccountsPage() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<StaffRole>("Staff");
  const [inviting, setInviting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [invitations, setInvitations] = useState<StaffInvitationDto[]>([]);
  const [accounts, setAccounts] = useState<StaffAccountDto[]>([]);
  const [changingAccountId, setChangingAccountId] = useState<string | null>(
    null,
  );
  const [issued, setIssued] = useState<IssuedInvitationDto | null>(null);

  // Bumped to refetch. A token rather than a callback in the effect's dependencies,
  // because the React compiler rejects an effect that reaches straight for a state
  // setter, and the rest of this screen loads the same way.
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    getStaffInvitations()
      .then((rows) => {
        if (!active) return;
        setInvitations(rows);
        setLoadFailed(false);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadFailed(true);
        showApiError("Unable to load invitations", error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    // The accounts those invitations became. Fetched separately so a failure to read one list
    // does not blank the other.
    getStaffAccounts()
      .then((rows) => {
        if (active) setAccounts(rows);
      })
      .catch((error: unknown) => {
        if (active) showApiError("Unable to load staff accounts", error);
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const reload = () => setReloadToken((token) => token + 1);

  const issueInvitation = async () => {
    if (inviting) return;

    const address = email.trim();

    if (!address || !address.includes("@")) {
      showValidation(
        "Email address needed",
        "Enter the email address of the person you are inviting. The code only works for that address.",
      );
      return;
    }

    setInviting(true);
    try {
      const invitation = await inviteStaff({ emailAddress: address, role });

      // Held on screen rather than shown in a toast: the code is stored hashed, so
      // this is the only time it can be read. Clearing it away would mean issuing a
      // replacement.
      setIssued(invitation);
      setEmail("");
      reload();
    } catch (error) {
      showApiError("Unable to create the invitation", error);
    } finally {
      setInviting(false);
    }
  };

  const revoke = async (invitation: StaffInvitationDto) => {
    const accepted = await appDialog.confirm({
      confirmLabel: "Revoke",
      message: `The code sent to ${invitation.emailAddress} will stop working. You can issue a new one at any time.`,
      title: "Revoke this invitation?",
      tone: "warning",
    });

    if (!accepted) return;

    try {
      await revokeStaffInvitation(invitation.invitationId);
      if (issued?.invitationId === invitation.invitationId) setIssued(null);
      reload();
    } catch (error) {
      showApiError("Unable to revoke the invitation", error);
    }
  };

  /**
   * Withdraws or restores one person's access.
   *
   * Deactivating keeps the account, so the orders and receipts they recorded stay
   * attributable — it is their way in that is closed, not their history. The API refuses to
   * deactivate your own account or the last active owner, and those refusals are shown as
   * they are rather than being second-guessed here.
   */
  const changeAccountAccess = async (account: StaffAccountDto) => {
    if (changingAccountId) return;

    const withdrawing = account.isActive;

    const accepted = await appDialog.confirm({
      confirmLabel: withdrawing ? "Withdraw access" : "Restore access",
      message: withdrawing
        ? `${account.fullName} will be signed out and will not be able to sign in again. Their past orders and receipts are kept.`
        : `${account.fullName} will be able to sign in again.`,
      title: withdrawing ? "Withdraw access?" : "Restore access?",
      tone: withdrawing ? "danger" : "info",
    });

    if (!accepted) return;

    setChangingAccountId(account.id);
    try {
      await setStaffAccountActive(account.id, !account.isActive);
      showSaved(withdrawing ? "Access withdrawn." : "Access restored.");
      reload();
    } catch (error) {
      showApiError(
        withdrawing ? "Unable to withdraw access" : "Unable to restore access",
        error,
      );
    } finally {
      setChangingAccountId(null);
    }
  };

  return (
    <>
      <InlineNotice>
        Anyone creating an account needs a code you issued for their email
        address. Staff can run the day&apos;s work; only an owner can change
        prices, settings and reports.
      </InlineNotice>

      {/*
        Who can actually get in. Until now this screen only showed invitations, so an owner
        could see a pending code but not the accounts those codes became — and had no way to
        withdraw access from someone who had left.
      */}
      <SettingsSectionTitle subtitle="Withdrawing access keeps their past orders and receipts.">
        People with access
      </SettingsSectionTitle>
      <SettingsCard>
        {accounts.length === 0 ? (
          <Text style={styles.staffEmpty}>
            {loading ? "Loading accounts..." : "No accounts to show."}
          </Text>
        ) : (
          accounts.map((account, index) => (
            <View
              key={account.id}
              style={[
                styles.accountRow,
                index < accounts.length - 1 && styles.accountRowDivider,
              ]}
            >
              <View style={styles.accountCopy}>
                <Text style={styles.accountName}>{account.fullName}</Text>
                <Text style={styles.accountMeta}>
                  {account.role}
                  {account.isActive ? "" : " · Access withdrawn"}
                </Text>
                <Text style={styles.accountMeta}>{account.emailAddress}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={changingAccountId !== null}
                onPress={() => void changeAccountAccess(account)}
                style={({ pressed }) => [
                  styles.accountAction,
                  !account.isActive && styles.accountActionRestore,
                  pressed && styles.pressed,
                  changingAccountId !== null && styles.accountActionBusy,
                ]}
              >
                {changingAccountId === account.id ? (
                  <ActivityIndicator color={colors.navy} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.accountActionLabel,
                      account.isActive && styles.accountActionLabelDanger,
                    ]}
                  >
                    {account.isActive ? "Withdraw" : "Restore"}
                  </Text>
                )}
              </Pressable>
            </View>
          ))
        )}
      </SettingsCard>

      <SettingsSectionTitle subtitle="The code is shown once, so pass it on before leaving this screen.">
        Invite someone
      </SettingsSectionTitle>
      <SettingsCard style={styles.formCard}>
        <SettingsField
          keyboardType="email-address"
          label="Email address"
          onChangeText={setEmail}
          placeholder="name@example.com"
          value={email}
        />
        <View style={styles.roleRow}>
          {(["Staff", "Owner"] as StaffRole[]).map((option) => (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: role === option }}
              key={option}
              onPress={() => setRole(option)}
              style={({ pressed }) => [
                styles.roleOption,
                role === option && styles.roleOptionActive,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                color={role === option ? colors.navy : colors.textSecondary}
                name={
                  option === "Owner" ? "briefcase-outline" : "person-outline"
                }
                size={16}
              />
              <Text
                style={[
                  styles.roleLabel,
                  role === option && styles.roleLabelActive,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
        {role === "Owner" ? (
          <Text style={styles.roleWarning}>
            An owner account can change prices and see all sales.
          </Text>
        ) : null}
      </SettingsCard>
      <PrimaryButton
        disabled={inviting}
        icon="mail-outline"
        label={inviting ? "Creating..." : "Create Invitation"}
        loading={inviting}
        onPress={() => void issueInvitation()}
      />

      {issued ? (
        <>
          <SettingsSectionTitle
            subtitle={`For ${issued.emailAddress}. It will not be shown again.`}
          >
            Invitation code
          </SettingsSectionTitle>
          <SettingsCard>
            <Text selectable style={styles.inviteCode}>
              {issued.invitationCode}
            </Text>
            <Text style={styles.inviteCodeHelp}>
              They enter this on the sign-up screen along with this exact email
              address. It expires on {formatInviteDate(issued.expiresAt)}.
            </Text>
          </SettingsCard>
          <SecondaryButton label="Done" onPress={() => setIssued(null)} />
        </>
      ) : null}

      <SettingsSectionTitle subtitle="Codes that have not been used yet.">
        Pending invitations
      </SettingsSectionTitle>
      <SettingsCard>
        {loading ? (
          <Text style={styles.inviteEmpty}>Loading...</Text>
        ) : loadFailed ? (
          <Pressable
            accessibilityRole="button"
            onPress={reload}
            style={({ pressed }) => [pressed && styles.pressed]}
          >
            <Text style={styles.inviteRetry}>
              Invitations could not be loaded. Tap to try again.
            </Text>
          </Pressable>
        ) : invitations.length === 0 ? (
          <Text style={styles.inviteEmpty}>
            No invitations are waiting to be used.
          </Text>
        ) : (
          invitations.map((invitation, index) => (
            <View
              key={invitation.invitationId}
              style={[
                styles.inviteRow,
                index < invitations.length - 1 && styles.inviteRowDivider,
              ]}
            >
              <View style={styles.inviteRowCopy}>
                <Text numberOfLines={1} style={styles.inviteEmail}>
                  {invitation.emailAddress}
                </Text>
                <Text style={styles.inviteMeta}>
                  {invitation.role} · expires{" "}
                  {formatInviteDate(invitation.expiresAt)}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={`Revoke the invitation for ${invitation.emailAddress}`}
                accessibilityRole="button"
                onPress={() => void revoke(invitation)}
                style={({ pressed }) => [
                  styles.revokeButton,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.revokeLabel}>Revoke</Text>
              </Pressable>
            </View>
          ))
        )}
      </SettingsCard>
    </>
  );
}

function formatInviteDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-PH", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Opens the owner's mail app with the app and version already filled in.
 *
 * The version matters: the first thing anyone answering a support message needs to know is
 * which build the problem is on, and an owner should not have to go and find it.
 */
async function openSupportEmail() {
  const subject = encodeURIComponent(
    `${settingsDefaults.app.name} ${settingsDefaults.app.version} support`,
  );

  try {
    await Linking.openURL(`mailto:${supportConfig.email}?subject=${subject}`);
  } catch {
    // Some devices have no mail app at all, so the address is shown instead of failing
    // silently and leaving the owner with nothing to write to.
    await appDialog.notify({
      message: `This device has no email app set up. Write to ${supportConfig.email}.`,
      title: "Email unavailable",
      tone: "warning",
    });
  }
}

async function openSupportSite() {
  try {
    await Linking.openURL(supportConfig.url);
  } catch {
    await appDialog.notify({
      message: `This device could not open the help site. Visit ${supportConfig.url}.`,
      title: "Browser unavailable",
      tone: "warning",
    });
  }
}

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
            Guidance for using this app.
          </Text>
        </View>
      </SettingsCard>
      {supportConfig.isConfigured ? (
        <SettingsCard style={styles.formCard}>
          <Text style={styles.helpContactIntro}>
            If the guide below does not answer it, get in touch.
          </Text>
          {supportConfig.hasEmail ? (
            <PrimaryButton
              label="Email support"
              onPress={() => void openSupportEmail()}
            />
          ) : null}
          {supportConfig.hasUrl ? (
            <SecondaryButton
              label="Open the help site"
              onPress={() => void openSupportSite()}
            />
          ) : null}
        </SettingsCard>
      ) : (
        <InlineNotice>
          No support channel is configured for this build. The in-app guide
          below is available offline.
        </InlineNotice>
      )}
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
      intro="Terms for authorized use of this app."
      notice="These terms cover use of this app by the shop owner and any staff given an account."
      sections={[
        {
          heading: "1. Acceptance of Terms",
          body: "By using this app, authorized users agree to follow these terms and the business’s operating policies.",
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
      notice="This describes what the app stores and who can see it. It applies to the shop's own records and its customers' details."
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
  // The shop's real name, rather than the one that used to be written into the app. Falls
  // back to a plain dash while it loads or if it cannot be read, which is honest: inventing
  // a name here is how the settings screen once showed someone else's shop as the owner's.
  const [businessName, setBusinessName] = useState("—");

  useEffect(() => {
    void getBusinessSettings()
      .then((settings) => {
        if (settings.businessName.trim()) {
          setBusinessName(settings.businessName.trim());
        }
      })
      .catch(() => undefined);
  }, []);

  return (
    <>
      <SettingsCard style={styles.aboutHero}>
        <Image
          fadeDuration={0}
          resizeMode="cover"
          source={logo}
          style={styles.aboutLogo}
        />
        <Text style={styles.aboutName}>{settingsDefaults.app.name}</Text>
        <Text style={styles.aboutVersion}>
          Version {settingsDefaults.app.version}
        </Text>
        <Text style={styles.aboutTagline}>{settingsDefaults.app.tagline}</Text>
        <Text style={styles.aboutDescription}>
          {/* Named from business settings rather than compiled in, so the shop reading this
              sees itself. "your laundromat" covers the moment before settings arrive. */}
          {`The owner and staff app for ${
            businessName === "—" ? "your laundromat" : businessName
          }: customer orders, pickup schedules, order tracking, payments, digital receipts, and business reports.`}
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
      {/* Build and Environment used to sit here, reading "Managed by EAS" and "Not set".
          Both are notes to whoever ships the app rather than anything the owner of a
          laundromat can use, and "Not set" reads like something is broken. The version is
          already shown above, which is the one build detail worth having when reporting a
          problem. The business name is read from the shop's own settings instead of the
          name that used to be written into the app. */}
      <SettingsCard>
        <InfoRow
          icon="business-outline"
          label="Business"
          value={businessName}
        />
        <InfoRow
          icon="mail-outline"
          isLast
          label="Support"
          value={
            supportConfig.hasEmail ? supportConfig.email : "See the Help Center"
          }
        />
      </SettingsCard>
      <Text style={styles.copyright}>
        {/* The shop's own name, from its settings. This read a name written into the app,
            so a differently named laundromat saw someone else's in its copyright line. */}
        © {new Date().getFullYear()} {businessName}. All rights reserved.
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
  avatar: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 32,
    height: 64,
    justifyContent: "center",
    width: 64,
  },
  avatarInitials: {
    color: colors.navy,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
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
  helpContactIntro: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
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
  logoAction: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.navy,
    borderRadius: radii.sm,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 12,
  },
  logoActionDisabled: { opacity: 0.58 },
  logoActionLabel: {
    color: colors.navy,
    fontSize: 12.5,
    fontWeight: "700",
    lineHeight: 16,
  },
  logoActionPressed: { opacity: 0.78 },
  accountAction: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.sm,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 88,
    paddingHorizontal: 10,
  },
  accountActionBusy: { opacity: 0.6 },
  accountActionLabel: {
    color: colors.navy,
    fontSize: 12.5,
    fontWeight: "700",
  },
  accountActionLabelDanger: { color: colors.danger },
  accountActionRestore: { borderColor: colors.navy },
  accountCopy: { flex: 1, minWidth: 0 },
  accountMeta: {
    color: colors.textSecondary,
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 2,
  },
  accountName: {
    color: colors.navy,
    fontSize: 13.5,
    fontWeight: "700",
    lineHeight: 18,
  },
  accountRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  accountRowDivider: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
  },
  staffEmpty: {
    color: colors.textSecondary,
    fontSize: 12.5,
    padding: spacing.md,
  },
  photoActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: 8,
  },
  photoRemove: {
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 6,
  },
  photoRemoveLabel: {
    color: colors.textSecondary,
    fontSize: 12.5,
    fontWeight: "600",
    lineHeight: 16,
  },
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
  // The form card supplies the padding, matching every other settings form. Adding it
  // here as well is what pushed the label off the left edge.
  roleRow: { flexDirection: "row", gap: spacing.xs },
  roleOption: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roleOptionActive: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.navy,
  },
  roleLabel: { color: colors.textSecondary, fontSize: 13, fontWeight: "600" },
  roleLabelActive: { color: colors.navy },
  roleWarning: { color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
  inviteCode: {
    color: colors.navy,
    fontSize: 26,
    fontVariant: ["tabular-nums"],
    fontWeight: "700",
    letterSpacing: 4,
    paddingTop: spacing.md,
    textAlign: "center",
  },
  inviteCodeHelp: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    padding: spacing.md,
    textAlign: "center",
  },
  inviteEmpty: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    padding: spacing.md,
  },
  inviteRetry: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 19,
    padding: spacing.md,
  },
  inviteRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
  },
  inviteRowDivider: { borderBottomColor: colors.divider, borderBottomWidth: 1 },
  inviteRowCopy: { flex: 1, gap: 3 },
  inviteEmail: { color: colors.navy, fontSize: 14, fontWeight: "600" },
  inviteMeta: { color: colors.textSecondary, fontSize: 12 },
  revokeButton: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  revokeLabel: { color: colors.danger, fontSize: 13, fontWeight: "600" },
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
