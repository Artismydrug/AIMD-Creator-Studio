import React, { useCallback, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

type TourSlide = {
  icon: React.ComponentProps<typeof Feather>['name'];
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  tags?: string[];
};

const SLIDES: TourSlide[] = [
  {
    icon: 'aperture',
    eyebrow: 'Creator Studio',
    title: 'Every creator belongs here.',
    body: 'A digital studio for the way you make. Find your lane, practice your craft, and keep moving.',
    accent: 'coral',
    tags: ['Painters', 'Musicians', 'Athletes', 'Tattoo artists'],
  },
  {
    icon: 'zap',
    eyebrow: 'Make it a habit',
    title: 'Show up. Make something.',
    body: 'Check in, build a streak, and turn small creative moves into real momentum.',
    accent: 'cyan',
  },
  {
    icon: 'image',
    eyebrow: 'Share your work',
    title: 'Let the work speak.',
    body: 'Post your progress, find other creators, and build a portfolio that feels like you.',
    accent: 'magenta',
  },
  {
    icon: 'star',
    eyebrow: 'Challenges & Habits',
    title: 'Practice with purpose.',
    body: 'Use habits for the daily work. Jump into weekly challenges when you want a creative push.',
    accent: 'gold',
  },
  {
    icon: 'play-circle',
    eyebrow: 'Learn your way',
    title: 'Keep growing.',
    body: 'Explore creator workshops, focused drills, and new paths as they open.',
    accent: 'coral',
  },
];

export default function CreatorAppTour() {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const slideWidth = Math.max(width - 32, 280);

  const accentColors = {
    coral: colors.sunsetCoral,
    cyan: colors.cyan,
    magenta: colors.electricMagenta,
    gold: colors.gold,
  };

  const goToSlide = useCallback((index: number) => {
    const nextIndex = (index + SLIDES.length) % SLIDES.length;
    setActiveIndex(nextIndex);
    scrollRef.current?.scrollTo({ x: nextIndex * slideWidth, animated: true });
  }, [slideWidth]);

  const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    setActiveIndex(Math.max(0, Math.min(SLIDES.length - 1, nextIndex)));
  };

  const activeSlide = SLIDES[activeIndex];
  const activeAccent = accentColors[activeSlide.accent as keyof typeof accentColors];

  const styles = StyleSheet.create({
    wrapper: {
      marginHorizontal: 16,
      marginBottom: 4,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: colors.ink,
      borderWidth: 1,
      borderColor: `${activeAccent}66`,
    },
    slide: {
      width: slideWidth,
      minHeight: 246,
      padding: 20,
      justifyContent: 'space-between',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      flex: 1,
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    copy: {
      marginTop: 12,
      gap: 9,
    },
    artStage: {
      height: 72,
      marginTop: 14,
      borderRadius: 14,
      overflow: 'hidden',
    },
    artCanvas: {
      flex: 1,
      position: 'relative',
      justifyContent: 'center',
      paddingHorizontal: 16,
      overflow: 'hidden',
    },
    artGlow: {
      position: 'absolute',
      width: 92,
      height: 92,
      borderRadius: 46,
      right: 34,
      top: -44,
      opacity: 0.75,
    },
    artGlowSmall: {
      position: 'absolute',
      width: 54,
      height: 54,
      borderRadius: 27,
      left: 42,
      bottom: -28,
      opacity: 0.55,
    },
    artGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    artTile: {
      width: 40,
      height: 40,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(250,248,245,0.25)',
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    artTileTall: {
      width: 54,
      height: 52,
      borderRadius: 13,
      transform: [{ rotate: '-6deg' }],
    },
    artTileOffset: {
      transform: [{ rotate: '7deg' }],
    },
    artStroke: {
      position: 'absolute',
      height: 2,
      width: 86,
      right: 12,
      bottom: 16,
      transform: [{ rotate: '-16deg' }],
      backgroundColor: 'rgba(250,248,245,0.62)',
    },
    artLabel: {
      marginLeft: 'auto',
      fontFamily: 'DMSans_700Bold',
      fontSize: 9,
      letterSpacing: 1.2,
      color: colors.background,
      textTransform: 'uppercase',
    },
    title: {
      maxWidth: '92%',
      fontFamily: 'DMSans_700Bold',
      fontSize: 27,
      lineHeight: 30,
      letterSpacing: -0.7,
      color: colors.background,
    },
    body: {
      maxWidth: '94%',
      fontFamily: 'DMSans_400Regular',
      fontSize: 14,
      lineHeight: 20,
      color: 'rgba(250,248,245,0.72)',
    },
    tags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
      marginTop: 2,
    },
    tag: {
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 99,
      borderWidth: 1,
      backgroundColor: 'rgba(250,248,245,0.07)',
    },
    tagText: {
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 10,
      color: colors.background,
    },
    controls: {
      minHeight: 58,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: 'rgba(250,248,245,0.13)',
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    control: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(250,248,245,0.28)',
      backgroundColor: 'rgba(0,0,0,0.26)',
    },
    dots: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    dot: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: 'rgba(250,248,245,0.35)',
    },
    activeDot: {
      width: 25,
      backgroundColor: colors.background,
    },
    counter: {
      minWidth: 38,
      fontFamily: 'DMSans_600SemiBold',
      fontSize: 10,
      color: 'rgba(250,248,245,0.62)',
      textAlign: 'right',
    },
  });

  return (
    <View style={styles.wrapper} testID="creator-app-tour">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        accessible
        accessibilityLabel={`Creator Studio tour, slide ${activeIndex + 1} of ${SLIDES.length}`}
      >
        {SLIDES.map((slide, index) => {
          const accent = accentColors[slide.accent as keyof typeof accentColors];
          return (
            <View key={slide.title} style={styles.slide}>
              <View style={styles.topRow}>
                <Text style={[styles.eyebrow, { color: accent }]}>{slide.eyebrow}</Text>
                <View style={[styles.icon, { backgroundColor: `${accent}28` }]}>
                  <Feather name={slide.icon} size={22} color={accent} />
                </View>
              </View>
              <View style={styles.artStage} accessibilityElementsHidden>
                <LinearGradient
                  colors={[`${accent}40`, `${colors.foreground}22`, `${accent}18`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.artCanvas}
                >
                  <View style={[styles.artGlow, { backgroundColor: accent }]} />
                  <View style={[styles.artGlowSmall, { backgroundColor: accent }]} />
                  <View style={styles.artGrid}>
                    <View style={[styles.artTile, styles.artTileTall, { borderColor: `${accent}99` }]}>
                      <Feather name={slide.icon} size={22} color={colors.background} />
                    </View>
                    <View style={[styles.artTile, { backgroundColor: `${accent}36` }]}>
                      <Feather
                        name={index === 0 ? 'edit-3' : index === 1 ? 'activity' : index === 2 ? 'image' : index === 3 ? 'award' : 'compass'}
                        size={17}
                        color={accent}
                      />
                    </View>
                    <View style={[styles.artTile, styles.artTileOffset, { backgroundColor: 'rgba(250,248,245,0.12)' }]}>
                      <Feather name={index % 2 === 0 ? 'plus' : 'arrow-up-right'} size={18} color={accent} />
                    </View>
                    {index === 0 && <Text style={styles.artLabel}>Make room for your lane</Text>}
                    {index === 1 && <Text style={styles.artLabel}>Small moves count</Text>}
                    {index === 2 && <Text style={styles.artLabel}>Work in public</Text>}
                    {index === 3 && <Text style={styles.artLabel}>Your practice, visible</Text>}
                    {index === 4 && <Text style={styles.artLabel}>Keep exploring</Text>}
                  </View>
                  <View style={styles.artStroke} />
                </LinearGradient>
              </View>
              <View style={styles.copy}>
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>
                {slide.tags && (
                  <View style={styles.tags}>
                    {slide.tags.map((tag) => (
                      <View key={tag} style={[styles.tag, { borderColor: `${accent}66` }]}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.control}
          onPress={() => goToSlide(activeIndex - 1)}
          accessibilityRole="button"
          accessibilityLabel="Previous Creator Studio tour slide"
          testID="creator-tour-previous"
        >
          <Feather name="chevron-left" size={19} color={colors.background} />
        </TouchableOpacity>
        <View style={styles.dots} accessibilityRole="tablist" accessibilityLabel="Creator Studio tour slides">
          {SLIDES.map((slide, index) => (
            <TouchableOpacity
              key={slide.title}
              onPress={() => goToSlide(index)}
              accessibilityRole="tab"
              accessibilityState={{ selected: index === activeIndex }}
              accessibilityLabel={`Go to tour slide ${index + 1}`}
              style={[styles.dot, index === activeIndex && styles.activeDot]}
              testID={`creator-tour-dot-${index}`}
            />
          ))}
        </View>
        <TouchableOpacity
          style={styles.control}
          onPress={() => goToSlide(activeIndex + 1)}
          accessibilityRole="button"
          accessibilityLabel="Next Creator Studio tour slide"
          testID="creator-tour-next"
        >
          <Feather name="chevron-right" size={19} color={colors.background} />
        </TouchableOpacity>
        <Text style={styles.counter}>{activeIndex + 1}/{SLIDES.length}</Text>
      </View>
    </View>
  );
}