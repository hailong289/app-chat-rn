const fs = require('fs');
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
} = require('../env.json');

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
console.log(`✅ Generated ${outputPath}`);
