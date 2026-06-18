const fs = require('fs');
const path = require('path');
const {
  FIREBASE_PROJECT_NUMBER,
  FIREBASE_PROJECT_ID,
  FIREBASE_STORAGE_BUCKET,
  FIREBASE_APP_ID,
  FIREBASE_PACKAGE_NAME,
  FIREBASE_CLIENT_ID_1,
  FIREBASE_CERT_HASH_1,
  FIREBASE_CLIENT_ID_2,
  FIREBASE_CERT_HASH_2,
  FIREBASE_CLIENT_ID_3,
  FIREBASE_API_KEY,
  FIREBASE_IOS_APP_ID,
  FIREBASE_IOS_BUNDLE_ID,
  FIREBASE_IOS_CLIENT_ID,
  FIREBASE_IOS_API_KEY,
} = require('../env.json');

function requireEnv(name, value) {
  if (!value) {
    throw new Error(`Missing ${name} in env.json`);
  }
}

function toReversedClientId(clientId) {
  const suffix = clientId.replace(/\.apps\.googleusercontent\.com$/, '');
  if (!suffix || suffix === clientId) {
    throw new Error(`Invalid FIREBASE_IOS_CLIENT_ID: ${clientId}`);
  }
  return `com.googleusercontent.apps.${suffix}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateAndroidConfig() {
  const config = {
    project_info: {
      project_number: FIREBASE_PROJECT_NUMBER,
      project_id: FIREBASE_PROJECT_ID,
      storage_bucket: FIREBASE_STORAGE_BUCKET,
    },
    client: [
      {
        client_info: {
          mobilesdk_app_id: FIREBASE_APP_ID,
          android_client_info: {
            package_name: FIREBASE_PACKAGE_NAME,
          },
        },
        oauth_client: [
          {
            client_id: FIREBASE_CLIENT_ID_1,
            client_type: 1,
            android_info: {
              package_name: FIREBASE_PACKAGE_NAME,
              certificate_hash: FIREBASE_CERT_HASH_1,
            },
          },
          {
            client_id: FIREBASE_CLIENT_ID_2,
            client_type: 1,
            android_info: {
              package_name: FIREBASE_PACKAGE_NAME,
              certificate_hash: FIREBASE_CERT_HASH_2,
            },
          },
          {
            client_id: FIREBASE_CLIENT_ID_3,
            client_type: 3,
          },
        ],
        api_key: [
          {
            current_key: FIREBASE_API_KEY,
          },
        ],
        services: {
          appinvite_service: {
            other_platform_oauth_client: [
              {
                client_id: FIREBASE_CLIENT_ID_3,
                client_type: 3,
              },
            ],
          },
        },
      },
    ],
    configuration_version: '1',
  };

  const outputPath = './android/app/google-services.json';
  fs.writeFileSync(outputPath, JSON.stringify(config, null, 2));
  console.log(`Generated ${outputPath}`);
}

function generateIosConfig() {
  requireEnv('FIREBASE_IOS_APP_ID', FIREBASE_IOS_APP_ID);
  requireEnv('FIREBASE_IOS_CLIENT_ID', FIREBASE_IOS_CLIENT_ID);

  const bundleId = FIREBASE_IOS_BUNDLE_ID || FIREBASE_PACKAGE_NAME;
  requireEnv('FIREBASE_IOS_BUNDLE_ID (or FIREBASE_PACKAGE_NAME)', bundleId);

  const apiKey = FIREBASE_IOS_API_KEY || FIREBASE_API_KEY;
  requireEnv('FIREBASE_IOS_API_KEY (or FIREBASE_API_KEY)', apiKey);

  const reversedClientId = toReversedClientId(FIREBASE_IOS_CLIENT_ID);

  const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>CLIENT_ID</key>
\t<string>${escapeXml(FIREBASE_IOS_CLIENT_ID)}</string>
\t<key>REVERSED_CLIENT_ID</key>
\t<string>${escapeXml(reversedClientId)}</string>
\t<key>ANDROID_CLIENT_ID</key>
\t<string>${escapeXml(FIREBASE_CLIENT_ID_1)}</string>
\t<key>API_KEY</key>
\t<string>${escapeXml(apiKey)}</string>
\t<key>GCM_SENDER_ID</key>
\t<string>${escapeXml(FIREBASE_PROJECT_NUMBER)}</string>
\t<key>PLIST_VERSION</key>
\t<string>1</string>
\t<key>BUNDLE_ID</key>
\t<string>${escapeXml(bundleId)}</string>
\t<key>PROJECT_ID</key>
\t<string>${escapeXml(FIREBASE_PROJECT_ID)}</string>
\t<key>STORAGE_BUCKET</key>
\t<string>${escapeXml(FIREBASE_STORAGE_BUCKET)}</string>
\t<key>IS_ADS_ENABLED</key>
\t<false></false>
\t<key>IS_ANALYTICS_ENABLED</key>
\t<false></false>
\t<key>IS_APPINVITE_ENABLED</key>
\t<true></true>
\t<key>IS_GCM_ENABLED</key>
\t<true></true>
\t<key>IS_SIGNIN_ENABLED</key>
\t<true></true>
\t<key>GOOGLE_APP_ID</key>
\t<string>${escapeXml(FIREBASE_IOS_APP_ID)}</string>
</dict>
</plist>
`;

  const outputPath = './ios/AppChatRN/GoogleService-Info.plist';
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, plist);
  console.log(`Generated ${outputPath}`);
}

generateAndroidConfig();
generateIosConfig();
