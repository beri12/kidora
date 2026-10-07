import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Kidora app configuration.
 *
 * Profile-aware: EAS sets EAS_BUILD_PROFILE, and EXPO_PUBLIC_ENVIRONMENT
 * selects the API. Non-production builds get a distinct bundle id so dev,
 * preview and production can be installed side by side.
 *
 * Permissions are deliberately minimal (child-directed app): no location,
 * contacts, camera or microphone. Notifications are requested only after
 * sign-in.
 */
const PROFILE = process.env.EAS_BUILD_PROFILE ?? process.env.EXPO_PUBLIC_ENVIRONMENT ?? 'development';
const IS_PROD = PROFILE === 'production';
const SUFFIX = IS_PROD ? '' : PROFILE === 'preview' ? '.preview' : '.dev';
const NAME = IS_PROD ? 'Kidora' : PROFILE === 'preview' ? 'Kidora (Preview)' : 'Kidora (Dev)';
const BRAND = '#7C3AED';
const WEB_HOST = 'justkidora.com';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: NAME,
  slug: 'kidora',
  scheme: 'kidora',
  version: '1.0.0',
  runtimeVersion: { policy: 'appVersion' },
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: `com.kidora.app${SUFFIX}`,
    supportsTablet: true,
    buildNumber: '1',
    associatedDomains: [`applinks:${WEB_HOST}`, `applinks:www.${WEB_HOST}`],
    config: { usesNonExemptEncryption: false },
    infoPlist: {
      // Kids category: no tracking, so App Tracking Transparency is never requested.
      ITSAppUsesNonExemptEncryption: false,
    },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [],
      NSPrivacyAccessedAPITypes: [
        { NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults', NSPrivacyAccessedAPITypeReasons: ['CA92.1'] },
      ],
    },
  },
  android: {
    package: `com.kidora.app${SUFFIX}`,
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: BRAND,
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    // Only what the app needs. Anything a library would add implicitly is blocked.
    permissions: ['android.permission.INTERNET', 'android.permission.ACCESS_NETWORK_STATE', 'android.permission.VIBRATE', 'android.permission.POST_NOTIFICATIONS'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.READ_CONTACTS',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          { scheme: 'https', host: WEB_HOST, pathPrefix: '/app' },
          { scheme: 'https', host: `www.${WEB_HOST}`, pathPrefix: '/app' },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  web: { favicon: './assets/favicon.png', bundler: 'metro', output: 'single' },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-localization',
    'expo-web-browser',
    'expo-font',
    'expo-video',
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 200,
        resizeMode: 'contain',
        backgroundColor: BRAND,
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notification-icon.png',
        color: BRAND,
        defaultChannel: 'default',
      },
    ],
    // Playback only: no microphone until voice chat ships (see features/ai/voice.ts).
    ['expo-audio', { microphonePermission: false, recordAudioAndroid: false }],
  ],
  experiments: { typedRoutes: false },
  extra: {
    environment: PROFILE,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
  owner: process.env.EXPO_OWNER,
});
