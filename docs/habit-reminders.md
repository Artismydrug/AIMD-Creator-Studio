# Daily habit reminders

Each habit can have one optional daily alert with a local time and a message.
Defaults can be edited; saving explicitly requests notification permission.
Alerts are scheduled on the device, not sent by SMS or a paid push provider.
Browser previews do not support these native notifications.

Settings are device-local and separated by signed-in account. Edits replace the
same OS request rather than adding duplicates. Turning a reminder off or deleting
its habit cancels it. Sign-out pauses app habit alerts; signing in restores the
current account's saved alerts after checking its current habit list. Returning
to the foreground repeats this check so deleted habits are removed. Account
deletion clears that account's saved settings. Notification failures are shown.

## Native build requirement

Build and install a new iOS/TestFlight binary including `expo-notifications`.
Publishing the web/API or sending an update to an old binary does not install a
new native module. This feature has not been verified through actual iOS delivery
in this workspace. Before resubmission, on a physical device:

1. Save a reminder a few minutes ahead and accept permission.
2. Background/close the app; verify the notification and its chosen message.
3. Change the time and confirm only one alert remains; turn it off and confirm cancellation.
4. Deny permission and confirm a clear error and working Open Settings control.
5. Delete a habit, sign out, and switch accounts; confirm no old-account alerts.

Times follow the device's local clock, including time-zone changes. Delivery can
be affected by system permissions, Focus modes, battery restrictions and OS limits.
Settings do not sync between devices. The app prevents adding requests past 60
scheduled alerts to leave headroom below the iOS system limit.

## Automated reminder checks

From the workspace root:

```sh
pnpm --filter @workspace/api-server exec esbuild "$PWD/artifacts/aimd-network/lib/habitReminderEngine.test.ts" --bundle --platform=node --format=cjs --outfile=/tmp/aimd-habit-reminder-tests.cjs
node --test /tmp/aimd-habit-reminder-tests.cjs
```

These check persistence, edits, cancellation, account separation, input validation
and rollback after storage failure, not actual OS notification delivery.
