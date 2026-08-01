import Ionicons from "@expo/vector-icons/Ionicons";
import {
  type ComponentProps,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { describeApiError } from "../../../api/apiClient";
import { colors } from "../../../theme/colors";
import { radii } from "../../../theme/radii";
import { spacing } from "../../../theme/spacing";
import { useAuth } from "../AuthContext";

const welcomeMascot = require("../../../../assets/login-welcome-mascot-cropped.png");
const authBackground = require("../../../../assets/backgrounds/login-background.webp");
const MASCOT_CARD_OVERLAP = 64;

type AuthMode = "signIn" | "signUp" | "verify" | "forgot" | "reset";
type IoniconName = ComponentProps<typeof Ionicons>["name"];

interface AuthFieldProps {
  autoCapitalize?: "none" | "sentences" | "words";
  autoComplete?: ComponentProps<typeof TextInput>["autoComplete"];
  editable: boolean;
  icon: IoniconName;
  keyboardType?: ComponentProps<typeof TextInput>["keyboardType"];
  label: string;
  onChangeText: (value: string) => void;
  onSubmitEditing?: () => void;
  placeholder: string;
  rightAccessory?: ReactNode;
  secureTextEntry?: boolean;
  value: string;
}

function getPasswordValidationMessage(password: string) {
  if (password.length < 10) {
    return "Use at least 10 characters for your password.";
  }
  if (!/[a-z]/.test(password)) {
    return "Include at least one lowercase letter in your password.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Include at least one uppercase letter in your password.";
  }
  if (!/\d/.test(password)) {
    return "Include at least one number in your password.";
  }

  return "";
}

function AuthField({
  autoCapitalize = "none",
  autoComplete,
  editable,
  icon,
  keyboardType,
  label,
  onChangeText,
  onSubmitEditing,
  placeholder,
  rightAccessory,
  secureTextEntry,
  value,
}: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.floatingLabel}>{label}</Text>
      <Ionicons color={colors.textSecondary} name={icon} size={22} />
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        autoCorrect={false}
        editable={editable}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={styles.input}
        value={value}
      />
      {rightAccessory}
    </View>
  );
}

