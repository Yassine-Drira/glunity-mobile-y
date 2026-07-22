import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View, Image } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import type { MapLocation } from '../../domain/location.types';
import { useTheme } from '@/shared/context/theme.context';

export interface MapWebViewHandle {
  flyTo(lng: number, lat: number, zoom?: number): void;
}

interface MapWebViewProps {
  locations: MapLocation[];
  initialCenter?: { lng: number; lat: number };
  initialZoom?: number;
  onSelectLocation?: (id: string | null) => void;
  onMapPress?: (lat: number, lng: number) => void;
  focusedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

const DEFAULT_CENTER = { lng: 10.181667, lat: 36.806389 };

function buildHtml(greenColor: string, icons: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#f6f5f3;}
    /* Show only the image for pins (no colored badge or tail). */
    .gl-pin{width:56px;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;transform:translate(-50%,-100%);background:transparent;cursor:pointer;}
    .gl-pin .pin-badge{width:auto;height:auto;border-radius:0;display:flex;align-items:center;justify-content:center;border:0;background:transparent;padding:0;margin:0;box-shadow:none;}
    .gl-pin .pin-badge img{width:56px;height:56px;object-fit:contain;display:block;background:transparent;border-radius:0;padding:0;margin:0;}
    .gl-pin:hover .pin-badge img{transform:scale(1.03);}
    .gl-pin.focus .pin-badge img{transform:scale(1.08);}    
    .gl-pin .pin-tail{display:none;}    
    /* Ensure no colored background behind the pin image */
    .cat-restaurant .pin-badge, .cat-grocery .pin-badge, .cat-bakery .pin-badge, .cat-cafe .pin-badge, .cat-pharmacy .pin-badge, .cat-other .pin-badge { background: transparent !important; }
    .cat-restaurant .pin-tail, .cat-grocery .pin-tail, .cat-bakery .pin-tail, .cat-cafe .pin-tail, .cat-pharmacy .pin-tail, .cat-other .pin-tail { display: none !important; }
    .leaflet-popup-content-wrapper{border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.04);border:1px solid rgba(0,0,0,0.03);padding:4px;background:#ffffff;}
    .leaflet-popup-tip{background:#ffffff;box-shadow:none;}
    .leaflet-popup-close-button{color:#9CA3AF !important;font-size:16px !important;padding:8px 10px 0 0 !important;}
    .gl-name{font-size:14px;font-weight:700;color:#1F2937;margin-bottom:4px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
    .gl-addr{font-size:11px;color:#6B7280;margin-bottom:8px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
    .gl-tags{display:flex;gap:5px;flex-wrap:wrap;}
    .gl-tag{font-size:10px;font-weight:600;padding:3px 9px;border-radius:6px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
    .gl-gf{background:#E8F5E9;color:#2E7D32;} .gl-cert{background:#E3F2FD;color:#1565C0;}

    /* Pulser Dot User Location (Google Maps Theme) */
    .user-location-marker {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #1A73E8;
      border: 2.5px solid #FFFFFF;
      box-shadow: 0 0 6px rgba(26,115,232,0.6);
      position: relative;
    }
    .user-location-marker::after {
      content: '';
      position: absolute;
      top: -2.5px; left: -2.5px; right: -2.5px; bottom: -2.5px;
      border-radius: 50%;
      border: 2.5px solid #1A73E8;
      animation: pulse-ring 2s cubic-bezier(0.215, 0.610, 0.355, 1) infinite;
      opacity: 0;
    }
    @keyframes pulse-ring {
      0% { transform: scale(1); opacity: 0.8; }
      70%, 100% { transform: scale(3.5); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // Embedded icon map will be injected by RN
    var icons = ${JSON.stringify(icons)};
    // diagnostics removed
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}],14);
    map.on('click',function(ev){
      send('deselect',{});
      send('mapPress',{lat:ev.latlng.lat,lng:ev.latlng.lng});
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
    var layer=L.layerGroup().addTo(map);
    /* Use provided PNG icons for markers. icons is an object mapping category->url */
    function iconFor(c){
      var normCat = (c || 'other').toString().toLowerCase().trim();
      var url = '';
      if (normCat.includes('restaurant')) {
        url = (icons && icons['restaurant']) || '';
      } else if (normCat.includes('bakery') || normCat.includes('boulangerie') || normCat.includes('supermarket') || normCat.includes('supermarché') || normCat.includes('grocery')) {
        url = (icons && icons['bakery']) || (icons && icons['supermarket']) || '';
      } else if (normCat.includes('health') || normCat.includes('santé')) {
        url = (icons && icons['health store']) || '';
      } else if (normCat.includes('bio') || normCat.includes('coffee') || normCat.includes('café')) {
        url = (icons && icons['bio store']) || '';
      } else if (normCat.includes('pharmacy') || normCat.includes('pharmacie')) {
        url = (icons && icons['pharmacy']) || '';
      } else {
        url = (icons && icons[normCat]) || (icons && icons['other']) || '';
      }
      return '<img src="'+url+'" style="width:52px;height:52px;object-fit:contain;display:block;background:transparent;border-radius:0;"/>';
    }
    function send(t,p){var m=JSON.stringify({type:t,payload:p});if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(m);}else if(window.parent&&window.parent!==window){window.parent.postMessage(m,'*');}}
    function separate(items){
      var g={};
      items.forEach(function(it){
        var lat = Number(it.lat);
        var lng = Number(it.lng);
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;
        it.lat = lat;
        it.lng = lng;
        var k=Math.round(lat*100000)+'|'+Math.round(lng*100000);
        (g[k]=g[k]||[]).push(it);
      });
      var out=[];
      Object.keys(g).forEach(function(k){
        var gr=g[k];
        if(gr.length===1){out.push(gr[0]);return;}
        gr.forEach(function(it,i){
          var a=(i/gr.length)*Math.PI*2,r=0.00014*(1+Math.floor(i/2));
          out.push(Object.assign({},it,{lat:it.lat+Math.cos(a)*r,lng:it.lng+Math.sin(a)*r}));
        });
      });
      return out;
    }
    function render(items){
      layer.clearLayers();
      if(!items||!items.length)return;
      separate(items).forEach(function(loc){
        var lat = Number(loc.lat);
        var lng = Number(loc.lng);
        if (isNaN(lat) || isNaN(lng) || !isFinite(lat) || !isFinite(lng)) return;
        var cat=loc.category||'other';
        var cls='gl-pin cat-'+cat+(loc.isFocus?' focus':'');
        var html='<div class="'+cls+'"><div class="pin-badge">'+iconFor(cat)+'</div><div class="pin-tail"></div></div>';
        var icon=L.divIcon({html:html,className:'',iconSize:[48,56],iconAnchor:[24,56]});
        var tags='';
        if(loc.glutenFree)tags+='<span class="gl-tag gl-gf">GF Friendly</span>';
        if(loc.certified)tags+='<span class="gl-tag gl-cert">Certified</span>';
        var imgHtml='';
        if(loc.images&&loc.images.length>0&&loc.images[0].url){
          imgHtml='<div style="margin-bottom:8px;border-radius:10px;overflow:hidden;height:90px;width:180px;"><img src="'+loc.images[0].url+'" style="width:100%;height:100%;object-fit:cover;" /></div>';
        }
        var popup=imgHtml+'<div class="gl-name">'+(loc.name||'')+'</div>'+(loc.address?'<div class="gl-addr">'+loc.address+'</div>':'')+(tags?'<div class="gl-tags">'+tags+'</div>':'');
        var m=L.marker([lat,lng],{icon:icon}).bindPopup(popup);
        m.on('click',function(ev){
          L.DomEvent.stopPropagation(ev);
          try{m.openPopup();}catch(e){}
          send('select',{id:loc.id});
        });
        layer.addLayer(m);
      });
    }
    var userMarker=null,userCircle=null;
    function updateUserLocation(lat,lng){
      var nLat = Number(lat);
      var nLng = Number(lng);
      if(!nLat || !nLng || isNaN(nLat) || isNaN(nLng) || !isFinite(nLat) || !isFinite(nLng)){
        if(userMarker){map.removeLayer(userMarker);userMarker=null;}
        if(userCircle){map.removeLayer(userCircle);userCircle=null;}
        return;
      }
      var pos=[nLat,nLng];
      if(userMarker){
        userMarker.setLatLng(pos);
      }else{
        var icon=L.divIcon({html:'<div class="user-location-marker"></div>',className:'',iconSize:[20,20],iconAnchor:[10,10]});
        userMarker=L.marker(pos,{icon:icon,zIndexOffset:10000}).addTo(map);
      }
      if(userCircle){
        userCircle.setLatLng(pos);
      }else{
        userCircle=L.circle(pos,{radius:120,color:'#1A73E8',weight:1,opacity:0.18,fillColor:'#1A73E8',fillOpacity:0.07}).addTo(map);
      }
    }
    window.addEventListener('message',function(e){try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(!d)return;if(d.type==='setLocations')render(d.payload||[]);if(d.type==='setUserLocation')updateUserLocation(d.payload?.lat,d.payload?.lng);if(d.type==='flyTo'){var p=d.payload;if(p&&isFinite(p.lat)&&isFinite(p.lng))map.flyTo([p.lat,p.lng],p.zoom||16,{duration:0.6});}}catch(err){}});
    document.addEventListener('message',function(e){window.dispatchEvent(new MessageEvent('message',{data:e.data}));});
    send('ready',{});
  </script>
</body>
</html>`;
}

export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(
  function MapWebView({ locations, initialCenter, initialZoom, onSelectLocation, onMapPress, focusedId, userLocation }, ref) {
    const { theme: T } = useTheme();
    // Resolve local asset URIs for pin images safely across Web and Native platforms
    const getAssetUri = (asset: any) => {
      if (!asset) return '';
      if (typeof asset === 'string') return asset;
      if (Platform.OS !== 'web' && Image.resolveAssetSource) {
        try {
          return Image.resolveAssetSource(asset)?.uri || '';
        } catch (e) {
          console.warn('resolveAssetSource failed:', e);
        }
      }
      if (typeof asset === 'object') {
        if (asset.uri) return asset.uri;
        if (asset.default) {
          if (typeof asset.default === 'string') return asset.default;
          if (asset.default.uri) return asset.default.uri;
        }
      }
      return '';
    };

    const restaurantUri      = getAssetUri(require('../../../../../assets/Pin/restaurant.png'));
    const bakeryUri          = getAssetUri(require('../../../../../assets/Pin/bakery-or-grocery.png'));
    const glutenFreeStoreUri = getAssetUri(require('../../../../../assets/Pin/gluten-free-store.png'));
    const pharmacyUri        = getAssetUri(require('../../../../../assets/Pin/pharmacy.png'));
    const coffeeUri          = getAssetUri(require('../../../../../assets/Pin/coffe.png'));

    const icons = useMemo(() => ({
      restaurant: restaurantUri,
      bakery: bakeryUri,
      supermarket: bakeryUri,
      grocery: bakeryUri,
      'health store': glutenFreeStoreUri,
      'healthstore': glutenFreeStoreUri,
      'bio store': coffeeUri,
      'biostore': coffeeUri,
      pharmacy: pharmacyUri,
      other: glutenFreeStoreUri,
      cafe: coffeeUri,
    }), [restaurantUri, bakeryUri, glutenFreeStoreUri, pharmacyUri, coffeeUri]);

    const html = useMemo(() => buildHtml(T.green, icons), [T.green, icons]);
    const webRef = useRef<WebView | null>(null);
    const iframeRef = useRef<any>(null);
    const lastPayloadRef = useRef<string | null>(null);

    useImperativeHandle(ref, () => ({
      flyTo(lng, lat, zoom = 16) {
        const msg = { type: 'flyTo', payload: { lng, lat, zoom } };
        if (Platform.OS === 'web') {
          iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
        } else {
          const msgStr = JSON.stringify(msg);
          webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msgStr)}}));true;`);
        }
      },
    }), [locations, focusedId]);

