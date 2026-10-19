
package org.rescuefinder.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Looper;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {

    private WebView web;
    private LocationManager lm;

    private static final int REQ_LOCATION = 42;
    private static final int FILE_CHOOSER_REQUEST = 1001;

    private ValueCallback<Uri[]> fileChooserCallback;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);

        lm = (LocationManager) getSystemService(LOCATION_SERVICE);

        web = new WebView(this);
        web.setBackgroundColor(0xff0a1020);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowContentAccess(true);

        web.setWebViewClient(new WebViewClient());

        // Enables the Android file picker for GeoJSON imports.
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(
                    WebView view,
                    ValueCallback<Uri[]> callback,
                    FileChooserParams params) {

                if (fileChooserCallback != null) {
                    fileChooserCallback.onReceiveValue(null);
                }

                fileChooserCallback = callback;

                try {
                    Intent intent = params.createIntent();
                    startActivityForResult(
                            intent,
                            FILE_CHOOSER_REQUEST
                    );
                    return true;

                } catch (Exception e) {
                    fileChooserCallback = null;
                    callback.onReceiveValue(null);

                    Toast.makeText(
                            MainActivity.this,
                            "Unable to open file picker",
                            Toast.LENGTH_LONG
                    ).show();

                    return false;
                }
            }
        });

        web.addJavascriptInterface(new Bridge(), "AndroidBridge");

        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }

    private void js(String script) {
        runOnUiThread(() -> {
            if (web != null) {
                web.evaluateJavascript(script, null);
            }
        });
    }

    // Receives the selected file from Android's file picker.
    @Override
    protected void onActivityResult(
            int requestCode,
            int resultCode,
            Intent data) {

        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILE_CHOOSER_REQUEST) {
            if (fileChooserCallback != null) {
                Uri[] results = null;

                if (resultCode == RESULT_OK && data != null) {
                    Uri uri = data.getData();

                    if (uri != null) {
                        results = new Uri[]{uri};
                    }
                }

                fileChooserCallback.onReceiveValue(results);
                fileChooserCallback = null;
            }
        }
    }

    private class Bridge {

        @JavascriptInterface
        public void getLocation() {
            runOnUiThread(() -> {

                if (checkSelfPermission(
                        Manifest.permission.ACCESS_FINE_LOCATION
                ) != PackageManager.PERMISSION_GRANTED
                        && checkSelfPermission(
                        Manifest.permission.ACCESS_COARSE_LOCATION
                ) != PackageManager.PERMISSION_GRANTED) {

                    requestPermissions(
                            new String[]{
                                    Manifest.permission.ACCESS_FINE_LOCATION,
                                    Manifest.permission.ACCESS_COARSE_LOCATION
                            },
                            REQ_LOCATION
                    );
                    return;
                }

                requestGps();
            });
        }
    }

    private void requestGps() {
        try {
            if (lm == null) {
                js("window.rescueLocationError('Android location service unavailable')");
                return;
            }

            boolean gps = lm.isProviderEnabled(
                    LocationManager.GPS_PROVIDER
            );

            if (!gps) {
                js("window.rescueLocationError('Turn on Location in Android settings, then try again')");
                return;
            }

            Location last = lm.getLastKnownLocation(
                    LocationManager.GPS_PROVIDER
            );

            if (last != null
                    && System.currentTimeMillis() - last.getTime()
                    < 10 * 60 * 1000) {
                send(last);
            }

            lm.requestSingleUpdate(
                    LocationManager.GPS_PROVIDER,
                    new LocationListener() {

                        @Override
                        public void onLocationChanged(Location location) {
                            send(location);
                        }

                        @Override
                        public void onProviderDisabled(String provider) {
                            js("window.rescueLocationError('GPS provider disabled')");
                        }

                        @Override
                        public void onProviderEnabled(String provider) {
                        }

                        @Override
                        public void onStatusChanged(
                                String provider,
                                int status,
                                Bundle extras) {
                        }
                    },
                    Looper.getMainLooper()
            );

            Toast.makeText(
                    this,
                    "Waiting for GPS fix…",
                    Toast.LENGTH_SHORT
            ).show();

        } catch (SecurityException e) {
            js("window.rescueLocationError('Location permission was not granted')");

        } catch (Exception e) {
            js("window.rescueLocationError('Could not start GPS. Try outdoors.')");
        }
    }

    private void send(Location l) {
        String alt = l.hasAltitude()
                ? Double.toString(l.getAltitude())
                : "NaN";

        String bearing = l.hasBearing()
                ? Double.toString(l.getBearing())
                : "NaN";

        js("window.rescueLocationSuccess("
                + l.getLatitude() + ","
                + l.getLongitude() + ","
                + l.getAccuracy() + ","
                + alt + ","
                + bearing + ","
                + l.getTime()
                + ")");
    }

    @Override
    public void onRequestPermissionsResult(
            int requestCode,
            String[] permissions,
            int[] results) {

        super.onRequestPermissionsResult(
                requestCode,
                permissions,
                results
        );

        if (requestCode == REQ_LOCATION) {
            boolean granted = false;

            for (int r : results) {
                if (r == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }

            if (granted) {
                requestGps();
            } else {
                js("window.rescueLocationError('Location permission denied. Enable it in Android settings.')");
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) {
            web.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (fileChooserCallback != null) {
            fileChooserCallback.onReceiveValue(null);
            fileChooserCallback = null;
        }

        if (web != null) {
            web.destroy();
            web = null;
        }

        super.onDestroy();
    }
}
