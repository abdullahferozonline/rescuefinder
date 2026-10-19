# RescueFinder — Offline Emergency GPS Locator

RescueFinder is an offline-first Android app and installable web app. It displays device GPS coordinates without internet, saves the last fix locally, and imports/downloads GeoJSON map packages for offline viewing.

## Important limits
- GPS reception can work without mobile signal or internet, but a first fix may take time and accuracy varies.
- This app does not secretly transmit location. Sending an alert needs SMS, internet, or compatible satellite communication.
- The included sample GeoJSON is only a demonstration, not a detailed street map. Download a GeoJSON map package before going offline.
- Do not use this as the only emergency plan.

## Repository layout
- `web/`: offline web app and map package viewer
- `android/`: native Android WebView wrapper and GPS bridge
- `.github/workflows/android-apk.yml`: builds a debug APK on GitHub Actions
- `deploy/`: separate Nginx/HTTPS setup notes for Termux

## Run locally
Open `web/index.html` through a local web server for PWA behavior. Browser geolocation requires HTTPS or localhost. The Android APK uses native GPS and works offline after installation.

## Build APK with GitHub Actions
1. Create a new empty GitHub repository named `rescuefinder`.
2. Upload/extract all files from this project into its root.
3. Push to the `main` branch.
4. Open **Actions → Build RescueFinder APK**.
5. Download `rescuefinder-debug-apk` from the completed workflow run's artifacts.

The workflow builds a debug APK for testing. For distribution, create a release keystore and configure GitHub Secrets; do not publish a debug APK as a trusted production release.

## Offline map packages
RescueFinder imports GeoJSON FeatureCollection files and stores them in browser/device local storage. GeoJSON can contain points, lines, and polygons. Prepare the file while online, then use **Offline maps → Import map file**. Only use map data you have permission to download and redistribute. Include attribution/licence information with each package.
