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
  onSelectLocation?: (id: string) => void;
  focusedId?: string | null;
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
    .gl-pin .pin-badge{width:40px;height:40px;border-radius:999px;display:flex;align-items:center;justify-content:center;border:3.5px solid #fff;box-shadow:0 4px 12px rgba(0,0,0,.22),0 1px 4px rgba(0,0,0,.12);background:${greenColor};transition:transform .15s ease;}
    .gl-pin:hover .pin-badge{transform:scale(1.1);}
    .gl-pin.focus .pin-badge{width:48px;height:48px;box-shadow:0 6px 18px rgba(0,0,0,.30);}
    .gl-pin .pin-tail{width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid currentColor;margin-top:-1px;}
    .gl-pin svg{width:20px;height:20px;}
    /* Force all category pins to use the app green color */
    .cat-restaurant .pin-badge, .cat-grocery .pin-badge, .cat-bakery .pin-badge, .cat-cafe .pin-badge, .cat-pharmacy .pin-badge, .cat-other .pin-badge { background: ${greenColor}; }
    .cat-restaurant .pin-tail, .cat-grocery .pin-tail, .cat-bakery .pin-tail, .cat-cafe .pin-tail, .cat-pharmacy .pin-tail, .cat-other .pin-tail { color: ${greenColor}; }
    .leaflet-popup-content-wrapper{border-radius:14px;box-shadow:0 6px 20px rgba(0,0,0,.18);padding:0;}
    .leaflet-popup-content{margin:14px 16px;}
    .gl-name{font-size:13px;font-weight:700;color:#111827;margin-bottom:3px;}
    .gl-addr{font-size:11px;color:#6B7280;margin-bottom:8px;}
    .gl-tags{display:flex;gap:4px;flex-wrap:wrap;}
    .gl-tag{font-size:10px;font-weight:600;padding:2px 8px;border-radius:6px;}
    .gl-gf{background:#DCFCE7;color:#16A34A;} .gl-cert{background:#DBEAFE;color:#1D4ED8;}
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([${DEFAULT_CENTER.lat},${DEFAULT_CENTER.lng}],14);
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
    function render(items){layer.clearLayers();if(!items||!items.length)return;separate(items).forEach(function(loc){var cat=loc.category||'other';var cls='gl-pin cat-'+cat+(loc.isFocus?' focus':'');var html='<div class="'+cls+'"><div class="pin-badge">'+iconFor(cat)+'</div><div class="pin-tail"></div></div>';var icon=L.divIcon({html:html,className:'',iconSize:[48,56],iconAnchor:[24,56]});var tags='';if(loc.glutenFree)tags+='<span class="gl-tag gl-gf">GF Friendly</span>';if(loc.certified)tags+='<span class="gl-tag gl-cert">Certified</span>';var popup='<div class="gl-name">'+(loc.name||'')+'</div>'+(loc.address?'<div class="gl-addr">'+loc.address+'</div>':'')+(tags?'<div class="gl-tags">'+tags+'</div>':'');var m=L.marker([loc.lat,loc.lng],{icon:icon}).bindPopup(popup);m.on('click',function(){send('select',{id:loc.id});});layer.addLayer(m);});}
    window.addEventListener('message',function(e){try{var d=typeof e.data==='string'?JSON.parse(e.data):e.data;if(!d)return;if(d.type==='setLocations')render(d.payload||[]);if(d.type==='flyTo')map.flyTo([d.payload.lat,d.payload.lng],d.payload.zoom||16,{duration:0.6});}catch(err){}});
    document.addEventListener('message',function(e){window.dispatchEvent(new MessageEvent('message',{data:e.data}));});
    send('ready',{});
  </script>
</body>
</html>`;
}

export const MapWebView = forwardRef<MapWebViewHandle, MapWebViewProps>(
  function MapWebView({ locations, initialCenter, initialZoom, onSelectLocation, focusedId }, ref) {
    const { theme: T } = useTheme();
    const html = useMemo(() => buildHtml(T.green), [T.green]);
    const webRef = useRef<WebView | null>(null);

    useImperativeHandle(ref, () => ({
      flyTo(lng, lat, zoom = 16) {
        const msg = JSON.stringify({ type: 'flyTo', payload: { lng, lat, zoom } });
        webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`);
      },
    }), []);

    React.useEffect(() => {
      const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
      const msg = JSON.stringify({ type: 'setLocations', payload });
      webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`);
    }, [locations, focusedId]);

    function onMessage(e: WebViewMessageEvent) {
      try {
        const data = JSON.parse(e.nativeEvent.data);
        if (data.type === 'select' && data.payload?.id) onSelectLocation?.(data.payload.id);
        if (data.type === 'ready') {
          const payload = (locations || []).map((l) => Object.assign({}, l, { isFocus: !!(focusedId && l.id === focusedId) }));
          const msg = JSON.stringify({ type: 'setLocations', payload });
          webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(msg)}}));true;`);
          if (initialCenter) {
            const fly = JSON.stringify({ type: 'flyTo', payload: { lng: initialCenter.lng, lat: initialCenter.lat, zoom: initialZoom || 14 } });
            webRef.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${JSON.stringify(fly)}}));true;`);
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
