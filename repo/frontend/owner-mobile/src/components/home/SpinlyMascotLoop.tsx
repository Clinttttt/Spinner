import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Image, StyleSheet, View } from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";

import { colors } from "../../theme/colors";

const introVideo = require("../../../assets/animations/spinly-mascot-loop.mp4");
const introPoster = require("../../../assets/animations/spinly-mascot-poster.png");
const repeatVideo = require("../../../assets/animations/spinly-mascot-repeat.mp4");

type MascotSegment = "intro" | "repeat";

interface SpinlyMascotLoopProps {
  size: number;
}

export function SpinlyMascotLoop({ size }: SpinlyMascotLoopProps) {
  const [activeSegment, setActiveSegment] = useState<MascotSegment>("intro");
  const [hasRenderedIntroFrame, setHasRenderedIntroFrame] = useState(false);
  const [videoMountKey, setVideoMountKey] = useState(0);
  const appState = useRef(AppState.currentState);
  const hasVisitedHome = useRef(false);
  const isHomeFocused = useRef(false);
  const shouldStartAfterResume = useRef(false);
  const introPlayer = useVideoPlayer(introVideo, (videoPlayer) => {
    videoPlayer.keepScreenOnWhilePlaying = false;
    videoPlayer.loop = false;
    videoPlayer.muted = true;
  });
  const repeatPlayer = useVideoPlayer(repeatVideo, (videoPlayer) => {
    videoPlayer.keepScreenOnWhilePlaying = false;
    videoPlayer.loop = true;
    videoPlayer.muted = true;
  });

  useEffect(() => {
    const subscription = introPlayer.addListener("playToEnd", () => {
      if (!isHomeFocused.current) {
        return;
      }

      setActiveSegment("repeat");
      repeatPlayer.currentTime = 0;
      repeatPlayer.play();
    });

    return () => subscription.remove();
  }, [introPlayer, repeatPlayer]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasActive = appState.current === "active";
      appState.current = nextAppState;

      if (nextAppState !== "active") {
        if (wasActive) {
          introPlayer.pause();
          repeatPlayer.pause();
        }

        return;
      }

      if (!isHomeFocused.current) {
        return;
      }

      shouldStartAfterResume.current = true;
      setActiveSegment("repeat");
      setVideoMountKey((currentKey) => currentKey + 1);
    });

    return () => subscription.remove();
  }, [introPlayer, repeatPlayer]);

  useEffect(() => {
    if (!shouldStartAfterResume.current) {
      return;
    }

    shouldStartAfterResume.current = false;
    const playbackFrame = requestAnimationFrame(() => {
      if (!isHomeFocused.current) {
        return;
      }

      repeatPlayer.currentTime = 0;
      repeatPlayer.play();
    });

    return () => cancelAnimationFrame(playbackFrame);
  }, [repeatPlayer, videoMountKey]);

  useFocusEffect(
    useCallback(() => {
      isHomeFocused.current = true;
      const segment: MascotSegment = hasVisitedHome.current
        ? "repeat"
        : "intro";
      hasVisitedHome.current = true;
      const player = segment === "intro" ? introPlayer : repeatPlayer;

      setActiveSegment(segment);
      const playbackFrame = requestAnimationFrame(() => {
        // Seeking the repeat clip on every tab return clears Android's video
        // surface for a moment. Resume its paused frame instead.
        if (segment === "intro") {
          player.currentTime = 0;
        }

        player.play();
      });

      return () => {
        isHomeFocused.current = false;
        cancelAnimationFrame(playbackFrame);
        introPlayer.pause();
        repeatPlayer.pause();
      };
    }, [introPlayer, repeatPlayer]),
  );

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[
        styles.container,
        { borderRadius: size / 2, height: size, width: size },
      ]}
    >
      <VideoView
        key={`intro-${videoMountKey}`}
        contentFit="contain"
        nativeControls={false}
        player={introPlayer}
        onFirstFrameRender={() => setHasRenderedIntroFrame(true)}
        style={[
          styles.video,
          activeSegment === "intro" ? styles.visibleVideo : styles.hiddenVideo,
          { borderRadius: size / 2 },
        ]}
        surfaceType="textureView"
        useExoShutter={false}
      />
      <VideoView
        key={`repeat-${videoMountKey}`}
        contentFit="contain"
        nativeControls={false}
        player={repeatPlayer}
        style={[
          styles.video,
          activeSegment === "repeat" ? styles.visibleVideo : styles.hiddenVideo,
          { borderRadius: size / 2 },
        ]}
        surfaceType="textureView"
        useExoShutter={false}
      />
      {activeSegment === "intro" && !hasRenderedIntroFrame && (
        <Image
          accessibilityElementsHidden
          fadeDuration={0}
          importantForAccessibility="no-hide-descendants"
          resizeMode="contain"
          source={introPoster}
          style={[styles.poster, { borderRadius: size / 2 }]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  video: {
    ...StyleSheet.absoluteFill,
  },
  hiddenVideo: {
    opacity: 0,
  },
  poster: {
    ...StyleSheet.absoluteFill,
  },
  visibleVideo: {
    opacity: 1,
  },
});
