#!/data/data/com.termux/files/usr/bin/bash
# Gera o APK do ALVO ZERO no Termux (precisa do Android SDK em ~/android-sdk e do aapt2 do Termux).
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
# tela cheia de verdade: sem barra de status, sem barra de navegação, sem faixa branca no recorte da câmera
STY="$REPO/android/app/src/main/res/values/styles.xml"
if ! grep -q windowLayoutInDisplayCutoutMode "$STY"; then
  sed -i 's#</style>#    <item name="android:windowFullscreen">true</item>\n        <item name="android:windowLayoutInDisplayCutoutMode">shortEdges</item>\n        <item name="android:statusBarColor">@android:color/black</item>\n        <item name="android:navigationBarColor">@android:color/black</item>\n    </style>#' "$STY"
  sed -i '/name="AppTheme.NoActionBar"/,/<\/style>/ s#</style>#    <item name="android:windowBackground">@android:color/black</item>\n    </style>#' "$STY"
fi
MA="$REPO/android/app/src/main/java/com/alvozero/fps/MainActivity.java"
mkdir -p "$(dirname "$MA")"
cat > "$MA" <<'JAVA'
package com.alvozero.fps;

import android.os.Build;
import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle b) { super.onCreate(b); telaCheia(); }
    @Override public void onResume() { super.onResume(); telaCheia(); }
    @Override public void onWindowFocusChanged(boolean foco) { super.onWindowFocusChanged(foco); if (foco) telaCheia(); }
    private void telaCheia() {
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams p = getWindow().getAttributes();
            p.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            getWindow().setAttributes(p);
        }
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        getWindow().getDecorView().setBackgroundColor(0xFF0D1117);
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
JAVA
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
cp "$APK" "$HOME/storage/downloads/ALVO-ZERO.apk"
echo "APK criado com sucesso:"
ls -lh "$HOME/storage/downloads/ALVO-ZERO.apk"
