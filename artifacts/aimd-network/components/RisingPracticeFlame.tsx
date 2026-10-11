import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from 'react-native';

const TRACK_HEIGHT = 112;
const FLAME_SIZE = 20;
const INSET = 4;
const TRAVEL = TRACK_HEIGHT - FLAME_SIZE - INSET * 2;

function offsetFor(days: number) {
  const clamped = Math.max(0, Math.min(7, days));
  return -(clamped / 7) * TRAVEL;
}

export default function RisingPracticeFlame({
  daysCompleted,
  trackColor,
  railColor,
}: {
  daysCompleted: number;
  trackColor: string;
  railColor: string;
}) {
  const translateY = useRef(new Animated.Value(offsetFor(daysCompleted))).current;
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => { if (mounted) setReduceMotion(v); })
      .catch(() => {
        if (mounted) {
          setReduceMotion(true);
          console.warn('Could not read reduced-motion preference; practice chart animations remain disabled.');
        }
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    const target = offsetFor(daysCompleted);
    if (reduceMotion) {
      translateY.stopAnimation();
      translateY.setValue(target);
      return;
    }
    const anim = Animated.timing(translateY, {
      toValue: target,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [daysCompleted, reduceMotion, translateY]);

  return (
    <View style={[styles.track, { backgroundColor: trackColor }]}>
      <View style={[styles.rail, { backgroundColor: railColor }]} />
      <Animated.Text
        allowFontScaling={false}
        style={[styles.flame, { transform: [{ translateY }] }]}
      >
        🔥
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: TRACK_HEIGHT,
    width: '100%',
    maxWidth: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: INSET,
    overflow: 'hidden',
  },
  rail: { position: 'absolute', top: INSET + 6, bottom: INSET + 6, width: 2, borderRadius: 1 },
  flame: { fontSize: 16, lineHeight: FLAME_SIZE, height: FLAME_SIZE, textAlign: 'center' },
});
