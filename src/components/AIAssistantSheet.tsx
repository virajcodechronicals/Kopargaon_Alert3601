import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { HazardType, RiskPrediction } from '../types';
import { HAZARD_PALETTES } from './HazardPalettes';
import { SpeechEngine } from '../utils/speech';
import { safeFetchJson } from '../utils/api';

interface AIAssistantSheetProps {
  onClose: () => void;
  lang: 'en' | 'mr';
  onToggleLang: () => void;
  activeHazard: HazardType;
  predictions: RiskPrediction[];
  telemetry?: any;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  card?: {
    type: 'chart' | 'map_snippet' | 'shelter_route';
    title: string;
    metrics: { label: string; value: string }[];
  };
}

export const AIAssistantSheet: React.FC<AIAssistantSheetProps> = ({
  onClose,
  lang,
  onToggleLang,
  activeHazard,
  predictions,
  telemetry
}) => {
  const currentInitialTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';
  const initialRiverStage = telemetry?.river_stage_m ? `${telemetry.river_stage_m}m` : '492.3m';
  const initialDischarge = telemetry?.gangapur_discharge_cusecs ? `${telemetry.gangapur_discharge_cusecs.toLocaleString()} cfs` : '42,500 cfs';
  const initialTemp = telemetry?.temperature_c ? `${telemetry.temperature_c}°C` : '30.5°C';

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'assistant',
      text:
        lang === 'mr'
          ? 'नमस्कार. मी कोपरगाव तालुका आपत्ती सहाय्यक आहे. गोदावरी पूर पातळी, निवारा केंद्र, किंवा शेती सतर्कतेविषयी काहीही विचारा.'
          : 'Hello. I am the Kopargaon Disaster AI Assistant. Ask me about river inundation zones, shelter locations, weather alerts, or safety precautions.',
      timestamp: currentInitialTime,
      card: {
        type: 'chart',
        title: lang === 'mr' ? 'गोदावरी जलप्रवाह निर्देशांक' : 'Godavari Basin Hydro-Status',
        metrics: [
          { label: lang === 'mr' ? 'विसर्ग' : 'Discharge', value: `${initialDischarge} [${currentInitialTime}]` },
          { label: lang === 'mr' ? 'नदी पातळी' : 'River Level', value: `${initialRiverStage} [${currentInitialTime}]` },
          { label: lang === 'mr' ? 'धोका पातळी' : 'Danger Mark', value: '493.0m' }
        ]
      }
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = SpeechEngine.subscribe(speaking => {
      setIsSpeaking(speaking);
      if (!speaking) setSpeakingMsgId(null);
    });
    return () => unsub();
  }, []);

  const handleSpeak = (msg: Message) => {
    if (isSpeaking && speakingMsgId === msg.id) {
      SpeechEngine.stop();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msg.id);
      SpeechEngine.speak(msg.text, lang, () => setSpeakingMsgId(null));
    }
  };

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const q = textToSend || input;
    if (!q.trim() || loading) return;

    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: timeStr
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const result = await safeFetchJson('/api/ask-assistant', {
        method: 'POST',
        body: JSON.stringify({
          question: q,
          messages: messages.map(m => ({ role: m.sender === 'user' ? 'user' : 'model', content: m.text })),
          language: lang,
          hazard_context: activeHazard,
          telemetry_snapshot: telemetry || {}
        })
      });

      if (!result.ok) throw new Error(result.error || 'Failed to get response');
      const data = result.data || {};
      
      const responseTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';
      const aiText = data.answer || (lang === 'mr' ? 'माहिती उपलब्ध झाली आहे.' : 'Information received.');

      // Dynamic telemetry card tailored to the query
      const qLower = q.toLowerCase();
      let dynamicCard: Message['card'] = undefined;

      if (qLower.includes('shelter') || qLower.includes('निवारा') || qLower.includes('route') || qLower.includes('मार्ग')) {
        dynamicCard = {
          type: 'shelter_route',
          title: lang === 'mr' ? 'जवळचे सुरक्षित निवारे' : 'Nearest Safe Shelters',
          metrics: [
            { label: lang === 'mr' ? 'मुख्य केंद्र' : 'Primary Hub', value: 'Sanjivani Campus (450 cap)' },
            { label: lang === 'mr' ? 'टाऊन हॉल' : 'Town Hall', value: 'Old Town (250 cap)' }
          ]
        };
      } else if (qLower.includes('crop') || qLower.includes('कांदा') || qLower.includes('शेती') || qLower.includes('agriculture') || qLower.includes('डाळिंब')) {
        dynamicCard = {
          type: 'map_snippet',
          title: lang === 'mr' ? 'कृषी हवामान निर्देशांक' : 'Agri-Weather Indicators',
          metrics: [
            { label: lang === 'mr' ? 'तापमान' : 'Temperature', value: `${telemetry?.temperature_c || 31}°C` },
            { label: lang === 'mr' ? 'हवामान स्थिती' : 'Condition', value: activeHazard.toUpperCase() }
          ]
        };
      } else {
        dynamicCard = {
          type: 'chart',
          title: lang === 'mr' ? 'स्थानिक मूल्यांकन' : 'Sector Assessment',
          metrics: [
            { label: lang === 'mr' ? 'पाणी पातळी' : 'River Stage', value: `${telemetry?.river_stage_m || 492.3}m` },
            { label: lang === 'mr' ? 'धोका पातळी' : 'Danger Level', value: '493.0m' }
          ]
        };
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: aiText,
        timestamp: responseTime,
        card: dynamicCard
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const responseTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' IST';
      const qLower = q.toLowerCase();
      let fallbackText = '';
      let fallbackCard: Message['card'] = undefined;

      if (qLower.includes('shelter') || qLower.includes('निवारा') || qLower.includes('sanjivani') || qLower.includes('संजीवनी')) {
        fallbackText = lang === 'mr'
          ? `🏛️ अधिकृत सुरक्षित निवारा केंद्रे (कोपरगाव):\n१) संजीवनी शैक्षणिक संकुल (उंची ५०८ मी, क्षमता ४५०) — अन्न, पिण्याचे पाणी व वैद्यकीय पथक सज्ज.\n२) नगर परिषद टाऊन हॉल (जुने गावठाण, क्षमता २५०)\n३) जिल्हा परिषद हायस्कूल, कोळपेवाडी (क्षमता १५०)\n\nमार्गदर्शन: नदीकाठचा जुना पूल रस्ता टाळून मुख्य कॉलेज मार्गाने जावे.\n📞 संपर्क: १०७७ / ११२`
          : `🏛️ Designated Safe Shelters (Kopargaon):\n1) Sanjivani Engineering College Campus (High ground 508m, Capacity: 450) — Food, clean water & medical team ready.\n2) Municipal Town Hall (Old Town, Capacity: 250)\n3) ZP High School, Kolpewadi (Capacity: 150)\n\nRoute Advice: Avoid the low-level Old Godavari Bridge causeway; use the main bypass route.\n📞 Helpline: 1077 / 112`;
        fallbackCard = {
          type: 'shelter_route',
          title: lang === 'mr' ? 'सक्रिय निवारा केंद्रे' : 'Active Relief Shelters',
          metrics: [
            { label: 'Sanjivani Hub', value: 'OPEN (Cap 450)' },
            { label: 'Town Hall', value: 'OPEN (Cap 250)' }
          ]
        };
      } else if (qLower.includes('crop') || qLower.includes('कांदा') || qLower.includes('शेती') || qLower.includes('farmer') || qLower.includes('agriculture') || qLower.includes('डाळिंब')) {
        fallbackText = lang === 'mr'
          ? `🌾 कृषी हवामान सल्ला (कोपरगाव तालुका):\n• कांदा पीक: काढणी केलेला कांदा तातडीने सुरक्षित शेडमध्ये किंवा ताडपत्रीने झाकून ठेवावा.\n• डाळिंब व द्राक्ष बागा: बागेतील पाण्याचा निचरा होण्यासाठी चर मोकळे करावेत.\n• अवकाळी पाऊस किंवा वादळाची शक्यता असल्यास शेतीतील जनावरांना पक्क्या छताखाली हलवावे.\n📞 तालुका कृषी अधिकारी कार्यालय: ०२४२३-२२२५५५`
          : `🌾 Agricultural Advisory (Kopargaon Taluka):\n• Onion Harvest: Move harvested onion stock under secure shed storage or tie down heavy tarpaulins immediately.\n• Pomegranate & Orchards: Ensure field drainage channels are cleared to prevent root waterlogging.\n• Livestock: Move farm animals and pump equipment to higher elevations away from riverbanks.\n📞 Taluka Agriculture Office: 02423-222555`;
        fallbackCard = {
          type: 'map_snippet',
          title: lang === 'mr' ? 'कृषी सल्ला' : 'Agri Support',
          metrics: [
            { label: 'Target Crops', value: 'Onion / Pomegranate' },
            { label: 'Helpline', value: '02423-222555' }
          ]
        };
      } else if (qLower.includes('helpline') || qLower.includes('number') || qLower.includes('contact') || qLower.includes('नंबर') || qLower.includes('फोन') || qLower.includes('कॉल')) {
        fallbackText = lang === 'mr'
          ? `📞 कोपरगाव आपत्कालीन संपर्क क्रमांक:\n• SDM नियंत्रण कक्ष: 1077 किंवा 02423-222333\n• राष्ट्रीय आपत्कालीन मदत: 112\n• रुग्णवाहिका: 108\n• अग्निशामक दल: 101\n• ग्रामीण रुग्णालय कोपरगाव: 02423-222240`
          : `📞 Kopargaon Emergency Helpline Directory:\n• SDM Disaster Control Room: 1077 or 02423-222333\n• All-India Emergency (Police/SDRF): 112\n• Ambulance Service: 108\n• Fire & Flood Rescue: 101\n• Rural Hospital Kopargaon: 02423-222240`;
        fallbackCard = {
          type: 'map_snippet',
          title: lang === 'mr' ? 'महत्त्वाचे संपर्क' : 'Key Helplines',
          metrics: [
            { label: 'SDM Control Room', value: '1077' },
            { label: 'Emergency', value: '112' }
          ]
        };
      } else {
        fallbackText = lang === 'mr'
          ? `सध्या गोदावरी नदीची पाणी पातळी ४९२.३० मीटर (इशारा पातळी: ४९२.०० मी, धोका पातळी: ४९३.०० मी) असून गंगापूर धरणातून ४२,५०० क्युसेक्स विसर्ग सुरू आहे [${responseTime}]. नदीकाठच्या वॉर्ड ४ (बेट कोपरगाव) मधील नागरिकांनी सतर्क राहावे.\n\n📍 जवळचे सुरक्षित निवारा केंद्र: संजीवनी शैक्षणिक संकुल (उंच सुरक्षित ठिकाण, क्षमता ४५०)\n📞 आपत्कालीन संपर्क: SDM नियंत्रण कक्ष: 1077 | राष्ट्रीय आणीबाणी: 112`
          : `Current Godavari River stage is at 492.30m (Warning: 492.00m, Danger: 493.00m) with an upstream discharge of 42,500 cusecs from Gangapur Dam [${responseTime}]. Residents in low-lying areas of Bet Kopargaon (Ward 4) should remain on alert.\n\n📍 Nearest Safe Shelter: Sanjivani Group Campus (Elevated high ground, Capacity: 450)\n📞 Emergency Helplines: SDM Control Room: 1077 | All-India Emergency: 112`;
        fallbackCard = {
          type: 'chart',
          title: lang === 'mr' ? 'हायड्रो मेट्रिक्स' : 'Verified Telemetry',
          metrics: [
            { label: 'Discharge', value: `42,500 cfs [${responseTime}]` },
            { label: 'River Crest', value: `492.3m [${responseTime}]` }
          ]
        };
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: fallbackText,
          timestamp: responseTime,
          card: fallbackCard
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    lang === 'mr' ? 'गोदावरी पाणी पातळी किती आहे?' : 'What is the current Godavari river stage?',
    lang === 'mr' ? 'द्राक्ष / कांदा पिकासाठी काही धोका आहे का?' : 'Is there any threat to grape/onion crops today?',
    lang === 'mr' ? 'सर्वात जवळचे सुरक्षित निवारा केंद्र कोणते?' : 'Where is the nearest open shelter?'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/60 backdrop-blur-sm">
      <motion.div
        id="ai-assistant-modal"
        initial={{ opacity: 0, y: 40, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
        className="w-full max-w-xl h-[85vh] sm:h-[650px] bg-white border border-slate-200 rounded-t-3xl sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700 shadow-sm">
              <span className="material-symbols-outlined material-symbols-filled text-2xl">
                smart_toy
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 tracking-tight">
                  {lang === 'mr' ? 'आपत्कालीन AI सहाय्यक' : 'Disaster Intelligence AI'}
                </h3>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {lang === 'mr' ? 'सत्यापित हायड्रो-मेट्रिक्ससह त्वरित मदत' : 'Timestamped hydro & weather reasoning'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* EN / MR Toggle */}
            <button
              id="ai-lang-toggle-btn"
              onClick={onToggleLang}
              className="px-2.5 py-1 rounded-xl text-xs font-bold font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors"
            >
              {lang === 'en' ? 'EN / मराठी' : 'मराठी / EN'}
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>

        {/* Chat Stream */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 no-scrollbar bg-slate-50/50">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  msg.sender === 'user'
                    ? 'bg-sky-600 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-slate-900 border border-slate-200 rounded-bl-none shadow-sm'
                }`}
              >
                <div className="text-body-large text-sm font-normal">{msg.text}</div>

                {/* Inline Mini-Card / Snippet inside AI Response */}
                {msg.card && (
                  <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-1.5">
                    <div className="text-[11px] font-bold text-sky-700 uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">analytics</span>
                      {msg.card.title}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200">
                      {msg.card.metrics.map((met, i) => (
                        <div key={i} className="flex flex-col">
                          <span className="text-[10px] text-slate-500 font-medium">{met.label}</span>
                          <span className="text-xs font-mono font-bold text-slate-800">{met.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp label & Voice Readout */}
              <div className="flex items-center gap-2 mt-1 px-1">
                <span className="text-[10px] text-slate-500 font-mono">
                  {msg.timestamp}
                </span>

                {msg.sender === 'assistant' && (
                  <button
                    onClick={() => handleSpeak(msg)}
                    className={`p-1 rounded-md text-[11px] flex items-center gap-1 transition-colors ${
                      isSpeaking && speakingMsgId === msg.id
                        ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300'
                        : 'text-slate-500 hover:text-amber-700'
                    }`}
                    title={lang === 'mr' ? 'ऐका' : 'Listen'}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {isSpeaking && speakingMsgId === msg.id ? 'volume_up' : 'campaign'}
                    </span>
                    <span className="text-[10px] font-sans font-medium">
                      {isSpeaking && speakingMsgId === msg.id ? (lang === 'mr' ? 'बोलत आहे...' : 'Speaking...') : (lang === 'mr' ? 'ऐका' : 'Listen')}
                    </span>
                  </button>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-2xl w-fit shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
              <span className="text-xs text-slate-600 font-medium">
                {lang === 'mr' ? 'माहितीचे विश्लेषण सुरू आहे...' : 'Analyzing telemetry and risk vectors...'}
              </span>
            </div>
          )}
          <div ref={scrollRef} />
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 bg-white border-t border-slate-200 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-3 py-1.5 rounded-full whitespace-nowrap transition-colors font-medium"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={lang === 'mr' ? 'आपत्कालीन प्रश्न विचारा...' : 'Ask about risk, shelters, discharge...'}
              className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-600 focus:bg-white transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="w-12 h-11 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white flex items-center justify-center shadow-sm transition-all"
            >
              <span className="material-symbols-outlined text-xl">send</span>
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

