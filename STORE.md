# App für den App Store und Google Play

Die Website bleibt die Website. Zusätzlich gibt es eine Hülle für iPhone, iPad und Android. In der Hülle steckt die gebaute App aus dem Ordner `dist`, nicht die Seite im Netz.

Anzeige auf dem Home-Bildschirm: **Schlagfertig Live**

Kennung bei Apple und Google: **`de.schlagfertig.live`**

Die Trommel-App hat eine andere Kennung (`de.schlagfertig.app`). Live ist ein eigener Eintrag in den Stores. Dieselbe Kennung nicht für beide Apps verwenden.

Die App braucht Internet zum Anmelden und für die Songs. Die Daten bleiben in deinem Konto. Mit dieser Hülle kommen keine neuen Songs.

## Einmalig auf deinem Rechner

Im Ordner der Live-App:

```bash
npm install
npm run build:cap
npx cap add ios
npx cap add android
npx -y @capacitor/assets@3 generate --ios --android --iconBackgroundColor '#000000' --iconBackgroundColorDark '#000000' --splashBackgroundColor '#161a1d' --splashBackgroundColorDark '#161a1d'
```

Der letzte Befehl legt euer vorhandenes Icon (das S) auf den Home-Bildschirm. Ohne ihn zeigt das Handy das Standard-Icon der Hülle.

Auf dem Mac fragt der iOS-Befehl nach CocoaPods. Das ist das Werkzeug, mit dem Xcode die Hülle fertigmacht. Wenn dein Mac kein aktuelles Xcode kann, überspringst du das und nimmst den Cloud-Build unter Apple.

Die Ordner `ios/` und `android/` entstehen dabei auf deinem Rechner. Sie sind groß. Im Alltag bleiben sie lokal, wie bei der Trommel-App. Nicht mit `git add .` einchecken, sonst wird die Änderung riesig. Bau-Reste (Pods, Gradle) stehen in der `.gitignore`. Schlüsseldateien (`*.keystore`, `*.p12`) auch nicht ins Repo.

Hochformat und Querformat sind in diesen Ordnern beide an, auf dem iPhone und auf dem iPad. Die Setlist auf dem iPad braucht das Querformat. In `ios/App/App/Info.plist` bleiben die Zeilen mit `Landscape` stehen. In `android/app/src/main/AndroidManifest.xml` bekommt die Activity keinen Zwang auf Hochformat (`screenOrientation`).

## Jeden Build

Wenn die App sich geändert hat und eine neue Store-Version raus soll:

```bash
npm run cap:ios       # öffnet Xcode
npm run cap:android   # öffnet Android Studio
```

Das baut die App neu und kopiert sie in die Hülle.

Oder in zwei Schritten: `npm run cap:sync`, danach Xcode oder Android Studio von Hand öffnen.

`npm run build` ist der Bau für die Website. Für die Stores ist es `npm run build:cap` (steckt in den Befehlen oben).

## Apple (App Store)

- Apple-Developer-Konto, 99 € im Jahr.
- Kennung anlegen: `de.schlagfertig.live`. Anzeigename: Schlagfertig Live.
- Auf einem Mac mit aktuellem Xcode: Archiv bauen, nach TestFlight, dann zur Prüfung.
- Wenn der Mac kein aktuelles Xcode kann: Cloud-Build. GitHub Actions (macOS-Rechner) oder Codemagic. Ablauf dort: `npm install`, `npm run build:cap`, `npx cap add ios`, `npx cap sync ios`, Icon-Befehl von oben, signieren, zu TestFlight schicken. Zertifikat und Schlüssel sind Geheimnisse des Build-Dienstes, nicht Dateien in diesem Repo.
- Weiter mit dem App Store Lotse.

Apple mag keine App, die nur eine Website anzeigt. Diese Hülle enthält die App selbst, ein eigenes Icon und eine dunkle Statusleiste.

## Google Play

- Konto in der Play Console, einmalig etwa 25 $.
- Paketname: `de.schlagfertig.live`.
- Weg über Android Studio: Menü Build → Generate Signed Bundle. Die Datei heißt `app-release.aab`. Die lädst du in der Play Console hoch.
- Weg über GitHub, ohne Android Studio: Actions → **Play-Paket (.aab)** → Run workflow. Die Datei liegt danach als Artefakt `schlagfertig-live-aab`. Der Ablauf steht in `.github/workflows/android-aab.yml`. Er stellt Target SDK 36 ein (das verlangt Play) und die Versionsnummer `1.0.<Laufnummer>`.
- Dafür einmalig vier Geheimnisse unter GitHub → Settings → Secrets and variables → Actions. Dieselben Arten wie bei der Trommel-App, nur in diesem Repository neu eintragen:
  - `ANDROID_KEYSTORE_BASE64` (deine Schlüsseldatei als Text)
  - `ANDROID_KEYSTORE_PASSWORD`
  - `ANDROID_KEY_ALIAS`
  - `ANDROID_KEY_PASSWORD`
- Die Schlüsseldatei bleibt bei dir. Ohne die vier Geheimnisse bricht der Lauf ab und lädt nichts hoch. Verlust der Datei heißt: bei Google einen neuen Upload-Schlüssel beantragen.
- In der Play Console die Altersfreigabe ausfüllen.

## Die Website nicht in die Hülle hängen

In `capacitor.config.json` steht keine Adresse. Die Hülle lädt immer den Ordner `dist`.

Keine Zeile `server.url` auf `https://spielfertig7.vercel.app` eintragen, auch nicht zum Ausprobieren. Sonst zeigt die App die Website statt der eingebauten Version. Apple lehnt das ab, und ohne Netz bleibt der Bildschirm leer. So eine Zeile nicht committen.

## Icons

Die Bilder in `assets/` sind das vorhandene App-Icon aus `public/icon-512.png`, nur in den Größen für Apple und Google. Kein neues Zeichen.

- `icon-only.png` – 1024×1024, Home-Icon, schwarzer Grund wie bisher
- `icon-foreground.png` und `icon-background.png` – rundes Android-Icon, Grund Schwarz
- `splash.png` und `splash-dark.png` – Startbild, Grund `#161a1d` wie der Bildschirm der App

Wenn du später ein neues Icon willst: `public/icon-512.png` tauschen, die fünf Dateien in `assets/` neu bauen, danach den Icon-Befehl aus „Einmalig“ noch einmal laufen lassen.

## Was die Hülle beim Start macht

In der App wird die Statusleiste dunkel gesetzt (`src/native.js`). Im Browser passiert dabei nichts. Der Service Worker der Website startet in der Hülle nicht, damit die eingebaute Version gilt.
