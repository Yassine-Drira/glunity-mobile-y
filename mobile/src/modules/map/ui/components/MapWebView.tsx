import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { MapLocation } from '../../domain/location.types';

export interface MapWebViewHandle {
  flyTo(lng: number, lat: number, zoom?: number): void;
}

interface MapWebViewProps {
  locations: MapLocation[];
  initialCenter?: { lng: number; lat: number };
  initialZoom?: number;
  onSelectLocation?: (id: string) => void;
}

/**
 * Cross-platform interactive map. Renders Leaflet inside a WebView so it
 * works in Expo Go on iOS / Android (no native modules) and in the web build.
 *
 * On `web`, we render the same Leaflet HTML inside a regular <iframe> via
 * react-native-web's <View>. The WebView from react-native-webview also
 * supports web with the same API.
 */
const DEFAULT_CENTER = { lng: 10.181667, lat: 36.806389 }; // Tunis

function buildHtml(): string {
  // Self-contained Leaflet page. Tile data comes from OpenStreetMap (free).
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { margin:0; padding:0; height:100%; width:100%; background:#f6f5f3; }
    .gf-pin {
      width: 38px; height: 46px; position: relative; transform: translate(-50%, -100%);
    }
    .gf-pin .head {
      width: 38px; height: 38px; border-radius: 50%;
      background: #8BC34A; display:flex; align-items:center; justify-content:center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2); border: 3px solid #FFFFFF;
    }
    .gf-pin .head svg { width: 18px; height: 18px; color: #FFFFFF; }
    .gf-pin .tail {
      width: 0; height: 0; position: absolute; left: 50%; bottom: 0;
      transform: translate(-50%, 6px);
      border-left: 7px solid transparent;
      border-right: 7px solid transparent;
      border-top: 10px solid #8BC34A;
    }
    .gf-pin.warn .head { background: #E53935; border-color: #FFFFFF; }
    .gf-pin.warn .tail { border-top-color: #E53935; }
    .gf-pin.cert .head { background: #8BC34A; }
    .gf-pin.cert .head:after {
      content: ''; width: 10px; height: 10px; background: #FFFFFF;
      position: absolute; right: -2px; top: -2px; border-radius: 50%;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map = L.map('map', { zoomControl: false, attributionControl: false })
      .setView([${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lng}], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);

    function leafIcon() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.8 2c1 5 .5 10.5-5 15a7 7 0 0 1-3.8 3z"/></svg>';
    }

    function send(type, payload) {
      var msg = JSON.stringify({ type: type, payload: payload });
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(msg);
      } else if (window.parent && window.parent !== window) {
        window.parent.postMessage(msg, '*');
      }
    }

    function renderLocations(items) {
      markersLayer.clearLayers();
      if (!items || !items.length) return;
      items.forEach(function (loc) {
        var classes = 'gf-pin';
        if (loc.contaminationWarning) classes += ' warn';
        if (loc.certified) classes += ' cert';
        var html = '<div class="' + classes + '"><div class="head">' + leafIcon() + '</div><div class="tail"></div></div>';
        var icon = L.divIcon({ html: html, className: '', iconSize: [38, 46], iconAnchor: [19, 46] });
        var m = L.marker([loc.lat, loc.lng], { icon: icon });
        m.on('click', function () { send('select', { id: loc.id }); });
        markersLayer.addLayer(m);
      });
    }

    window.addEventListener('message', function (e) {
      try {
        var data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (!data) return;
        if (data.type === 'setLocations') renderLocations(data.payload || []);
        if (data.type === 'flyTo') {
          map.flyTo([data.payload.lat, data.payload.lng], data.payload.zoom || 16, { duration: 0.6 });
        }
      } catch (err) { /* noop */ }
    });

    document.addEventListener('message', function (e) {
      window.dispatchEvent(new MessageEvent('message', { data: e.data }));
    });

    send('ready', {});
  </script>
</body>
</html>`;
}

export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(function MapWebView(
  { locations, initialCenter, initialZoom, onSelectLocation },
  ref,
) {
  const html = useMemo(() => buildHtml(), []);
  const webRef = useRef<WebView | null>(null);

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom = 16) {
      const msg = JSON.stringify({ type: 'flyTo', payload: { lng, lat, zoom } });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} })); true;`);
    },
  }), []);

  // Push locations into the map whenever they change
  React.useEffect(() => {
    const msg = JSON.stringify({ type: 'setLocations', payload: locations });
    webRef.current?.injectJavaScript(
      `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} })); true;`,
    );
  }, [locations]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const data = JSON.parse(e.nativeEvent.data);
      if (data.type === 'select' && data.payload?.id) {
        onSelectLocation?.(data.payload.id);
      }
      if (data.type === 'ready') {
        // Replay current dataset so the map is populated even if the
        // ready event arrives after the locations effect.
        const msg = JSON.stringify({ type: 'setLocations', payload: locations });
        webRef.current?.injectJavaScript(
          `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(msg)} })); true;`,
        );
        if (initialCenter) {
          const flyMsg = JSON.stringify({
            type: 'flyTo',
            payload: { lng: initialCenter.lng, lat: initialCenter.lat, zoom: initialZoom || 14 },
          });
          webRef.current?.injectJavaScript(
            `window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify(flyMsg)} })); true;`,
          );
        }
      }
    } catch { /* noop */ }
  }

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html }}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        style={styles.web}
        // Remove top inset shadow on iOS
        scrollEnabled={false}
        // The map handles its own gestures
        overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F5F3' },
  web:  { flex: 1, backgroundColor: '#F6F5F3' },
});
