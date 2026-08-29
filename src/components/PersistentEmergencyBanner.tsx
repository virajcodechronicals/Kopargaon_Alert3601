import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Alert, HazardType } from '../types';
import { HAZARD_PALETTES } from './HazardPalettes';
import { SpeechEngine } from '../utils/speech';

interface PersistentEmergencyBannerProps {
  alerts: Alert[];
  lang: 'en' | 'mr';
  onNavigateToAlerts: () => void;
  onNavigateToZone?: (zoneId: string, hazard: HazardType) => void;
}

export const PersistentEmergencyBanner: React.FC<PersistentEmergencyBannerProps> = ({
  alerts,
  lang,
  onNavigateToAlerts,
  onNavigateToZone
}) => {
  const [activeAlertIndex, setActiveAlertIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kopargaon_acknowledged_alerts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [hasNewUnseen, setHasNewUnseen] = useState(false);

  // Subscribe to speech engine
  useEffect(() => {
    const unsub = SpeechEngine.subscribe(setIsSpeaking);
    return () => unsub();
  }, []);

  // Filter valid alerts
  const validAlerts = alerts && alerts.length > 0 ? alerts : [];
  const currentAlert = validAlerts[activeAlertIndex] || validAlerts[0];

  // Listen for live new alert custom events
  useEffect(() => {
    const handleNewAlert = (e: CustomEvent<any>) => {
      const alertData = e.detail;
      if (alertData && alertData.id) {
        setIsMinimized(false);
        setHasNewUnseen(true);
        setActiveAlertIndex(0);
        // Play gentle audio chime
        playAlertChime();
      }
    };

    window.addEventListener('kopargaon:new_alert' as any, handleNewAlert);
    return () => window.removeEventListener('kopargaon:new_alert' as any, handleNewAlert);
  }, []);

  // Play web audio tone
  const playAlertChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4); // A4
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  if (!currentAlert) return null;

  const isCurrentAcknowledged = acknowledgedIds.includes(currentAlert.id);
  const palette = HAZARD_PALETTES[currentAlert.hazard] || HAZARD_PALETTES.flood;
  const isCritical = currentAlert.severity === 'CRITICAL';
  const isHigh = currentAlert.severity === 'HIGH';

  const handleAcknowledge = () => {
    const updated = [...new Set([...acknowledgedIds, currentAlert.id])];
    setAcknowledgedIds(updated);
    try {
      localStorage.setItem('kopargaon_acknowledged_alerts', JSON.stringify(updated));
    } catch {}
    setIsMinimized(true);
    setHasNewUnseen(false);
  };

  const handleVoiceToggle = () => {
    if (isSpeaking) {
      SpeechEngine.stop();
    } else {
      const textToSpeak = lang === 'mr' 
        ? (currentAlert.message_mr || currentAlert.message_en)
        : (currentAlert.message_en || currentAlert.message_mr);
      SpeechEngine.speak(textToSpeak, lang, () => setIsSpeaking(false));
    }
  };

  const handleViewOnMap = () => {
    if (onNavigateToZone && currentAlert.zone_id) {
      onNavigateToZone(currentAlert.zone_id, currentAlert.hazard);
    } else {
      onNavigateToAlerts();
    }
  };

  return (
    <div 
      className="fixed top-28 inset-x-3 sm:inset-x-6 z-40 max-w-4xl mx-auto pointer-events-none"
      style={{
        width: '300px',
        paddingLeft: '3px',
        marginLeft: '450px'
      }}
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized Floating Alert Indicator Pill (Permanent until next state) */
          <motion.div
            key="minimized-pill"
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="flex justify-center pointer-events-auto"
            style={{
              width: '300px',
              paddingLeft: '3px',
              marginLeft: '450px'
            }}
          >
            <button
              id="reopen-emergency-alert-pill"
              onClick={() => {
                setIsMinimized(false);
                setHasNewUnseen(false);
              }}
              style={{
                paddingLeft: '7px',
                marginLeft: '129px',
                marginTop: '11px',
                width: '202.892px',
                height: '37.8182px'
              }}
              className={`py-2 rounded-2xl shadow-xl backdrop-blur-md border flex items-center gap-2 text-xs font-bold transition-all group ${
                isCritical
                  ? 'bg-rose-950/90 text-rose-100 border-rose-500 hover:bg-rose-900'
                  : isHigh
                  ? 'bg-amber-950/90 text-amber-100 border-amber-500 hover:bg-amber-900'
                  : 'bg-slate-900/90 text-white border-slate-700 hover:bg-slate-800'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCritical ? 'bg-rose-400' : 'bg-amber-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isCritical ? 'bg-rose-500' : 'bg-amber-500'
                }`}></span>
              </span>

              <span className="material-symbols-outlined text-base">
                {palette.symbol}
              </span>

              <span 
                className="font-bold"
                style={{ fontSize: '9px' }}
              >
                {lang === 'mr' 
                  ? `सक्रिय इशारा (${validAlerts.length})` 
                  : `Active Alert (${validAlerts.length})`}
              </span>

              <span 
                className="text-[10px] font-mono opacity-80 group-hover:opacity-100 underline decoration-dotted ml-1"
                style={{
                  marginRight: '0px',
                  marginBottom: '0px',
                  marginLeft: '-2px',
                  paddingLeft: '-3px'
                }}
              >
                {lang === 'mr' ? 'उघडा' : 'Expand'}
              </span>
            </button>
          </motion.div>
        ) : (
          /* Full Persistent Alert Banner (Never Disappears until acknowledged/minimized) */
          <motion.div
            key="expanded-banner"
            initial={{ opacity: 0, y: -16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-auto rounded-2xl shadow-2xl backdrop-blur-xl border-2 overflow-hidden bg-white/98 text-slate-900"
            style={{
              borderColor: isCritical ? '#e11d48' : isHigh ? '#d97706' : palette.baseColor
            }}
          >
            {/* Top Critical Header Bar */}
            <div 
              className={`px-4 py-2 flex items-center justify-between text-xs font-bold text-white ${
                isCritical 
                  ? 'bg-gradient-to-r from-rose-600 to-red-700' 
                  : isHigh 
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600' 
                  : 'bg-gradient-to-r from-blue-600 to-indigo-700'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined material-symbols-filled text-base animate-pulse">
                  warning
                </span>
                <span className="tracking-wide uppercase font-mono text-[11px]">
                  {currentAlert.severity} {lang === 'mr' ? 'आपत्ती इशारा' : 'EMERGENCY ADVISORY'}
                </span>
                {validAlerts.length > 1 && (
                  <span className="bg-black/30 px-2 py-0.5 rounded-full text-[10px] font-mono">
                    {activeAlertIndex + 1} / {validAlerts.length}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {validAlerts.length > 1 && (
                  <div className="flex items-center mr-1">
                    <button
                      onClick={() => setActiveAlertIndex((prev) => (prev > 0 ? prev - 1 : validAlerts.length - 1))}
                      className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center"
                      title="Previous Alert"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button
                      onClick={() => setActiveAlertIndex((prev) => (prev < validAlerts.length - 1 ? prev + 1 : 0))}
                      className="w-6 h-6 rounded hover:bg-white/20 flex items-center justify-center"
                      title="Next Alert"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setIsMinimized(true)}
                  className="px-2 py-0.5 rounded hover:bg-white/20 text-[11px] font-medium flex items-center gap-0.5 transition-colors"
                  title={lang === 'mr' ? 'कमी करा' : 'Minimize'}
                >
                  <span className="material-symbols-outlined text-sm">expand_less</span>
                  <span>{lang === 'mr' ? 'लपवा' : 'Minimize'}</span>
                </button>
              </div>
            </div>

            {/* Main Content Body */}
            <div className="p-3.5 sm:p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{
                    backgroundColor: isCritical ? '#e11d48' : isHigh ? '#d97706' : palette.baseColor
                  }}
                >
                  <span className="material-symbols-outlined material-symbols-filled text-2xl">
                    {palette.symbol}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span 
                      className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase"
                      style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                    >
                      {lang === 'mr' ? palette.marathiName : palette.name}
                    </span>

                    {currentAlert.zone_id && (
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        📍 {currentAlert.zone_id === 'zone-bet' ? (lang === 'mr' ? 'बेट कोपरगाव' : 'Bet Kopargaon') : currentAlert.zone_id}
                      </span>
                    )}

                    <span className="text-[10px] text-slate-600 ml-auto font-mono">
                      {currentAlert.created_at ? new Date(currentAlert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}
                    </span>
                  </div>

                  {/* Bilingual Messages */}
                  <div className="space-y-1">
                    <p className="text-sm font-extrabold text-slate-900 leading-snug">
                      {lang === 'mr' 
                        ? (currentAlert.message_mr || currentAlert.message_en)
                        : (currentAlert.message_en || currentAlert.message_mr)}
                    </p>

                    {/* Secondary translation for clarity */}
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {lang === 'mr' ? currentAlert.message_en : currentAlert.message_mr}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {/* Audio Voice Broadcast */}
                  <button
                    onClick={handleVoiceToggle}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border shadow-xs ${
                      isSpeaking
                        ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200'
                    }`}
                  >
                    <span className="material-symbols-outlined material-symbols-filled text-sm text-amber-600">
                      {isSpeaking ? 'volume_up' : 'campaign'}
                    </span>
                    <span>
                      {isSpeaking 
                        ? (lang === 'mr' ? 'थांबवा' : 'Stop') 
                        : (lang === 'mr' ? 'ऐका (Voice)' : 'Listen')}
                    </span>
                  </button>

                  {/* View on Map */}
                  <button
                    onClick={handleViewOnMap}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">map</span>
                    <span>{lang === 'mr' ? 'नकाशावर पहा' : 'View on Map'}</span>
                  </button>

                  {/* View all in Timeline */}
                  <button
                    onClick={onNavigateToAlerts}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <span>{lang === 'mr' ? 'सर्व इशारे' : 'All Bulletins'}</span>
                  </button>
                </div>

                {/* Acknowledge Button */}
                <button
                  onClick={handleAcknowledge}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1 transition-colors shadow-sm ml-auto"
                >
                  <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                  <span>{lang === 'mr' ? 'समजले (Acknowledge)' : 'Acknowledge'}</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
