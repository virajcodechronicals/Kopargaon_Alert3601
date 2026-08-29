import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface EscalationPackageModalProps {
  onClose: () => void;
  lang: 'en' | 'mr';
}

export const EscalationPackageModal: React.FC<EscalationPackageModalProps> = ({ onClose, lang }) => {
  const [activeTab, setActiveTab] = useState<'hydro' | 'media' | 'escalation'>('hydro');
  const [copied, setCopied] = useState<string | null>(null);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const pressReleaseText = `FOR IMMEDIATE RELEASE
URGENT: Flood Alert Issued for Kopargaon as Upstream Discharge Increases
[Date/Time] — The Kopargaon Disaster Management Desk issues a high-level alert for all citizens residing near the Godavari River. Due to heavy rainfall in the Nashik catchment area, 50,000+ cusecs of water is currently being discharged from Nandur Madhmeshwar Weir.
This surge is expected to reach Kopargaon within 5 to 7 hours. The river is projected to cross the danger mark, inundating the Godavari Ghats and low-level bridges.
Action Required: All residents in Bet Kopargaon and riverside settlements must move to higher ground immediately. Farmers must secure livestock and evacuate the river basin.
Emergency Helpline: 1077 (District Control Room).`;

  const marathiPressRelease = `अतिदक्षता इशारा: नाशिक धरण क्षेत्रातून नांदूर मध्यमेश्वर बंधाऱ्यातून ५०,०००+ क्युसेक पाण्याचा विसर्ग गोदावरी नदीत करण्यात आला आहे. हे पाणी पुढील ५-७ तासांत कोपरगाव शहरात पोहोचण्याची शक्यता आहे. गोदावरी काठच्या नागरिकांनी (विशेषतः बेट भाग आणि जुना घाट) त्वरित सुरक्षित स्थळी स्थलांतर करावे. शेतकरी बांधवांनी नदीकाठच्या मोटारी आणि जनावरे सुरक्षित ठिकाणी हलवावीत. मदतीसाठी १०७७ वर संपर्क साधा.`;

  const waBulletin = `🔴 RED ALERT: KOPARGAON FLOOD WARNING 🔴
🌊 Discharge: 50,000+ Cusecs from Nandur Madhmeshwar.
⏱️ Expected ETA to Kopargaon: Next 5-7 Hours.
🛑 AT RISK: Godavari Ghat, Bet Area, Old Bridge, Shingnapur riverbanks.
⚠️ INSTRUCTIONS:
1. DO NOT cross flooded bridges.
2. Evacuate livestock immediately.
3. Move valuables to upper floors.
📞 Helpline: 1077 (Toll-Free)`;

  const escalationTemplate = `To: The District Collector & Chairman, DDMA, Ahilyanagar.
Copy To: Divisional Commissioner, Nashik Division; Secretary, Relief & Rehabilitation (Maharashtra).

Subject: URGENT: Dereliction of Duty and Failure of Flood Early Warning Protocols in Kopargaon Taluka.

Respected Sir/Madam,

This is an urgent escalation regarding the imminent threat to life and property in Kopargaon Taluka due to the current discharge of 50,000+ cusecs from upstream reservoirs into the Godavari River.

Despite the highly predictable transit time of the flood wave, local authorities (Kopargaon Tehsil & Municipal Council) have completely failed to execute the standard operating procedures mandated by the NDMA. Specifically:
1. No public sirens or mass-broadcast warnings have been issued.
2. Vulnerable zones (Godavari Ghats, Bet Kopargaon) have not been barricaded or preemptively evacuated.
3. Emergency response lines at the local level remain unresponsive.

This administrative paralysis constitutes a severe dereliction of duty and a direct threat to the right to life of the citizens. I urge you to immediately invoke your powers under the Disaster Management Act, 2005, to bypass local bottlenecks, deploy district-level rescue teams (SDRF), and initiate emergency evacuation alerts.

We are holding this communication as a formal record of prior intimation should any loss of life or catastrophic property damage occur due to the continued inaction of the state machinery.

Sincerely,
[Your Name / Organization]
[Contact Information]`;

  const tabs = [
    { id: 'hydro', icon: 'water', labelEn: 'Hydro & Transit', labelMr: 'पाणी व वेळ' },
    { id: 'media', icon: 'campaign', labelEn: 'Media & Broadcast', labelMr: 'माध्यम व प्रसार' },
    { id: 'escalation', icon: 'gavel', labelEn: 'Admin Escalation', labelMr: 'प्रशासनिक कारवाई' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl max-h-[85vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">description</span>
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-lg leading-tight">
                {lang === 'mr' ? 'संकटकालीन अहवाल व कृती पॅकेज' : 'Situational Report & Action Pack'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {lang === 'mr' ? 'कोपरगाव गोदावरी खोरे' : 'Kopargaon Godavari Basin'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/50 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex overflow-x-auto no-scrollbar border-b border-slate-200 bg-white px-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 min-w-[120px] px-4 py-3 flex items-center justify-center gap-2 border-b-2 text-sm font-bold transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-700 bg-indigo-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              <span>{lang === 'mr' ? tab.labelMr : tab.labelEn}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 bg-white">
          <AnimatePresence mode="wait">
            {activeTab === 'hydro' && (
              <motion.div
                key="hydro"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-600">route</span>
                    {lang === 'mr' ? 'अंदाजित प्रवाह वेळ (नांदूर मध्यमेश्वर ते कोपरगाव: ~४५ किमी)' : 'Estimated Transit Times (Nandur Madhmeshwar to Kopargaon: ~45km)'}
                  </h3>
                  <div className="grid gap-3">
                    <div className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                        <span className="font-bold">A</span>
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{lang === 'mr' ? 'सामान्य / वाढीव (२०,००० क्युसेक पर्यंत)' : 'Normal/Elevated (Up to 20,000 cusecs)'}</div>
                        <div className="text-sm text-slate-600 mt-1">{lang === 'mr' ? '~८ ते १२ तास. नदी पात्रातच राहते.' : '~8 to 12 hours. River remains within banks.'}</div>
                      </div>
                    </div>
                    <div className="p-3 border border-amber-200 rounded-xl bg-amber-50 flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                        <span className="font-bold">B</span>
                      </div>
                      <div>
                        <div className="font-bold text-amber-900">{lang === 'mr' ? 'उच्च धोका (५०,००० क्युसेक)' : 'High Risk (50,000 cusecs)'}</div>
                        <div className="text-sm text-amber-800 mt-1">{lang === 'mr' ? '~५ ते ७ तास. सखल पूल पाण्याखाली.' : '~5 to 7 hours. Water overtops low-level bridges.'}</div>
                      </div>
                    </div>
                    <div className="p-3 border border-rose-200 rounded-xl bg-rose-50 flex gap-4">
                      <div className="w-12 h-12 rounded-full bg-rose-200 text-rose-800 flex items-center justify-center shrink-0">
                        <span className="font-bold">C</span>
                      </div>
                      <div>
                        <div className="font-bold text-rose-900">{lang === 'mr' ? 'तीव्र पूर (१,००,०००+ क्युसेक)' : 'Severe/Flash Surge (100,000+ cusecs)'}</div>
                        <div className="text-sm text-rose-800 mt-1">{lang === 'mr' ? '~३ ते ५ तास. तातडीने स्थलांतर आवश्यक.' : '~3 to 5 hours. Rapid surge wave. Immediate evacuation required.'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="material-symbols-outlined text-rose-600">warning</span>
                    {lang === 'mr' ? 'अतिधोकादायक क्षेत्रे' : 'High-Vulnerability Sectors'}
                  </h3>
                  <ul className="list-disc pl-5 text-sm text-slate-700 space-y-2">
                    <li><strong>{lang === 'mr' ? 'शहरी भाग:' : 'Urban Nodes:'}</strong> {lang === 'mr' ? 'जुना गोदावरी घाट, बेट कोपरगाव (संपर्क तुटण्याचा धोका).' : 'Old Godavari Ghat, Bet Kopargaon (highly susceptible to isolation).'}</li>
                    <li><strong>{lang === 'mr' ? 'पायाभूत सुविधा:' : 'Infrastructure:'}</strong> {lang === 'mr' ? 'जुना कोपरगाव-येवला जोडणारा पूल, नदीकाठचे पंप हाऊस.' : 'Old Kopargaon-Yeola connecting bridge, riverside pump houses.'}</li>
                    <li><strong>{lang === 'mr' ? 'शेती भाग:' : 'Agricultural Belts:'}</strong> {lang === 'mr' ? 'शिंगणापूर, कोकमठाण आणि परिसरातील नदीकाठचे शेती क्षेत्र.' : 'Riverside farming zones in Shingnapur, Kokamthan, and surrounding villages.'}</li>
                  </ul>
                </div>
              </motion.div>
            )}

            {activeTab === 'media' && (
              <motion.div
                key="media"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">1. Press Release (English)</h3>
                    <button onClick={() => handleCopy(pressReleaseText, 'pr_en')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied === 'pr_en' ? 'COPIED!' : 'COPY'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono whitespace-pre-wrap text-slate-700">
                    {pressReleaseText}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">2. प्रेसनोट (मराठी)</h3>
                    <button onClick={() => handleCopy(marathiPressRelease, 'pr_mr')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied === 'pr_mr' ? 'COPIED!' : 'COPY'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono whitespace-pre-wrap text-slate-700">
                    {marathiPressRelease}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">3. WhatsApp / Telegram Bulletin</h3>
                    <button onClick={() => handleCopy(waBulletin, 'wa')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied === 'wa' ? 'COPIED!' : 'COPY'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono whitespace-pre-wrap text-slate-700">
                    {waBulletin}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'escalation' && (
              <motion.div
                key="escalation"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-rose-900 flex items-center gap-2">
                    <span className="material-symbols-outlined">warning</span>
                    {lang === 'mr' ? 'प्रशासनिक कारवाई टप्पे' : 'Administrative Escalation Workflow'}
                  </h3>
                  <div className="space-y-2 text-sm text-rose-800">
                    <p><strong>Level 1 (Hours 0-2):</strong> Immediate Field Desk (Tehsildar, Municipal Council, WRD). Call & tag official X (Twitter) handles.</p>
                    <p><strong>Level 2 (Hours 2-4):</strong> District Control (Collector, DDMA). Escalate via 1077 demanding intervention.</p>
                    <p><strong>Level 3 (Hours 4+):</strong> Legal & Grievance. File on Aaple Sarkar & RTI Section 7(1) for Life and Liberty (48h response).</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800">{lang === 'mr' ? 'औपचारिक तक्रार मसुदा (Level 2/3)' : 'Formal Escalation Template (Level 2/3)'}</h3>
                    <button onClick={() => handleCopy(escalationTemplate, 'template')} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      {copied === 'template' ? 'COPIED!' : 'COPY'}
                    </button>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono whitespace-pre-wrap text-slate-700 h-[300px] overflow-y-auto">
                    {escalationTemplate}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