export function LoginScreen() {
  const {
    completePasswordReset,
    logIn,
    register,
    resendVerification,
    sendPasswordReset,
    verify,
  } = useAuth();
  const { height, width } = useWindowDimensions();
  const compactHeight = height < 760;

  const [mode, setMode] = useState<AuthMode>("signIn");
  const [login, setLogin] = useState("");
  const [fullName, setFullName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingLogin, setPendingLogin] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const isSignUp = mode === "signUp";
  const isSignIn = mode === "signIn";
  const isVerify = mode === "verify";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const heroHeight = useMemo(
    () => Math.min(compactHeight ? 210 : 270, width * 0.7),
    [compactHeight, width],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener("keyboardDidShow", () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const changeMode = (nextMode: AuthMode) => {
    if (submitting || nextMode === mode) return;
    setMode(nextMode);
    setError("");
    setNotice("");
    setCode("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const submit = async () => {
    if (isSignUp) {
      if (
        !fullName.trim() ||
        !emailAddress.trim() ||
        !mobileNumber.trim() ||
        !password ||
        !confirmPassword
      ) {
        setError("Complete every field to create your owner account.");
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      const passwordValidationMessage = getPasswordValidationMessage(password);
      if (passwordValidationMessage) {
        setError(passwordValidationMessage);
        return;
      }
    } else if (isSignIn && (!login.trim() || !password)) {
      setError("Enter your email or mobile number and password.");
      return;
    } else if (isVerify && (!emailAddress.trim() || !code.trim())) {
      setError("Enter your email address and six-digit verification code.");
      return;
    } else if (isForgot && !pendingLogin.trim()) {
      setError("Enter the email address or mobile number for your account.");
      return;
    } else if (isReset) {
      if (
        !pendingLogin.trim() ||
        !code.trim() ||
        !password ||
        !confirmPassword
      ) {
        setError("Complete every field to reset your password.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      const passwordValidationMessage = getPasswordValidationMessage(password);
      if (passwordValidationMessage) {
        setError(passwordValidationMessage);
        return;
      }
    }

    setSubmitting(true);
    setError("");
    try {
      if (isSignUp) {
        const registration = await register({
          confirmPassword,
          emailAddress: emailAddress.trim(),
          fullName: fullName.trim(),
          mobileNumber: mobileNumber.trim(),
          password,
        });
        setEmailAddress(registration.emailAddress);
        setMode("verify");
        setCode("");
        setPassword("");
        setConfirmPassword("");
        setNotice(
          `We sent a six-digit code to ${registration.emailAddress}. It expires in ${registration.codeExpiresInMinutes} minutes.`,
        );
      } else if (isVerify) {
        await verify(emailAddress.trim(), code.trim());
      } else if (isForgot) {
        const response = await sendPasswordReset(pendingLogin.trim());
        setMode("reset");
        setCode("");
        setNotice(response.message);
      } else if (isReset) {
        await completePasswordReset(
          pendingLogin.trim(),
          code.trim(),
          password,
          confirmPassword,
        );
        setMode("signIn");
        setLogin(pendingLogin.trim());
        setCode("");
        setPassword("");
        setConfirmPassword("");
        setNotice("Your password was reset. Sign in with your new password.");
      } else {
        await logIn(login.trim(), password);
      }
    } catch (caught) {
      const message = describeApiError(
        caught,
        isSignUp
          ? "Account creation failed. Please try again."
          : isVerify
            ? "Email verification failed. Please try again."
            : isForgot || isReset
              ? "Password recovery failed. Please try again."
              : "Sign in failed. Please try again.",
      );

      if (isSignIn && message.toLowerCase().includes("verify your email")) {
        if (login.includes("@")) setEmailAddress(login.trim());
        setMode("verify");
        setPassword("");
        setCode("");
        setNotice(
          "Your account still needs email verification. Enter the code we sent, or request a new one.",
        );
        setError("");
      } else {
        setError(message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resendCode = async () => {
    if (!emailAddress.trim() || submitting) return;
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await resendVerification(emailAddress.trim());
      setNotice(response.message);
    } catch (caught) {
      setError(
        describeApiError(caught, "Could not resend the verification code."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const title = isSignUp
    ? "Create your account"
    : isVerify
      ? "Verify your email"
      : isForgot
        ? "Reset your password"
        : isReset
          ? "Enter your reset code"
          : "Welcome back";
  const subtitle = isSignUp
    ? "Set up your owner access to manage your laundromat."
    : isVerify
      ? "Confirm your email to securely activate owner access."
      : isForgot
        ? "We’ll send a secure reset code to your verified email."
        : isReset
          ? "Choose a strong new password for your owner account."
          : "Sign in to manage bookings and laundry operations.";

  const passwordAccessory = (
    <Pressable
      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
      accessibilityRole="button"
      hitSlop={10}
      onPress={() => setShowPassword((visible) => !visible)}
    >
      <Ionicons
        color={colors.textSecondary}
        name={showPassword ? "eye-off-outline" : "eye-outline"}
        size={23}
      />
    </Pressable>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      {/* Sits behind the whole flow so the card reads as a panel on paper
          rather than a form floating on flat white. */}
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="cover"
        source={authBackground}
        style={styles.background}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.screen}
      >
        <ScrollView
          automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          contentContainerStyle={[
            styles.content,
            keyboardVisible && styles.contentKeyboard,
          ]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* The mascot is a sign-in welcome flourish. On the taller Create
              Account, Verify, and Reset forms it only got cropped, so it is
              hidden there and the form starts at the top of the screen. */}
          {!keyboardVisible && isSignIn ? (
            <View style={[styles.hero, { height: heroHeight }]}>
              <Image
                accessibilityIgnoresInvertColors
                resizeMode="contain"
                source={welcomeMascot}
                style={styles.mascot}
              />
            </View>
          ) : null}

          <View
            style={[
              styles.card,
              !keyboardVisible && isSignIn && styles.cardWithMascotOverlap,
            ]}
          >
            <View style={styles.heading}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            {isSignIn || isSignUp ? (
              <View style={styles.modeSwitch}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => changeMode("signIn")}
                  style={[
                    styles.modeButton,
                    mode === "signIn" && styles.modeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeLabel,
                      mode === "signIn" && styles.modeLabelActive,
                    ]}
                  >
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => changeMode("signUp")}
                  style={[
                    styles.modeButton,
                    mode === "signUp" && styles.modeButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeLabel,
                      mode === "signUp" && styles.modeLabelActive,
                    ]}
                  >
                    Create Account
                  </Text>
                </Pressable>
              </View>
            ) : null}

            <View style={styles.form}>
              {isSignUp ? (
                <>
                  <AuthField
                    autoCapitalize="words"
                    autoComplete="name"
                    editable={!submitting}
                    icon="person-outline"
                    label="Full name"
                    onChangeText={setFullName}
                    placeholder="Your full name"
                    value={fullName}
                  />
                  <AuthField
                    autoComplete="email"
                    editable={!submitting}
                    icon="mail-outline"
                    keyboardType="email-address"
                    label="Email address"
                    onChangeText={setEmailAddress}
                    placeholder="Enter your email address"
                    value={emailAddress}
                  />
                  <AuthField
                    autoComplete="tel"
                    editable={!submitting}
                    icon="call-outline"
                    keyboardType="phone-pad"
                    label="Mobile number"
                    onChangeText={setMobileNumber}
                    placeholder="09xx xxx xxxx"
                    value={mobileNumber}
                  />
                </>
              ) : isSignIn ? (
                <AuthField
                  autoComplete="username"
                  editable={!submitting}
                  icon="person-outline"
                  label="Email or mobile number"
                  onChangeText={setLogin}
                  placeholder="Enter email or mobile number"
                  value={login}
                />
              ) : isVerify ? (
                <>
                  <AuthField
                    autoComplete="email"
                    editable={!submitting}
                    icon="mail-outline"
                    keyboardType="email-address"
                    label="Email address"
                    onChangeText={setEmailAddress}
                    placeholder="Enter your email address"
                    value={emailAddress}
                  />
                  <AuthField
                    autoComplete="one-time-code"
                    editable={!submitting}
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    label="Verification code"
                    onChangeText={(value) =>
                      setCode(value.replace(/\D/g, "").slice(0, 6))
                    }
                    onSubmitEditing={() => void submit()}
                    placeholder="000000"
                    value={code}
                  />
                </>
              ) : isForgot ? (
                <AuthField
                  autoComplete="username"
                  editable={!submitting}
                  icon="person-outline"
                  label="Email or mobile number"
                  onChangeText={setPendingLogin}
                  onSubmitEditing={() => void submit()}
                  placeholder="Enter email or mobile number"
                  value={pendingLogin}
                />
              ) : (
                <>
                  <AuthField
                    autoComplete="one-time-code"
                    editable={!submitting}
                    icon="keypad-outline"
                    keyboardType="number-pad"
                    label="Reset code"
                    onChangeText={(value) =>
                      setCode(value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    value={code}
                  />
                </>
              )}

              {isSignIn || isSignUp || isReset ? (
                <AuthField
                  autoComplete={
                    isSignUp || isReset ? "new-password" : "current-password"
                  }
                  editable={!submitting}
                  icon="lock-closed-outline"
                  label="Password"
                  onChangeText={setPassword}
                  onSubmitEditing={
                    isSignUp || isReset ? undefined : () => void submit()
                  }
                  placeholder={
                    isSignUp || isReset
                      ? "At least 10 characters"
                      : "Enter your password"
                  }
                  rightAccessory={passwordAccessory}
                  secureTextEntry={!showPassword}
                  value={password}
                />
              ) : null}

              {isSignUp || isReset ? (
                <AuthField
                  autoComplete="new-password"
                  editable={!submitting}
                  icon="shield-checkmark-outline"
                  label="Confirm password"
                  onChangeText={setConfirmPassword}
                  onSubmitEditing={() => void submit()}
                  placeholder="Re-enter your password"
                  rightAccessory={
                    <Pressable
                      accessibilityLabel={
                        showConfirmPassword
                          ? "Hide confirmed password"
                          : "Show confirmed password"
                      }
                      accessibilityRole="button"
                      hitSlop={10}
                      onPress={() =>
                        setShowConfirmPassword((visible) => !visible)
                      }
                    >
                      <Ionicons
                        color={colors.textSecondary}
                        name={
                          showConfirmPassword
                            ? "eye-off-outline"
                            : "eye-outline"
                        }
                        size={23}
                      />
                    </Pressable>
                  }
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                />
              ) : null}
            </View>

            {isSignIn ? (
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                hitSlop={8}
                onPress={() => {
                  setPendingLogin(login.trim());
                  changeMode("forgot");
                }}
                style={styles.inlineAction}
              >
                <Text style={styles.inlineActionLabel}>Forgot password?</Text>
              </Pressable>
            ) : null}

            {notice ? (
              <View accessibilityLiveRegion="polite" style={styles.noticeBox}>
                <Ionicons
                  color={colors.success}
                  name="checkmark-circle-outline"
                  size={18}
                />
                <Text style={styles.notice}>{notice}</Text>
              </View>
            ) : null}

            {error ? (
              <View accessibilityLiveRegion="polite" style={styles.errorBox}>
                <Ionicons
                  color={colors.danger}
                  name="alert-circle-outline"
                  size={18}
                />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
                submitting && styles.buttonDisabled,
              ]}
            >
              {submitting ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color={colors.surface} size="small" />
                  <Text style={styles.primaryButtonLabel}>
                    {isSignUp
                      ? "Creating account..."
                      : isVerify
                        ? "Verifying..."
                        : isForgot
                          ? "Sending code..."
                          : isReset
                            ? "Resetting password..."
                            : "Signing in..."}
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonLabel}>
                  {isSignUp
                    ? "Create Account"
                    : isVerify
                      ? "Verify & Sign In"
                      : isForgot
                        ? "Send Reset Code"
                        : isReset
                          ? "Reset Password"
                          : "Sign In"}
                </Text>
              )}
            </Pressable>

            {isVerify ? (
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => void resendCode()}
                style={styles.secondaryAction}
              >
                <Text style={styles.secondaryActionLabel}>
                  Resend verification code
                </Text>
              </Pressable>
            ) : null}

            {!isSignIn && !isSignUp ? (
              <Pressable
                accessibilityRole="button"
                disabled={submitting}
                onPress={() => changeMode("signIn")}
                style={styles.secondaryAction}
              >
                <Ionicons
                  color={colors.navy}
                  name="arrow-back-outline"
                  size={17}
                />
                <Text style={styles.secondaryActionLabel}>Back to sign in</Text>
              </Pressable>
            ) : null}

            <View style={styles.security}>
              <View style={styles.securityIcon}>
                <Ionicons
                  color={colors.actionBlue}
                  name="shield-checkmark-outline"
                  size={18}
                />
              </View>
              <Text style={styles.securityLabel}>
                Your account data is secured on this device.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  background: {
    height: "100%",
    left: 0,
    position: "absolute",
    top: 0,
    width: "100%",
  },
  buttonContent: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }],
  },
  card: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "#E2E8F0",
    borderRadius: 30,
    borderWidth: 1,
    gap: spacing.md,
    maxWidth: 520,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    position: "relative",
    width: "100%",
    zIndex: 3,
    elevation: 1,
  },
  cardWithMascotOverlap: {
    marginTop: -MASCOT_CARD_OVERLAP,
    paddingTop: spacing.xl,
  },
  content: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  contentKeyboard: {
    justifyContent: "flex-start",
    paddingTop: spacing.md,
  },
  error: {
    color: colors.danger,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  errorBox: {
    alignItems: "flex-start",
    backgroundColor: colors.redSoft,
    borderRadius: radii.md,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  field: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: "#C9DEFA",
    borderRadius: radii.lg,
    borderWidth: 1.25,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    position: "relative",
  },
  floatingLabel: {
    backgroundColor: colors.surface,
    color: colors.navy,
    fontSize: 12,
    fontWeight: "700",
    left: spacing.md,
    paddingHorizontal: spacing.xs,
    position: "absolute",
    top: -9,
    zIndex: 1,
  },
  form: {
    gap: spacing.md,
  },
  heading: {
    alignItems: "center",
    gap: spacing.xs,
  },
  hero: {
    alignItems: "center",
    justifyContent: "flex-end",
    maxWidth: 540,
    overflow: "visible",
    position: "relative",
    width: "100%",
    zIndex: 1,
    elevation: 0,
  },
  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    minWidth: 0,
    paddingVertical: spacing.md,
  },
  inlineAction: {
    alignSelf: "flex-end",
    marginTop: -spacing.sm,
  },
  inlineActionLabel: {
    color: colors.actionBlue,
    fontSize: 13,
    fontWeight: "700",
  },
  mascot: {
    height: "112%",
    width: "112%",
    zIndex: 0,
    elevation: 0,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: spacing.sm,
  },
  modeButtonActive: {
    backgroundColor: colors.navy,
  },
  modeLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "700",
  },
  modeLabelActive: {
    color: colors.surface,
  },
  modeSwitch: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: radii.pill,
    flexDirection: "row",
    padding: spacing.xxs,
  },
  notice: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  noticeBox: {
    alignItems: "flex-start",
    backgroundColor: colors.greenSoft,
    borderColor: "#CBEAD7",
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.sm,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    elevation: 3,
    justifyContent: "center",
    minHeight: 58,
    shadowColor: colors.navy,
    shadowOffset: { height: 5, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  primaryButtonLabel: {
    color: colors.surface,
    fontSize: 17,
    fontWeight: "800",
  },
  safeArea: {
    backgroundColor: "#F4F6F9",
    flex: 1,
  },
  secondaryAction: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  secondaryActionLabel: {
    color: colors.navy,
    fontSize: 13,
    fontWeight: "700",
  },
  screen: {
    flex: 1,
  },
  security: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
  },
  securityIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: radii.pill,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  securityLabel: {
    color: colors.textSecondary,
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 17,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    maxWidth: 340,
    textAlign: "center",
  },
  title: {
    color: colors.navy,
    fontSize: 29,
    fontWeight: "800",
    lineHeight: 36,
    textAlign: "center",
  },
});
