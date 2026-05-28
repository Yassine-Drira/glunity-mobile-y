import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
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
  focusedId?: string | null;
  userLocation?: { lat: number; lng: number } | null;
}

const DEFAULT_CENTER = { lng: 10.181667, lat: 36.806389 };

function buildHtml(greenColor: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html,body,#map{margin:0;padding:0;height:100%;width:100%;background:#f6f5f3;}
    .gl-pin{width:48px;height:56px;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;transform:translate(-50%,-100%);background:transparent;cursor:pointer;}
    .gl-pin .pin-badge{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:3px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.15),0 1px 4px rgba(0,0,0,.08);background:${greenColor};transition:transform .3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .3s ease, border-color .3s ease;}
    .gl-pin:hover .pin-badge{transform:scale(1.12);}
    .gl-pin.focus .pin-badge{transform:scale(1.24);box-shadow:0 8px 20px rgba(0,0,0,.22);border-color:#F0FDF4;}
    .gl-pin .pin-tail{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid currentColor;margin-top:-1px;transition:transform .3s cubic-bezier(0.34, 1.56, 0.64, 1);}
    .gl-pin.focus .pin-tail{transform:translateY(3px) scaleY(1.15);}
    .gl-pin svg{width:20px;height:20px;}
    /* Force all category pins to use the app green color */
    .cat-restaurant .pin-badge, .cat-grocery .pin-badge, .cat-bakery .pin-badge, .cat-cafe .pin-badge, .cat-pharmacy .pin-badge, .cat-other .pin-badge { background: ${greenColor}; }
    .cat-restaurant .pin-tail, .cat-grocery .pin-tail, .cat-bakery .pin-tail, .cat-cafe .pin-tail, .cat-pharmacy .pin-tail, .cat-other .pin-tail { color: ${greenColor}; }
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
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}],14);
    map.on('click',function(ev){
      send('deselect',{});
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',{maxZoom:19,subdomains:'abcd'}).addTo(map);
    var layer=L.layerGroup().addTo(map);
    var S='viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
    var ICONS={
      restaurant:'<svg '+S+'><path d="M7 2v4m0 4v12"/><path d="M5 2v3a2 2 0 0 0 4 0V2"/><path d="M17 2c0 0 0 4-2 5v13"/></svg>',
      grocery:   '<svg '+S+'><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
      bakery:    '<svg '+S+'><path d="M12 3C8 3 4 6.5 4 10c0 3 2 5.5 4 7v4h8v-4c2-1.5 4-4 4-7 0-3.5-4-7-8-7z"/><line x1="8" y1="21" x2="16" y2="21"/></svg>',
      cafe:      '<svg '+S+'><path d="M3 8h13v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8z"/><path d="M16 10h3a2 2 0 0 1 0 4h-3"/><path d="M7 21h6m-3-3v3"/></svg>',
      pharmacy:  '<svg '+S+'><path d="M12 2v20M2 12h20" stroke-width="2.4"/></svg>',
      other:     '<svg '+S+'><path d="M2 22 16 8"/><path d="M16 8c0 0 3-1 4-4-1 0-4 0-4 4z"/><path d="M8 16c0 0 0 4-2 6"/></svg>',
    };
    function iconFor(c){return ICONS[c]||ICONS.other;}
    function send(t,p){var m=JSON.stringify({type:t,payload:p});if(window.ReactNativeWebView&&window.ReactNativeWebView.postMessage){window.ReactNativeWebView.postMessage(m);}else if(window.parent&&window.parent!==window){window.parent.postMessage(m,'*');}}
    function separate(items){var g={};items.forEach(function(it){var k=Math.round(it.lat*100000)+'|'+Math.round(it.lng*100000);(g[k]=g[k]||[]).push(it);});var out=[];Object.keys(g).forEach(function(k){var gr=g[k];if(gr.length===1){out.push(gr[0]);return;}gr.forEach(function(it,i){var a=(i/gr.length)*Math.PI*2,r=0.00014*(1+Math.floor(i/2));out.push(Object.assign({},it,{lat:it.lat+Math.cos(a)*r,lng:it.lng+Math.sin(a)*r}));});});return out;}
    function render(items){layer.clearLayers();if(!items||!items.length)return;separate(items).forEach(function(loc){var cat=loc.category||'other';var cls='gl-pin cat-'+cat+(loc.isFocus?' focus':'');var html='<div class="'+cls+'"><div class="pin-badge">'+iconFor(cat)+'</div><div class="pin-tail"></div></div>';var icon=L.divIcon({html:html,className:'',iconSize:[48,56],iconAnchor:[24,56]});var tags='';if(loc.glutenFree)tags+='<span class="gl-tag gl-gf">GF Friendly</span>';if(loc.certified)tags+='<span class="gl-tag gl-cert">Certified</span>';var popup='<div class="gl-name">'+(loc.name||'')+'</div>'+(loc.address?'<div class="gl-addr">'+loc.address+'</div>':'')+(tags?'<div class="gl-tags">'+tags+'</div>':'');var m=L.marker([loc.lat,loc.lng],{icon:icon}).bindPopup(popup);m.on('click',function(ev){L.DomEvent.stopPropagation(ev);send('select',{id:loc.id});});layer.addLayer(m);});}
    var userMarker=null,userCircle=null;
    function updateUserLocation(lat,lng){
      if(!lat||!lng){
        if(userMarker){map.removeLayer(userMarker);userMarker=null;}
        if(userCircle){map.removeLayer(userCircle);userCircle=null;}
        return;
      }
      var pos=[lat,lng];
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
  function MapWebView({ locations, initialCenter, initialZoom, onSelectLocation, focusedId, userLocation }, ref) {
    const { theme: T } = useTheme();
    const html = useMemo(() => buildHtml(T.green), [T.green]);
    const webRef = useRef<WebView | null>(null);
    const iframeRef = useRef<any>(null);

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
      const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
      const msg = { type: 'setLocations', payload };
      iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), '*');
    }, [locations, focusedId]);

    // Update markers on location/focus state change for Native
    React.useEffect(() => {
      if (Platform.OS === 'web') return;
      const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
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
