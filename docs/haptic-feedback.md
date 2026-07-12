# Haptic feedback preparation

This layer prepares the app for mobile tactile feedback without adding visible UI.

Current behavior:
- selecting a piece gives a light feedback signal;
- making a move gives a slightly stronger signal;
- solving the best-move training task gives success feedback;
- failing a training task gives warning feedback;
- tapping an invalid target after selecting a piece gives error feedback.

On web, the app uses `navigator.vibrate()` when the browser supports it. Many desktop browsers and iOS Safari ignore it, which is expected.

In the future native Android/iOS shell, `src/platform/nativeBridge.ts` can be connected to Capacitor Haptics. The app already has a single place for that integration.