    // Handle messaging and initial updates for Web (Platform.OS === 'web')
    React.useEffect(() => {
      if (Platform.OS !== 'web') return;

      const handleWebMessage = (e: MessageEvent) => {
        try {
          const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (!data) return;
          if (data.type === 'select' && data.payload?.id) {
            onSelectLocation?.(data.payload.id);
          }
          if (data.type === 'deselect') {
            onSelectLocation?.(null);
          }
          if (data.type === 'mapPress' && data.payload) {
            onMapPress?.(data.payload.lat, data.payload.lng);
          }
          if (data.type === 'ready') {
            const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
            const msg = { type: 'setLocations', payload };
            iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
            if (userLocation) {
              const uMsg = { type: 'setUserLocation', payload: userLocation };
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify(uMsg), '*');
            }
            if (initialCenter) {
              const fly = { type: 'flyTo', payload: { lng: initialCenter.lng, lat: initialCenter.lat, zoom: initialZoom || 14 } };
              iframeRef.current?.contentWindow?.postMessage(JSON.stringify(fly), '*');
            }
          }
        } catch { /* noop */ }
      };

      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }, [locations, focusedId, initialCenter, initialZoom, onSelectLocation]);

    // Update markers on location/focus state change for Web
    React.useEffect(() => {
      if (Platform.OS !== 'web') return;
      // normalize payload to avoid tiny differences that would retrigger full rerender in the iframe
      const payload = (locations || []).map((l) => ({ id: l.id, lat: Number(Number(l.lat).toFixed(6)), lng: Number(Number(l.lng).toFixed(6)), name: l.name || '', address: l.address || '', category: l.category || 'other', glutenFree: !!l.glutenFree, certified: !!l.certified, isFocus: !!(focusedId && l.id === focusedId) }));
      const serialized = JSON.stringify(payload);
      if (lastPayloadRef.current === serialized) return;
      lastPayloadRef.current = serialized;
      const msg = { type: 'setLocations', payload };
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
    }, [locations, focusedId]);

    // Update markers on location/focus state change for Native
    React.useEffect(() => {
      if (Platform.OS === 'web') return;
      const payload = (locations || []).map((l) => ({ id: l.id, lat: Number(Number(l.lat).toFixed(6)), lng: Number(Number(l.lng).toFixed(6)), name: l.name || '', address: l.address || '', category: l.category || 'other', glutenFree: !!l.glutenFree, certified: !!l.certified, isFocus: !!(focusedId && l.id === focusedId) }));
      const serialized = JSON.stringify(payload);
      if (lastPayloadRef.current === serialized) return;
      lastPayloadRef.current = serialized;
      const msg = JSON.stringify({ type: 'setLocations', payload });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`);
    }, [locations, focusedId]);

    // Live update user location marker
    React.useEffect(() => {
      const msg = { type: 'setUserLocation', payload: userLocation };
      if (Platform.OS === 'web') {
        iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
      } else {
        const msgStr = JSON.stringify(msg);
        webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msgStr)}}));true;`);
      }
    }, [userLocation]);

    function onMessage(e: WebViewMessageEvent) {
      try {
        const data = JSON.parse(e.nativeEvent.data);
        if (data.type === 'select' && data.payload?.id) onSelectLocation?.(data.payload.id);
        if (data.type === 'deselect') onSelectLocation?.(null);
        if (data.type === 'mapPress' && data.payload) onMapPress?.(data.payload.lat, data.payload.lng);
        if (data.type === 'ready') {
          const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
          const msg = JSON.stringify({ type: 'setLocations', payload });
          webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`);
          if (userLocation) {
            const uMsg = JSON.stringify({ type: 'setUserLocation', payload: userLocation });
            webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(uMsg)}}));true;`);
          }
          if (initialCenter) {
            const fly = JSON.stringify({ type: 'flyTo', payload: { lng: initialCenter.lng, lat: initialCenter.lat, zoom: initialZoom || 14 } });
            webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(fly)}}));true;`);
          }
        }
      } catch { /* noop */ }
    }

    if (Platform.OS === 'web') {
      return (
        <View style={styles.root}>
          <iframe
            ref={iframeRef}
            srcDoc={html}
            style={{ width: '100%', height: '100%', border: 'none', background: '#F6F5F3' }}
            title="gluten-free-map"
          />
        </View>
      );
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
          scrollEnabled={false}
          overScrollMode={Platform.OS === 'android' ? 'never' : undefined}
        />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F6F5F3' },
  web:  { flex: 1, backgroundColor: '#F6F5F3' },
});
