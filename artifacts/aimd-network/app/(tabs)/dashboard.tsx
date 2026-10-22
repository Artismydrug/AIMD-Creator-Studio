import { DashboardScreen } from './index';
import { withLaunchFeature } from '@/components/LaunchFeatureScreen';

// Keep old links safe while the reward wheel and duplicate analytics are deferred.
export default withLaunchFeature('dashboard', DashboardScreen);
