export type ErrorDiagnosticStage =
  | 'APP' | 'SHELL' | 'NOTIFY' | 'MEMBERSHIP' | 'KEYBOARD' | 'DASHBOARD'
  | 'NAVIGATION' | 'WORKSHOPS' | 'PROFILE' | 'FEED';

type ErrorDiagnosticCause =
  | 'NATIVE' | 'HOOKS' | 'QUERY' | 'NAVIGATION'
  | 'TYPE' | 'REFERENCE' | 'RANGE' | 'SYNTAX' | 'ERROR';

export type ErrorDiagnosticCode = `CS-${ErrorDiagnosticStage}-${ErrorDiagnosticCause}`;

const components: ReadonlyArray<readonly [string, ErrorDiagnosticStage]> = [
  ['NotificationLifecycle', 'NOTIFY'],
  ['SubscriptionProvider', 'MEMBERSHIP'],
  ['KeyboardProvider', 'KEYBOARD'],
  ['ProgressScreen', 'DASHBOARD'],
  ['TabLayout', 'NAVIGATION'],
  ['RootLayoutNav', 'NAVIGATION'],
  ['WorkshopsScreen', 'WORKSHOPS'],
  ['WorkshopScreen', 'WORKSHOPS'],
  ['ProfileScreen', 'PROFILE'],
  ['FeedScreen', 'FEED'],
];

/**
 * Local support labels only. Never return the message, stack, path, URL,
 * identity, or arbitrary component names from the exception.
 */
export function getErrorDiagnosticCode(
  error: unknown,
  componentStack: string | null = null,
  preferredStage: ErrorDiagnosticStage = 'APP',
): ErrorDiagnosticCode {
  try {
    const stages = new Set<ErrorDiagnosticStage>(['APP', 'SHELL', ...components.map(([, value]) => value)]);
    let stage = stages.has(preferredStage) ? preferredStage : 'APP';
    if (stage !== 'NOTIFY' && componentStack) {
      for (const line of componentStack.split('\n')) {
        const frame = line.match(/^\s*(?:at\s+)?(?:ForwardRef\()?([A-Za-z_$][\w$]*)/);
        const known = components.find(([name]) => name === frame?.[1]);
        if (known) {
          stage = known[1];
          break;
        }
      }
    }

    let cause: ErrorDiagnosticCause = 'ERROR';
    if (error instanceof Error) {
      const message = error.message.slice(0, 8_000);
      if (/Rendered (more|fewer) hooks|Invalid hook call|change in the order of Hooks/i.test(message)) {
        cause = 'HOOKS';
      } else if (/No QueryClient set/i.test(message)) {
        cause = 'QUERY';
      } else if (/TurboModuleRegistry|native module|requireNativeComponent|RNKeyboardController|worklets.*(?:mismatch|initializ)|native.*(?:not found|not available|not linked)/i.test(message)) {
        cause = 'NATIVE';
      } else if (/before mounting.*Root Layout|Couldn't find.*navigation|Couldn't register.*navigator|NavigationContainer/i.test(message)) {
        cause = 'NAVIGATION';
      } else {
        const errorNames: Record<string, ErrorDiagnosticCause> = {
          TypeError: 'TYPE', ReferenceError: 'REFERENCE',
          RangeError: 'RANGE', SyntaxError: 'SYNTAX',
        };
        cause = Object.prototype.hasOwnProperty.call(errorNames, error.name)
          ? errorNames[error.name]
          : 'ERROR';
      }
    }
    return `CS-${stage}-${cause}`;
  } catch {
    // Diagnostics must not introduce a second error while recovering.
    return 'CS-APP-ERROR';
  }
}
