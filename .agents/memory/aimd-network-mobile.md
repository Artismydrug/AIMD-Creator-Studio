---
name: AIMD Network mobile app
description: Key decisions and quirks from building the Expo mobile app for AIMD Network
---

## Design tokens
- Synced from aimd-academy's index.css — dark-first palette, radius: 0 (sharp corners), emerald primary #33cc66
- Both light and dark keys use same dark values since the app is always dark-mode

## Font
- Uses DM Sans (@expo-google-fonts/dm-sans) matching the web app, not Inter
- Weights: DM_Sans_400Regular, DM_Sans_500Medium, DM_Sans_600SemiBold, DM_Sans_700Bold

## API client
- setBaseUrl must be called at module level in _layout.tsx (outside any component)
- Conversations, directory, comments endpoints were NOT in the original openapi.yaml — they were added and codegen re-run before building the app
- expo-camera must be pinned to ~17.0.10 for Expo SDK 54 (57.x was installed by default and incompatible)

## Architecture
- Tab layout: Feed (index), Habits, messages, directory, events — 5 tabs
- Conversation thread at app/conversation/[id].tsx — inverted FlatList + KeyboardAvoidingView from react-native-keyboard-controller
- QR check-in uses expo-camera CameraView with barcodeScannerSettings — wrapped in Platform.OS !== 'web' guard
- CURRENT_USER_ID hardcoded as 1 (matches server default) — will be replaced when auth lands (Task #10)

**Why:** The API server uses cors() with no options (allows all origins), so CORS works once the API Server workflow is running. Both workflows must be running for web preview to work.
