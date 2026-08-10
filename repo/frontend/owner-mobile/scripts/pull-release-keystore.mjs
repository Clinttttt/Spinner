// Pulls the Android release keystore that EAS holds for this project into ./credentials,
// so `gradlew assembleRelease` on a development machine signs with the same certificate
// EAS uses.
//
// This matters beyond tidiness: the Google Maps Android key is restricted to this package
// name plus the SHA-1 of that certificate. A debug-signed local build is refused a map
// token and the MapView renders black. Signing correctly also lets a local build install
// over an EAS build instead of failing on a signature mismatch.
//
// Requires an EAS login (npx eas-cli login). Prints no secret material.
//
// Usage: node scripts/pull-release-keystore.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(here, "..");
const outDir = path.join(projectRoot, "credentials");

// Read from app.config.js rather than repeating the id, so the two cannot drift.
const appConfig = createRequire(import.meta.url)(
  path.join(projectRoot, "app.config.js"),
);
const projectId = appConfig.expo?.extra?.eas?.projectId;

if (!projectId) {
  console.error("No expo.extra.eas.projectId in app.config.js.");
  process.exit(1);
}

const statePath = path.join(os.homedir(), ".expo", "state.json");

if (!fs.existsSync(statePath)) {
  console.error("No EAS session found. Run: npx eas-cli login");
  process.exit(1);
}

const sessionSecret = JSON.parse(fs.readFileSync(statePath, "utf8"))?.auth
  ?.sessionSecret;

if (!sessionSecret) {
  console.error("No EAS session found. Run: npx eas-cli login");
  process.exit(1);
}

const query = `
  query AppCredentials($appId: String!) {
    app {
      byId(appId: $appId) {
        androidAppCredentials {
          applicationIdentifier
          androidAppBuildCredentialsList {
            name
            isDefault
            androidKeystore {
              keyAlias
              keystore
              keystorePassword
              keyPassword
              sha1CertificateFingerprint
              sha256CertificateFingerprint
            }
          }
        }
      }
    }
  }
`;

const response = await fetch("https://api.expo.dev/graphql", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "expo-session": sessionSecret,
  },
  body: JSON.stringify({ query, variables: { appId: projectId } }),
});

const payload = await response.json();

if (payload.errors) {
  console.error("EAS API rejected the request:");
  for (const error of payload.errors) console.error("  " + error.message);
  process.exit(1);
}

const credentialSets = payload.data?.app?.byId?.androidAppCredentials ?? [];

if (credentialSets.length === 0) {
  console.error("EAS holds no Android credentials for this project.");
  process.exit(1);
}

for (const set of credentialSets) {
  const buildCredentials =
    set.androidAppBuildCredentialsList.find((entry) => entry.isDefault) ??
    set.androidAppBuildCredentialsList[0];

  const keystore = buildCredentials?.androidKeystore;

  if (!keystore) {
    console.error(`${set.applicationIdentifier}: no keystore attached.`);
    continue;
  }

  fs.mkdirSync(outDir, { recursive: true });

  const jksPath = path.join(outDir, "spinner-owner-release.jks");
  const bytes = Buffer.from(keystore.keystore, "base64");
  fs.writeFileSync(jksPath, bytes);

  fs.writeFileSync(
    path.join(outDir, "release-signing.properties"),
    [
      "# Pulled from EAS by scripts/pull-release-keystore.mjs. Never commit this file.",
      `storeFile=${jksPath.replace(/\\/g, "/")}`,
      `storePassword=${keystore.keystorePassword}`,
      `keyAlias=${keystore.keyAlias}`,
      `keyPassword=${keystore.keyPassword}`,
      "",
    ].join("\n"),
  );

  console.log(`${set.applicationIdentifier}`);
  console.log(`  credentials : ${buildCredentials.name}`);
  console.log(`  keystore    : ${bytes.length} bytes -> credentials/`);
  console.log(`  SHA-1       : ${keystore.sha1CertificateFingerprint}`);
  console.log(`  SHA-256     : ${keystore.sha256CertificateFingerprint}`);
  console.log("");
  console.log("Add the SHA-1 above to the Google Maps key restrictions if the");
  console.log("map is ever refused for a different certificate.");
}
