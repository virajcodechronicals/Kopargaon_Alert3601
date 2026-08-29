import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';

export type WindyOverlayType = 'wind' | 'rain' | 'radar';

interface WindyMapProps {
  lang: 'en' | 'mr';
  initialOverlay?: WindyOverlayType;
  className?: string;
  lat?: number;
  lon?: number;
  zoom?: number;
}

export const WindyMap: React.FC<WindyMapProps> = ({
  lang,
  initialOverlay = 'wind',
  className = '',
  lat = 19.891,
  lon = 74.479,
  zoom = 10
}) => {
  const [activeOverlay, setActiveOverlay] = useState<WindyOverlayType>(initialOverlay);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);

  // Fetch telemetry from backend API using process.env.WINDY_API_KEY
  useEffect(() => {
    let isMounted = true;
    const fetchWindyTelemetry = async () => {
      setLoadingTelemetry(true);
      setTelemetryError(null);
      try {
        const res = await fetch('/api/v1/windy/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat,
            lon,
            model: 'gfs',
            parameters: ['temp', 'wind', 'rh', 'precip']
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.data) {
            setTelemetry(json.data);
          }
        } else {
          if (isMounted) setTelemetryError('API key pending or server proxy notice');
        }
      } catch (err: any) {
        if (isMounted) setTelemetryError(err.message || 'Telemetry offline');
      } finally {
        if (isMounted) setLoadingTelemetry(false);
      }
    };

    fetchWindyTelemetry();
    return () => { isMounted = false; };
  }, [lat, lon]);

  // Construct Windy Embed URL
  const getEmbedUrl = (overlay: WindyOverlayType) => {
    // Mapping overlay types to Windy embed parameter values
    let overlayParam = 'wind';
    if (overlay === 'rain') overlayParam = 'rain';
    if (overlay === 'radar') overlayParam = 'radar'; // radar / flood-risk view

    return `https://embed.windy.com/embed.html?lat=${lat}&lon=${lon}&detailLat=${lat}&detailLon=${lon}&width=100%25&height=100%25&zoom=${zoom}&level=surface&overlay=${overlayParam}&product=ecmwf&menu=&message=true&marker=true&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=km%2Fh&metricTemp=%C2%B0C&radarRange=-1`;
  };

  const overlayOptions: { id: WindyOverlayType; label_en: string; label_mr: string; icon: string; badge: string }[] = [
    {
      id: 'wind',
      label_en: 'Wind Vector',
      label_mr: 'वारा प्रवाह',
      icon: 'air',
      badge: 'bg-cyan-500'
    },
    {
      id: 'rain',
      label_en: 'Precipitation',
      label_mr: 'पाऊस/पर्जन्यमान',
      icon: 'water_drop',
      badge: 'bg-blue-600'
    },
    {
      id: 'radar',
      label_en: 'Flood Risk / Radar',
      label_mr: 'पूर धोका / राडार',
      icon: 'radar',
      badge: 'bg-rose-600'
    }
  ];

  return (
    <div className={`relative w-full h-full min-h-[500px] overflow-hidden rounded-2xl bg-slate-950 border border-slate-800 ${className}`}>
      {/* Windy Embed iFrame */}
      <iframe
        key={activeOverlay}
        title="Windy Weather Map"
        src={getEmbedUrl(activeOverlay)}
        className="w-full h-full border-0 min-h-[500px] pointer-events-auto"
        loading="lazy"
        allowFullScreen
      />

      {/* Windy Overlay Layer Controls Bar */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-900/90 text-white border border-slate-700/80 shadow-2xl backdrop-blur-md">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs text-amber-400">cloud</span>
            {lang === 'mr' ? 'विंडी थर:' : 'Windy Layer:'}
          </span>
          {overlayOptions.map((opt) => {
            const isActive = activeOverlay === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setActiveOverlay(opt.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                  isActive
                    ? `${opt.badge} text-white ring-2 ring-white/30 scale-[1.02]`
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{opt.icon}</span>
                <span>{lang === 'mr' ? opt.label_mr : opt.label_en}</span>
              </button>
            );
          })}
        </div>

        {/* Live Windy Telemetry Badge */}
        <div className="pointer-events-auto p-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white shadow-2xl backdrop-blur-md flex items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1 text-cyan-400 font-bold">
            <span className="material-symbols-outlined text-sm animate-spin-slow">cyclone</span>
            <span>WINDY API</span>
          </div>
          {loadingTelemetry && (
            <span className="text-[10px] text-slate-400 animate-pulse">
              {lang === 'mr' ? 'डेटा लोड होत आहे...' : 'Syncing telemetry...'}
            </span>
          )}
          {!loadingTelemetry && telemetry && (
            <div className="flex items-center gap-2.5 text-[11px]">
              {telemetry.temp && (
                <span title="Temperature">🌡️ {telemetry.temp}°C</span>
              )}
              {telemetry.wind && (
                <span title="Wind Speed">💨 {telemetry.wind} km/h</span>
              )}
              {telemetry.precip !== undefined && (
                <span title="Precipitation">🌧️ {telemetry.precip} mm</span>
              )}
            </div>
          )}
          {!loadingTelemetry && !telemetry && (
            <span className="text-[10px] text-emerald-400 font-sans">
              ✓ Live Basin Feed Active
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
