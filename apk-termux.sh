#!/data/data/com.termux/files/usr/bin/bash
# Gera o APK do QUEDA LIVRE no Termux (precisa do Android SDK em ~/android-sdk e do aapt2 do Termux).
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"
# uso: bash apk-termux.sh https://seu-jogo.onrender.com
URL="${1:-}"
if [ -z "$URL" ]; then echo "Use: bash apk-termux.sh https://SEU-SITE.onrender.com"; exit 1; fi
HOST="${URL#https://}"; HOST="${HOST%%/*}"
sed -i "s#\"url\": \"[^\"]*\"#\"url\": \"$URL\"#" capacitor.config.json
grep -q allowNavigation capacitor.config.json || sed -i "s#\"errorPath\": \"offline.html\"#\"errorPath\": \"offline.html\",\n    \"allowNavigation\": [\"$HOST\"]#" capacitor.config.json
npm install
npm install --no-save @capacitor/core@6.2.0 @capacitor/cli@6.2.0 @capacitor/android@6.2.0
npx cap telemetry off
[ -d android ] || npx cap add android
M="$REPO/android/app/src/main/AndroidManifest.xml"
grep -q screenOrientation "$M" || sed -i 's/<activity/<activity android:screenOrientation="sensorLandscape"/' "$M"
npx cap sync android
cd "$REPO/android"
echo "sdk.dir=$HOME/android-sdk" > local.properties
sed -i '/android.aapt2FromMavenOverride/d' gradle.properties
echo "android.aapt2FromMavenOverride=$PREFIX/bin/aapt2" >> gradle.properties
chmod +x gradlew
./gradlew clean assembleDebug
APK="$REPO/android/app/build/outputs/apk/debug/app-debug.apk"
[ -f "$APK" ] || { echo "ERRO: APK não foi criado."; exit 1; }
mkdir -p "$HOME/storage/downloads"
cp "$APK" "$HOME/storage/downloads/QUEDA-LIVRE.apk"
echo "APK criado com sucesso:"
ls -lh "$HOME/storage/downloads/QUEDA-LIVRE.apk"
