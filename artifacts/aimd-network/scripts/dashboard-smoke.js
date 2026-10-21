const fs = require('fs');
const path = require('path');

const dashboardPath = path.resolve(
  __dirname,
  '..',
  'app',
  '(tabs)',
  'index.tsx',
);

const MOBILE_VIEWPORT = {
  width: 400,
  height: 720,
};

function readDashboardSource() {
  return fs.readFileSync(dashboardPath, 'utf8');
}

function assertIncludes(source, value, description) {
  if (!source.includes(value)) {
    throw new Error(`Dashboard smoke contract missing ${description}: ${value}`);
  }
}

function assertDashboardSmokeContract() {
  const source = readDashboardSource();
  const loadingState = source.indexOf('testID="dashboard-loading-state"');
  const loadedState = source.indexOf('testID="dashboard-loaded-state"');

  assertIncludes(source, 'testID="progress-screen"', 'screen root');
  assertIncludes(source, 'progressLoading && !progress', 'in-place loading condition');
  assertIncludes(source, '{progress && (', 'resolved dashboard condition');
  assertIncludes(source, 'Loading your dashboard…', 'loading copy');
  assertIncludes(source, '<StickerJamPracticeCard', 'Sticker Jam practice card');

  if (loadingState === -1 || loadedState === -1) {
    throw new Error('Dashboard smoke contract is missing state test IDs');
  }

  if (loadingState >= loadedState) {
    throw new Error(
      'Dashboard smoke contract must declare the loading state before the loaded state',
    );
  }

  console.log('Dashboard smoke contract passed');
  console.log(
    `Native smoke viewport: ${MOBILE_VIEWPORT.width}x${MOBILE_VIEWPORT.height}`,
  );
}

function printDeviceSmokeFlow() {
  console.log(`
Repeatable native dashboard smoke flow
1. Open AIMD Network in Expo Go or the TestFlight build on a device/simulator
   using a 400x720 mobile-sized viewport (iPhone SE is a suitable reference).
2. Start from a cold launch, open the Dashboard tab, and watch the first render.
3. Before the progress request resolves, confirm the dashboard header remains
   visible and the in-place loading card with "Loading your dashboard…" appears.
4. Wait for the progress response. Confirm the loading card is replaced by the
   dashboard progress content below the Sticker Jam practice card.
5. Confirm the screen is not blank and the dashboard remains scrollable.
6. Treat a missing loading card, a persistent loading card, or a blank screen
   as a release-blocking regression.
`);
}

if (require.main === module) {
  try {
    assertDashboardSmokeContract();
    printDeviceSmokeFlow();
  } catch (error) {
    console.error(`Dashboard smoke contract failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  MOBILE_VIEWPORT,
  assertDashboardSmokeContract,
};