import React, { type ComponentType } from 'react';
import { Redirect } from 'expo-router';
import { DEFERRED_FEATURE_DESTINATIONS, LAUNCH_FEATURES, type LaunchFeature } from '@/lib/launchFeatures';

/** Check scope before mounting hooks, fetching feature data, or requesting media. */
export function withLaunchFeature<P extends object>(feature: LaunchFeature, Screen: ComponentType<P>) {
  return function LaunchFeatureScreen(props: P) {
    if (!LAUNCH_FEATURES[feature]) return <Redirect href={DEFERRED_FEATURE_DESTINATIONS[feature]} />;
    return <Screen {...props} />;
  };
}
