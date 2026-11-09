const fs = require('fs');
const path = require('path');

const dashboardPath = path.resolve(
  __dirname,
  '..',
  'app',
  '(tabs)',
  'index.tsx',
);
const practiceCardPath = path.resolve(__dirname, '..', 'components', 'StickerJamPracticeCard.tsx');
const colorsPath = path.resolve(__dirname, '..', 'constants', 'colors.ts');
const residencyCardPath = path.resolve(__dirname, '..', 'components', 'TattooBusResidencyCard.tsx');
const flyerPath = path.resolve(__dirname, '..', 'assets', 'images', 'los-feliz-flea-flyer.jpg');

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
  const practiceCard = fs.readFileSync(practiceCardPath, 'utf8');
  const colors = fs.readFileSync(colorsPath, 'utf8');
  const residencyCard = fs.readFileSync(residencyCardPath, 'utf8');
  const loadingState = source.indexOf('testID="dashboard-loading-state"');
  const loadedState = source.indexOf('testID="dashboard-loaded-state"');

  assertIncludes(source, 'testID="progress-screen"', 'screen root');
  assertIncludes(source, 'progressLoading && !progress', 'in-place loading condition');
  assertIncludes(source, '{progress && (', 'resolved dashboard condition');
  assertIncludes(source, 'Loading your dashboard…', 'loading copy');
  assertIncludes(source, '<StickerJamPracticeCard', 'Sticker Jam practice card');
  assertIncludes(practiceCard, 'los-feliz-flea-flyer.jpg', 'Los Feliz flyer in the home carousel');
  assertIncludes(practiceCard, 'testID="dashboard-active-habit-slide"', 'daily habit as the first carousel slide');
  assertIncludes(practiceCard, 'testID="dashboard-workshop-slide"', 'workshops as the second carousel slide');
  assertIncludes(practiceCard, 'COMING SOON', 'workshop availability badge');
  assertIncludes(practiceCard, 'workshop-preview.jpg', 'workshop preview art card');
  assertIncludes(colors, "studioPhotoInk: '#21162C'", 'theme-stable dark carousel caption text');
  assertIncludes(colors, "studioPhotoPaper: '#FFFBF3'", 'theme-stable light carousel caption surface');
  assertIncludes(practiceCard, 'color: colors.studioPhotoInk', 'high-contrast carousel caption text');
  assertIncludes(practiceCard, 'backgroundColor: colors.studioPhotoPaper', 'high-contrast carousel caption surface');
  if (practiceCard.indexOf('testID="dashboard-active-habit-slide"') > practiceCard.indexOf('testID="dashboard-workshop-slide"')) {
    throw new Error('Dashboard carousel must put Today’s Habit before the Workshops slide');
  }
  assertIncludes(residencyCard, 'los-feliz-flea-flyer.jpg', 'Los Feliz flyer in the event listing');
  if (!fs.existsSync(flyerPath)) {
    throw new Error(`Dashboard smoke contract could not find the event flyer: ${flyerPath}`);
  }

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