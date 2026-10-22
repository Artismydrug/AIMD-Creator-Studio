import { Feather } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import type { ComponentProps } from 'react';
import { useColors } from '@/hooks/useColors';
import { useListEvents, useListHabits } from '@workspace/api-client-react';

const SLIDE_LABELS = ['Today’s Habit', 'Workshops', 'Your canvas', 'Events'] as const;

type Shortcut = {
  label: string;
  icon: ComponentProps<typeof Feather>['name'];
  color: string;
  testID: string;
  accessibilityLabel: string;
  onPress: () => void;
};

type StickerJamPracticeCardProps = {
  streak: number | string;
  onStartSketch: () => void;
  onOpenHabits: () => void;
  onOpenFeed: () => void;
  onOpenWorkshops: () => void;
  onOpenEvents: () => void;
};

export default function StickerJamPracticeCard({
  streak,
  onStartSketch,
  onOpenHabits,
  onOpenFeed,
  onOpenWorkshops,
  onOpenEvents,
}: StickerJamPracticeCardProps) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const slideWidth = Math.max(1, screenWidth - 36);
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselRef = useRef<ScrollView>(null);
  const { data: upcomingEvents } = useListEvents({ upcoming: true } as any);
  const { data: habitResponse, isLoading: habitsLoading, isError: habitsError } = useListHabits();
  const habits = Array.isArray(habitResponse?.habits) ? habitResponse.habits : [];
  const activeHabit = habits.find((habit) => !habit.completedToday) ?? habits[0];
  const fleaMarketEvent = upcomingEvents?.find((event) => /los feliz flea/i.test(event.title));
  const featuredEvent = fleaMarketEvent ?? upcomingEvents?.[0];
  const showsFleaFlyer = !featuredEvent || /los feliz flea/i.test(featuredEvent.title);
  const eventTitle = featuredEvent?.title ?? 'AIMD Tattoo Bus at Los Feliz Flea';
  const posterWidth = Math.min(110, Math.max(86, slideWidth * 0.29));
  const posterHeight = posterWidth * (1024 / 761);
  const eventDate = featuredEvent ? new Date(featuredEvent.startsAt) : null;
  const eventDetails = featuredEvent
    ? [
        eventDate && Number.isFinite(eventDate.getTime())
          ? eventDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          : null,
        featuredEvent.location,
      ].filter(Boolean).join(' · ')
    : 'Every Saturday · 11 AM–5 PM';
  const goToSlide = (index: number) => {
    setActiveSlide(index);
    carouselRef.current?.scrollTo({ x: slideWidth * index, animated: true });
  };
  const styles = StyleSheet.create({
    container: {
      marginHorizontal: 18,
      marginTop: 8,
      marginBottom: 18,
      gap: 18,
    },
    intro: {
      gap: 8,
    },
    eyebrowRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    eyebrowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.studioOrange,
    },
    eyebrow: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioVioletText,
      fontSize: 10,
      letterSpacing: 1.5,
    },
    headlineRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    headline: {
      flex: 1,
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 34,
      lineHeight: 36,
      letterSpacing: -1.1,
    },
    streakSticker: {
      width: 74,
      height: 74,
      marginRight: 3,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.studioLavender,
      borderWidth: 2,
      borderColor: colors.studioInk,
      borderRadius: 23,
      transform: [{ rotate: '7deg' }],
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    streakValue: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 25,
      lineHeight: 27,
    },
    streakLabel: {
      marginTop: 2,
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 8,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    flameSticker: {
      position: 'absolute',
      top: -9,
      right: -9,
      width: 25,
      height: 25,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioOrange,
    },
    subtitle: {
      maxWidth: 260,
      fontFamily: 'DMSans_400Regular',
      color: colors.studioMuted,
      fontSize: 14,
      lineHeight: 20,
    },
    canvasFrame: {
      height: 228,
      width: '100%',
      overflow: 'hidden',
      borderRadius: 27,
      borderWidth: 3,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioLavender,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 5, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    eventsFrame: {
      height: 228,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      overflow: 'hidden',
      borderRadius: 27,
      borderWidth: 3,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioLavender,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 5, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    eventsBackdropImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    eventsBackdropWash: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      pointerEvents: 'none',
      backgroundColor: 'rgba(249, 248, 246, 0.76)',
    },
    fullBleedImage: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
    },
    fullBleedWash: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      pointerEvents: 'none',
      backgroundColor: 'rgba(249, 248, 246, 0.42)',
    },
    habitFrame: {
      height: 228,
      width: '100%',
      justifyContent: 'space-between',
      padding: 17,
      overflow: 'hidden',
      borderRadius: 27,
      borderWidth: 3,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioMint,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 5, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    habitTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    habitEyebrow: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 99,
      backgroundColor: 'rgba(249, 248, 246, 0.94)',
      color: colors.studioInk,
      fontFamily: 'DMSans_700Bold',
      fontSize: 10,
      letterSpacing: 1.2,
    },
    habitContentPanel: {
      gap: 4,
      padding: 11,
      borderWidth: 1.5,
      borderColor: 'rgba(26, 23, 33, 0.5)',
      borderRadius: 17,
      backgroundColor: 'rgba(249, 248, 246, 0.91)',
    },
    habitStatus: {
      paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1.5, borderColor: colors.studioInk,
      borderRadius: 99, backgroundColor: colors.studioYellow,
    },
    habitStatusText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.7 },
    habitName: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 21, lineHeight: 25, letterSpacing: -0.4 },
    habitDetails: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 15 },
    habitAction: {
      minHeight: 42, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 7, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.studioInk, borderRadius: 15,
      backgroundColor: colors.studioOrange, shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    habitActionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    workshopFrame: {
      height: 228,
      width: '100%',
      justifyContent: 'space-between',
      padding: 17,
      overflow: 'hidden',
      borderRadius: 27,
      borderWidth: 3,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioLavender,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 5, height: 6 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 4,
    },
    workshopMark: {
      width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
      borderColor: colors.studioInk, borderRadius: 14, backgroundColor: colors.studioYellow,
    },
    workshopBadge: {
      paddingHorizontal: 9, paddingVertical: 5, borderWidth: 1.5, borderColor: colors.studioInk,
      borderRadius: 99, backgroundColor: colors.studioOrange,
    },
    workshopBadgeText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 9, letterSpacing: 0.7 },
    workshopContentPanel: {
      gap: 4,
      padding: 11,
      borderWidth: 1.5,
      borderColor: 'rgba(26, 23, 33, 0.5)',
      borderRadius: 17,
      backgroundColor: 'rgba(249, 248, 246, 0.91)',
    },
    workshopTitle: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 21, lineHeight: 25, letterSpacing: -0.4 },
    workshopDetails: { color: colors.studioInk, fontFamily: 'DMSans_500Medium', fontSize: 11, lineHeight: 15 },
    workshopAction: {
      minHeight: 42, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      gap: 7, paddingHorizontal: 14, borderWidth: 2, borderColor: colors.studioInk, borderRadius: 15,
      backgroundColor: colors.studioPaper, shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2,
    },
    workshopActionText: { color: colors.studioInk, fontFamily: 'DMSans_700Bold', fontSize: 12 },
    eventsPosterFrame: {
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.studioInk,
      borderRadius: 15,
      backgroundColor: colors.studioPaper,
      transform: [{ rotate: '-2deg' }],
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    eventsPosterImage: {
      width: '100%',
      height: '100%',
    },
    eventsPosterFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.studioYellow,
    },
    eventsBody: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    eventsInfoPanel: {
      gap: 3,
      paddingHorizontal: 9,
      paddingVertical: 8,
      borderWidth: 1.25,
      borderColor: 'rgba(26, 23, 33, 0.48)',
      borderRadius: 15,
      backgroundColor: 'rgba(249, 248, 246, 0.94)',
    },
    eventsCopy: { gap: 3, minWidth: 0 },
    eventsEyebrow: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioVioletText,
      fontSize: 8,
      letterSpacing: 1.1,
    },
    eventsTitle: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 17,
      lineHeight: 20,
      letterSpacing: -0.25,
    },
    eventsDetails: {
      fontFamily: 'DMSans_500Medium',
      color: colors.studioMuted,
      fontSize: 10,
      lineHeight: 14,
    },
    eventsCta: {
      minHeight: 38,
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingHorizontal: 10,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 15,
      backgroundColor: colors.studioOrange,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    eventsCtaText: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 11,
    },
    slideIndicators: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      marginTop: 4,
    },
    indicatorButton: {
      minWidth: 24,
      minHeight: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    indicator: {
      width: 7,
      height: 7,
      borderRadius: 4,
      backgroundColor: colors.studioMuted,
      opacity: 0.45,
    },
    activeIndicator: {
      width: 20,
      backgroundColor: colors.studioOrange,
      opacity: 1,
    },
    canvasImage: {
      width: '100%',
      height: '100%',
    },
    canvasLabel: {
      position: 'absolute',
      top: 12,
      left: 12,
      paddingHorizontal: 12,
      paddingVertical: 7,
      transform: [{ rotate: '-7deg' }],
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 11,
      backgroundColor: colors.studioYellow,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    canvasLabelText: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 9,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    startButton: {
      position: 'absolute',
      right: 12,
      bottom: 12,
      minHeight: 46,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      paddingHorizontal: 15,
      borderRadius: 18,
      borderWidth: 2,
      borderColor: colors.studioInk,
      backgroundColor: colors.studioOrange,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 3, height: 3 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 3,
    },
    startButtonText: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 13,
    },
    toolsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 9,
    },
    toolsTitle: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 15,
      letterSpacing: -0.2,
    },
    toolsRow: {
      flexDirection: 'row',
      gap: 9,
    },
    toolButton: {
      flex: 1,
      minHeight: 72,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: colors.studioInk,
      borderRadius: 18,
      shadowColor: colors.studioShadow,
      shadowOffset: { width: 2, height: 2 },
      shadowOpacity: 1,
      shadowRadius: 0,
      elevation: 2,
    },
    toolLabel: {
      fontFamily: 'DMSans_700Bold',
      color: colors.studioInk,
      fontSize: 10,
    },
  });

  const shortcuts: Shortcut[] = [
    {
      label: 'Habits',
      icon: 'activity',
      color: colors.studioLavender,
      testID: 'dashboard-shortcut-habits',
      accessibilityLabel: 'Open habits',
      onPress: onOpenHabits,
    },
    {
      label: 'Feed',
      icon: 'image',
      color: colors.studioMint,
      testID: 'dashboard-shortcut-feed',
      accessibilityLabel: 'Open Studio Feed',
      onPress: onOpenFeed,
    },
    {
      label: 'Workshops',
      icon: 'play-circle',
      color: colors.studioYellow,
      testID: 'dashboard-shortcut-workshops',
      accessibilityLabel: 'Open workshops',
      onPress: onOpenWorkshops,
    },
  ];

  return (
    <View style={styles.container} testID="dashboard-sticker-jam-card">
      <View style={styles.intro}>
        <View style={styles.eyebrowRow}>
          <View style={styles.eyebrowDot} />
          <Text style={styles.eyebrow}>TODAY’S PRACTICE</Text>
        </View>
        <View style={styles.headlineRow}>
          <Text style={styles.headline}>Make a little{'\n'}noise.</Text>
          <View
            style={styles.streakSticker}
            accessible
            accessibilityLabel={`${streak} day making streak`}
            testID="dashboard-making-streak"
          >
            <Text style={styles.streakValue}>{streak}</Text>
            <Text style={styles.streakLabel}>DAY STREAK</Text>
            <View style={styles.flameSticker} accessible={false}>
              <Feather name="zap" size={13} color={colors.studioInk} />
            </View>
          </View>
        </View>
        <Text style={styles.subtitle}>Start small. Make something today.</Text>
      </View>

      <View>
        <ScrollView
          ref={carouselRef}
          horizontal
          pagingEnabled
          decelerationRate="fast"
          disableIntervalMomentum
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => setActiveSlide(Math.max(0, Math.min(SLIDE_LABELS.length - 1, Math.round(event.nativeEvent.contentOffset.x / slideWidth))))}
          style={{ height: 228 }}
          testID="dashboard-canvas-carousel"
        >
          <View style={{ width: slideWidth }}>
            <TouchableOpacity
              style={styles.habitFrame}
              onPress={onOpenHabits}
              accessibilityRole="button"
              accessibilityLabel={activeHabit
                ? `${activeHabit.completedToday ? 'View' : 'Log'} today's habit: ${activeHabit.name}`
                : 'Set up your first daily habit'}
              testID="dashboard-active-habit-slide"
            >
              <Image
                source={require('../assets/images/daily-habit-workspace.jpg')}
                style={styles.fullBleedImage}
                resizeMode="cover"
                accessible={false}
              />
              <View style={styles.fullBleedWash} />
              <View style={styles.habitTopline}>
                <Text style={styles.habitEyebrow}>TODAY’S HABIT</Text>
                <View style={styles.habitStatus}>
                  <Text style={styles.habitStatusText}>
                    {activeHabit ? activeHabit.completedToday ? 'DONE TODAY' : 'DAILY PRACTICE' : 'GET STARTED'}
                  </Text>
                </View>
              </View>
              <View style={styles.habitContentPanel}>
                <Text style={styles.habitName} numberOfLines={2}>
                  {activeHabit?.name ?? (habitsLoading ? 'Loading your habit…' : habitsError ? 'Your habit is unavailable' : 'Choose a habit to begin')}
                </Text>
                <Text style={styles.habitDetails} numberOfLines={2}>
                  {activeHabit
                    ? `${activeHabit.category} · ${activeHabit.targetMinutes} min · ${activeHabit.currentStreak} day streak`
                    : habitsError ? 'Open Habits to try again.' : 'Build a small creative practice, one day at a time.'}
                </Text>
              </View>
              <View style={styles.habitAction}>
                <Text style={styles.habitActionText}>
                  {activeHabit ? activeHabit.completedToday ? 'View your habits' : 'Log today’s practice' : 'Open habits'}
                </Text>
                <Feather name="arrow-up-right" size={15} color={colors.studioInk} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ width: slideWidth }}>
            <TouchableOpacity
              style={styles.workshopFrame}
              onPress={onOpenWorkshops}
              accessibilityRole="button"
              accessibilityLabel="Workshops coming soon. Explore available workshops."
              testID="dashboard-workshop-slide"
            >
              <Image
                source={require('../assets/images/workshop-preview.jpg')}
                style={styles.fullBleedImage}
                resizeMode="cover"
                accessible={false}
              />
              <View style={styles.fullBleedWash} />
              <View style={styles.habitTopline}>
                <View style={styles.workshopMark}><Feather name="play-circle" size={20} color={colors.studioInk} /></View>
                <View style={styles.workshopBadge}><Text style={styles.workshopBadgeText}>COMING SOON</Text></View>
              </View>
              <View style={styles.workshopContentPanel}>
                <Text style={styles.workshopTitle}>Workshop Studio</Text>
                <Text style={styles.workshopDetails} numberOfLines={3}>New artist-led classes are on the way. Explore workshops available now.</Text>
              </View>
              <View style={styles.workshopAction}>
                <Text style={styles.workshopActionText}>Explore workshops</Text>
                <Feather name="arrow-up-right" size={15} color={colors.studioInk} />
              </View>
            </TouchableOpacity>
          </View>
          <View style={{ width: slideWidth }}>
            <View style={styles.canvasFrame}>
              <Image
                source={require('../assets/images/sticker-jam-sketchbook.jpg')}
                style={styles.canvasImage}
                resizeMode="cover"
                accessible
                accessibilityLabel="An artist sketching in a colorful sketchbook"
              />
              <View style={styles.canvasLabel}>
                <Text style={styles.canvasLabelText}>Your canvas</Text>
              </View>
              <TouchableOpacity
                style={styles.startButton}
                onPress={onStartSketch}
                accessibilityRole="button"
                accessibilityLabel="Start a 60-second Flash Sketch"
                testID="dashboard-mini-habit-studio-open"
              >
                <Text style={styles.startButtonText}>Start a sketch</Text>
                <Feather name="arrow-up-right" size={16} color={colors.studioInk} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={{ width: slideWidth }}>
            <TouchableOpacity
              style={styles.eventsFrame}
              onPress={onOpenEvents}
              accessibilityRole="button"
              accessibilityLabel={`Open events. Next: ${eventTitle}`}
              testID="dashboard-events-slide"
            >
              <Image
                source={require('../assets/images/workshop-preview.jpg')}
                style={styles.eventsBackdropImage}
                resizeMode="cover"
                accessible={false}
              />
              <View style={styles.eventsBackdropWash} />
              <View style={[styles.eventsPosterFrame, { width: posterWidth, height: posterHeight }]}>
                {showsFleaFlyer ? (
                  <Image
                    source={require('../assets/images/los-feliz-flea-flyer.jpg')}
                    style={styles.eventsPosterImage}
                    resizeMode="contain"
                    accessible
                    accessibilityLabel="Los Feliz Flea tattoo studio flyer"
                  />
                ) : (
                  <View style={styles.eventsPosterFallback}>
                    <Feather name="calendar" size={28} color={colors.studioInk} />
                  </View>
                )}
              </View>
              <View style={styles.eventsBody}>
                <View style={styles.eventsInfoPanel}>
                  <View style={styles.eventsCopy}>
                    <Text style={styles.eventsEyebrow}>{showsFleaFlyer ? 'WEEKLY RESIDENCY' : 'COMMUNITY'}</Text>
                    <Text style={styles.eventsTitle} numberOfLines={3}>
                      {eventTitle}
                    </Text>
                    <Text style={styles.eventsDetails} numberOfLines={2}>{eventDetails}</Text>
                  </View>
                </View>
                <View style={styles.eventsCta}>
                  <Text style={styles.eventsCtaText}>Browse events</Text>
                  <Feather name="arrow-right" size={14} color={colors.studioInk} />
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>
        <View style={styles.slideIndicators} accessibilityLabel={`Dashboard card ${activeSlide + 1} of ${SLIDE_LABELS.length}`}>
          {SLIDE_LABELS.map((label, index) => (
            <TouchableOpacity
              key={label}
              style={styles.indicatorButton}
              onPress={() => goToSlide(index)}
              accessibilityRole="button"
              accessibilityLabel={`Show ${label} slide`}
              accessibilityState={{ selected: activeSlide === index }}
              testID={`dashboard-slide-${index + 1}`}
            >
              <View style={[styles.indicator, activeSlide === index && styles.activeIndicator]} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View>
        <View style={styles.toolsHeader}>
          <Text style={styles.toolsTitle}>Pick your next move</Text>
              <Feather name="star" size={17} color={colors.studioViolet} />
        </View>
        <View style={styles.toolsRow}>
          {shortcuts.map((shortcut) => (
            <TouchableOpacity
              key={shortcut.testID}
              style={[styles.toolButton, { backgroundColor: shortcut.color }]}
              onPress={shortcut.onPress}
              accessibilityRole="button"
              accessibilityLabel={shortcut.accessibilityLabel}
              testID={shortcut.testID}
            >
              <Feather name={shortcut.icon} size={21} color={colors.studioInk} />
              <Text style={styles.toolLabel}>{shortcut.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}
