import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const capacitorConfig = JSON.parse(
  await readFile(resolve(root, "capacitor.config.json"), "utf8"),
);
const failures = [];

const requiredPackages = [
  "@capacitor/core",
  "@capacitor/app",
  "@capacitor/haptics",
  "@capacitor/keyboard",
  "@capacitor/share",
  "@capacitor/splash-screen",
  "@capacitor/status-bar",
  "@capacitor/cli",
  "@capacitor/android",
  "@capacitor/ios",
];

function dependencyVersion(name) {
  return packageJson.dependencies?.[name] ?? packageJson.devDependencies?.[name] ?? null;
}

for (const name of requiredPackages) {
  const version = dependencyVersion(name);

  if (!version) {
    failures.push(`Отсутствует обязательный пакет ${name}`);
  } else if (!/^[~^]?8\./u.test(version)) {
    failures.push(`${name} должен использовать общий major Capacitor 8: ${version}`);
  }
}

if (!/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){2,}$/u.test(capacitorConfig.appId ?? "")) {
  failures.push("capacitor.config.json содержит некорректный appId");
}

if (capacitorConfig.webDir !== "dist") {
  failures.push("Capacitor webDir должен указывать на dist");
}

const requiredFiles = [
  "android/app/src/main/AndroidManifest.xml",
  `android/app/src/main/java/${String(capacitorConfig.appId).replaceAll(".", "/")}/MainActivity.java`,
  "android/gradlew.bat",
  "ios/App/App.xcodeproj/project.pbxproj",
  "ios/App/App/AppDelegate.swift",
  "ios/App/CapApp-SPM/Package.swift",
  "src/platform/nativeRuntime.ts",
  "src/platform/nativeBridge.ts",
  "src/platform/share.ts",
];

for (const path of requiredFiles) {
  try {
    await access(resolve(root, path));
  } catch {
    failures.push(`Отсутствует нативный файл ${path}`);
  }
}

const mainSource = await readFile(resolve(root, "src/main.tsx"), "utf8");
const bridgeSource = await readFile(resolve(root, "src/platform/nativeBridge.ts"), "utf8");

if (!mainSource.includes("initializeNativeRuntime")) {
  failures.push("Приложение не запускает нативный runtime");
}

if (!bridgeSource.includes('"@capacitor/haptics"')) {
  failures.push("Haptics не подключён через официальный Capacitor plugin");
}

if (failures.length > 0) {
  console.error("Native project check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Native project check passed: ${requiredPackages.length} packages, Android and iOS shells`,
  );
}
