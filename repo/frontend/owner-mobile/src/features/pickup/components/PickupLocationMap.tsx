import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  Polyline,
  PROVIDER_GOOGLE,
  type MapStyleElement,
} from "react-native-maps";

import { mapsConfig } from "../../../api/mapsConfig";
import { colors } from "../../../theme/colors";
import type { PickupLocationDetails } from "../models/pickupLocation";

// A native marker image is more reliable than a nested React Native Image on
// physical Android devices, where custom marker views are bitmap snapshots.
const businessHomeMarker = require("../../../../assets/branding/business-home-marker.png");

const REALISTIC_MAP_STYLE: MapStyleElement[] = [
  { elementType: "geometry", stylers: [{ color: "#F4F1EA" }] },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#4B5565" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#FFFFFF" }, { weight: 3 }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#C8CED7" }],
  },
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#243B53" }],
  },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#52606D" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#E9EFE4" }],
  },
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "poi.business",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5B6573" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#DDEBD5" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#56704D" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#FFFFFF" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#D2D7DE" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#FFF8E9" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry.stroke",
    stylers: [{ color: "#E6D9BA" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#F5D7A1" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#DDBA7D" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#536170" }],
  },
  {
    featureType: "transit",
    elementType: "geometry",
    stylers: [{ color: "#E1E5EA" }],
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "on" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#BFDDEA" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#4E7485" }],
  },
];

interface PickupLocationMapProps {
  compact: boolean;
  details: PickupLocationDetails;
  onOpenMaps: () => void;
}

export function PickupLocationMap({
  compact,
  details,
  onOpenMaps,
}: PickupLocationMapProps) {
  const mapRef = useRef<MapView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { latitude, longitude, status } = details.location;
  const hasCoordinates =
    Number.isFinite(latitude) && Number.isFinite(longitude);
  const routeCoordinates = details.routePreview?.coordinates ?? [];
  const frameCoordinates = routeCoordinates.length > 1 ? routeCoordinates : [];

  useEffect(() => {
    if (!hasCoordinates) return;
    timerRef.current = setTimeout(() => setMapFailed(true), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [hasCoordinates]);

  const handleMapReady = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setMapReady(true);
    setMapFailed(false);
    if (frameCoordinates.length > 1) {
      requestAnimationFrame(() => {
        mapRef.current?.fitToCoordinates(frameCoordinates, {
          animated: false,
          edgePadding: { bottom: 40, left: 40, right: 40, top: 58 },
        });
      });
    }
  };

  const summary = `Pickup location for ${details.customerName} at ${details.location.formattedAddress || details.shortAddress}${details.location.landmark ? `. Landmark: ${details.location.landmark}` : ""}.`;

  if (!hasCoordinates || status === "unavailable" || mapFailed) {
    const unavailable = status === "unavailable";
    // A map that has coordinates but never finishes loading is almost always a
    // missing Google Maps key in this build. Say so instead of leaving the
    // owner guessing. The check only refines the message: it never hides a map,
    // because a development client can carry a native key that the JS bundle
    // cannot see.
    const likelyMissingKey = mapFailed && !mapsConfig.isConfigured;
    const title = mapFailed
      ? likelyMissingKey
        ? "Map service not configured"
        : "Map preview unavailable"
      : "No map pin from the customer";
    const body = mapFailed
      ? likelyMissingKey
        ? "This build has no Google Maps key. Open in Maps still works because the coordinates were received."
        : "You can still open the location in Maps."
      : unavailable
        ? "This booking has no saved pin. Use the written address or call the customer."
        : "Use the address or contact the customer.";

    return (
      <View
        accessibilityLabel={summary}
        style={[styles.card, compact ? styles.compactCard : styles.regularCard]}
      >
        <View style={styles.placeholder}>
          <View style={styles.placeholderIcon}>
            <Ionicons color={colors.navy} name="map-outline" size={28} />
          </View>
          <Text style={styles.placeholderTitle}>{title}</Text>
          <Text style={styles.placeholderText}>{body}</Text>
        </View>
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={summary}
      style={[styles.card, compact ? styles.compactCard : styles.regularCard]}
    >
      <MapView
        customMapStyle={REALISTIC_MAP_STYLE}
        initialRegion={{
          latitude: latitude!,
          // Tight enough to show the street the pin sits on. The previous 0.012
          // span covered several kilometres of farmland, which told the rider
          // nothing.
          latitudeDelta: 0.0035,
          longitude: longitude!,
          longitudeDelta: 0.0035,
        }}
        mapPadding={{ bottom: 24, left: 20, right: 20, top: 32 }}
        // A road map names the streets a rider actually follows. Satellite
        // imagery of rural Surigao is unreadable green texture.
        mapType="standard"
        onMapReady={handleMapReady}
        pitchEnabled={false}
        provider={PROVIDER_GOOGLE}
        ref={mapRef}
        rotateEnabled={false}
        showsBuildings
        showsCompass={false}
        showsIndoors={false}
        showsMyLocationButton={false}
        showsPointsOfInterests
        style={StyleSheet.absoluteFill}
        toolbarEnabled={false}
      >
        {routeCoordinates.length > 1 ? (
          <>
            <Polyline
              coordinates={routeCoordinates}
              lineCap="round"
              lineJoin="round"
              strokeColor="rgba(255,255,255,0.98)"
              strokeWidth={9}
              zIndex={1}
            />
            <Polyline
              coordinates={routeCoordinates}
              lineCap="round"
              lineJoin="round"
              strokeColor="#1769D2"
              strokeWidth={5}
              zIndex={2}
            />
          </>
        ) : null}
        {details.routePreview && routeCoordinates.length > 1 ? (
          <Marker
            accessibilityLabel="Business home"
            anchor={{ x: 0.5, y: 0.5 }}
            coordinate={details.routePreview.origin}
            image={businessHomeMarker}
            title="Business Home"
            zIndex={3}
          />
        ) : null}
        <Marker
          accessibilityLabel={`Pickup point for ${details.customerName}`}
          anchor={{ x: 0.5, y: 1 }}
          coordinate={{ latitude: latitude!, longitude: longitude! }}
          description={details.location.formattedAddress}
          title="Pickup Point"
          zIndex={4}
        >
          <View style={styles.pickupMarker}>
            <View style={styles.markerLabel}>
              <Text maxFontSizeMultiplier={1} style={styles.markerLabelText}>
                Pickup Point
              </Text>
            </View>
            <View style={styles.markerPin}>
              <Ionicons color={colors.surface} name="location" size={22} />
            </View>
          </View>
        </Marker>
      </MapView>
      {!mapReady ? (
        <View pointerEvents="none" style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.navy} size="small" />
          <Text style={styles.loadingText}>Loading map preview…</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel="Open pickup location in Maps"
        accessibilityRole="button"
        hitSlop={4}
        onPress={onOpenMaps}
        style={({ pressed }) => [
          styles.locateButton,
          pressed && styles.pressed,
        ]}
      >
        <Ionicons color={colors.navy} name="navigate" size={21} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    position: "relative",
  },
  compactCard: { height: 196 },
  loadingOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    bottom: 0,
    gap: 8,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  loadingText: { color: colors.textSecondary, fontSize: 12.5 },
  locateButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: 12,
    height: 44,
    justifyContent: "center",
    position: "absolute",
    right: 12,
    shadowColor: "#0B1F3A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 5,
    width: 44,
    elevation: 4,
  },
  markerLabel: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.96)",
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 29,
    paddingHorizontal: 9,
    paddingVertical: 5,
    shadowColor: "#0B1F3A",
    shadowOffset: { height: 1, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 3,
    elevation: 3,
  },
  markerLabelText: {
    color: colors.navy,
    fontSize: 11.5,
    fontWeight: "600",
  },
  markerPin: {
    alignItems: "center",
    backgroundColor: colors.navy,
    borderColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    height: 32,
    justifyContent: "center",
    marginTop: 3,
    shadowColor: "#0B1F3A",
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    width: 32,
    elevation: 4,
  },
  pickupMarker: { alignItems: "center" },
  placeholder: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  placeholderIcon: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 24,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 12.5,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  placeholderTitle: {
    color: colors.navy,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 12,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  regularCard: { height: 232 },
});
