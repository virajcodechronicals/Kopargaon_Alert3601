import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RumorItem } from '../types';
import { store } from '../store';
import { SpeechEngine } from '../utils/speech';

interface RumorBusterHubProps {
  lang: 'en' | 'mr';
  onClose?: () => void;
  initialMode?: 'citizen' | 'authority';
}

export const RumorBusterHub: React.FC<RumorBusterHubProps> = ({
  lang,
  onClose,
  initialMode = 'citizen'
}) => {
  const [activeTab, setActiveTab] = useState<'citizen' | 'authority'>(initialMode);
  const [rumors, setRumors] = useState<RumorItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [verdictFilter, setVerdictFilter] = useState<string>('ALL');
  
  // Citizen Submit Form State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [claimTitleInput, setClaimTitleInput] = useState('');
  const [claimTextInput, setClaimTextInput] = useState('');
  const [categoryInput, setCategoryInput] = useState<'Dam Discharge' | 'Bridge & Roads' | 'Weather' | 'Evacuation' | 'General'>('General');
  const [originLocationInput, setOriginLocationInput] = useState('');
  const [screenshotInput, setScreenshotInput] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccessMsg, setSubmitSuccessMsg] = useState('');

  // Authority Publish Form State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [selectedPendingRumor, setSelectedPendingRumor] = useState<RumorItem | null>(null);
  const [isAiVerifying, setIsAiVerifying] = useState(false);
  
  // Authority Form Fields
  const [formTitle, setFormTitle] = useState('');
  const [formText, setFormText] = useState('');
  const [formTextMr, setFormTextMr] = useState('');
  const [formVerdict, setFormVerdict] = useState<'Fake' | 'Misleading' | 'Verified'>('Fake');
  const [formCategory, setFormCategory] = useState<'Dam Discharge' | 'Bridge & Roads' | 'Weather' | 'Evacuation' | 'General'>('General');
  const [formClarificationEn, setFormClarificationEn] = useState('');
  const [formClarificationMr, setFormClarificationMr] = useState('');
  const [formEvidenceData, setFormEvidenceData] = useState('');
  const [formVerifiedBy, setFormVerifiedBy] = useState('Tehsildar & Sub-Divisional Disaster Cell, Kopargaon');
  const [formBroadcastTicker, setFormBroadcastTicker] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);

  // Toast / Status Message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadRumors();
  }, []);

  const loadRumors = async () => {
    const data = await store.getRumors();
    setRumors(data);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Citizen Submission Handler
  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTextInput.trim()) return;

    setIsSubmitting(true);
    try {
      await store.submitRumor({
        claimTitle: claimTitleInput || 'WhatsApp Claim Submitted',
        claimText: claimTextInput,
        category: categoryInput,
        originLocation: originLocationInput || 'Kopargaon Taluka',
        screenshotUrl: screenshotInput || undefined
      });
      setIsSubmitting(false);
      setSubmitSuccessMsg(
        lang === 'mr'
          ? 'तुमचा दावा पडताळणीसाठी आपत्ती नियंत्रण कक्षात यशस्वीपणे नोंदवला गेला आहे!'
          : 'Your claim has been logged into the Kopargaon Disaster Control Verification Queue!'
      );
      setClaimTitleInput('');
      setClaimTextInput('');
      setOriginLocationInput('');
      setScreenshotInput(null);
      await loadRumors();
      setTimeout(() => {
        setSubmitSuccessMsg('');
        setShowSubmitModal(false);
      }, 2000);
    } catch {
      setIsSubmitting(false);
      showToast('Submission failed. Please try again.');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotInput(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 2. WhatsApp Viral Counter-Share Handler
  const handleWhatsAppCounterShare = async (item: RumorItem) => {
    await store.incrementRumorShare(item.id);

    const verdictBadgeText =
      item.verdict === 'Fake'
        ? '❌ FAKE / DEBUNKED (अफवा / संपूर्णपणे खोटे)'
        : item.verdict === 'Misleading'
        ? '⚠️ MISLEADING / OUTDATED (दिशाभूल करणारे / जुने फुटेज)'
        : '✅ OFFICIAL / VERIFIED (सत्य / अधिकृत माहिती)';

    const formattedShareText = `🚨 *KOPARALERT 360 OFFICIAL FACT-CHECK* 🚨
-----------------------------------------
📌 *दावा / Claim:* "${item.claimTitle}"
🛑 *निष्कर्ष / Verdict:* ${verdictBadgeText}

ℹ️ *अधिकृत स्पष्टीकरण (Marathi):*
${item.clarificationMarathi}

🇬🇧 *Official Clarification (English):*
${item.officialClarification}

📊 *टेलिमेत्री पुरावा / Evidence:* ${item.evidenceData || 'WRD Telemetry Validated'}
🏛️ *पडताळणी अधिकारी:* ${item.verifiedBy}

-----------------------------------------
👉 अफवा थांबवा! अधिकृत माहिती फक्त KoparAlert 360 वर: https://kopargaon-alert360.gov.in`;

    // Copy to clipboard
    try {
      await navigator.clipboard.writeText(formattedShareText);
    } catch {}

    // Open WhatsApp Share URL
    const encodedUrl = encodeURIComponent(formattedShareText);
    window.open(`https://api.whatsapp.com/send?text=${encodedUrl}`, '_blank');

    showToast(
      lang === 'mr'
        ? 'सत्यता पडताळणी मेसेज क्लिपबोर्डवर कॉपी झाला व WhatsApp वर उघडत आहे!'
        : 'Fact-Check text copied to clipboard & opening WhatsApp Share!'
    );

    // Refresh count locally
    setRumors(prev =>
      prev.map(r => (r.id === item.id ? { ...r, sharesCount: (r.sharesCount || 0) + 1 } : r))
    );
  };

  // 3. Authority AI Pre-Verification Handler
  const handleTriggerAiPreVerification = async (targetRumor: RumorItem) => {
    setSelectedPendingRumor(targetRumor);
    setShowPublishModal(true);
    setIsAiVerifying(true);

    // Fill initial known data
    setFormTitle(targetRumor.claimTitle || 'Rumor Verification');
    setFormText(targetRumor.claimText);
    setFormCategory(targetRumor.category || 'General');

    try {
      const aiResult = await store.verifyRumorAI(targetRumor);
      setFormVerdict(aiResult.verdict);
      setFormClarificationEn(aiResult.officialClarification);
      setFormClarificationMr(aiResult.clarificationMarathi);
      setFormEvidenceData(aiResult.evidenceData);
      setFormTextMr(aiResult.claimMarathi || targetRumor.claimText);
      setIsAiVerifying(false);
      showToast('Gemini 2.5 Flash AI Pre-Verification generated verdict & Marathi text!');
    } catch {
      setIsAiVerifying(false);
      showToast('AI Pre-Verification unavailable. Filled standard template.');
    }
  };

  // 4. Authority Publish Rumor Handler
  const handlePublishRumorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClarificationEn.trim() || !formClarificationMr.trim()) return;

    setIsPublishing(true);
    const itemToPublish: RumorItem = {
      id: selectedPendingRumor ? selectedPendingRumor.id : `rumor-${Date.now()}`,
      claimTitle: formTitle || 'Public Claim Fact-Check',
      claimText: formText,
      claimMarathi: formTextMr || formText,
      verdict: formVerdict,
      category: formCategory,
      officialClarification: formClarificationEn,
      clarificationMarathi: formClarificationMr,
      evidenceData: formEvidenceData || 'WRD Kopargaon Hydro Telemetry Validated',
      verifiedBy: formVerifiedBy,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString('en-IN'),
      reportedCount: selectedPendingRumor ? selectedPendingRumor.reportedCount : 1,
      sharesCount: selectedPendingRumor ? selectedPendingRumor.sharesCount : 0,
      status: 'PUBLISHED'
    };

    try {
      await store.publishRumor(itemToPublish, formBroadcastTicker);
      setIsPublishing(false);
      setShowPublishModal(false);
      setSelectedPendingRumor(null);
      await loadRumors();
      showToast(
        formBroadcastTicker
          ? 'Fact-Check published & broadcasted to emergency ticker!'
          : 'Fact-Check published to public hub successfully!'
      );
    } catch {
      setIsPublishing(false);
      showToast('Failed to publish rumor.');
    }
  };

  // 5. Authority Reject Rumor Handler
  const handleRejectRumor = async (id: string) => {
    await store.rejectRumor(id);
    await loadRumors();
    showToast('Submission marked as rejected.');
  };

  // Filter Logic
  const publishedRumors = rumors.filter(r => r.status === 'PUBLISHED' || !r.status);
  const pendingRumors = rumors.filter(r => r.status === 'PENDING');

  const filteredPublishedRumors = publishedRumors.filter(r => {
    const matchesCategory = categoryFilter === 'ALL' || r.category === categoryFilter;
    const matchesVerdict =
      verdictFilter === 'ALL' ||
      (verdictFilter === 'Fake' && r.verdict === 'Fake') ||
      (verdictFilter === 'Misleading' && r.verdict === 'Misleading') ||
      (verdictFilter === 'Verified' && r.verdict === 'Verified');
    const qLower = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      r.claimTitle.toLowerCase().includes(qLower) ||
      r.claimText.toLowerCase().includes(qLower) ||
      (r.claimMarathi && r.claimMarathi.toLowerCase().includes(qLower)) ||
      r.officialClarification.toLowerCase().includes(qLower) ||
      r.clarificationMarathi.toLowerCase().includes(qLower);

    return matchesCategory && matchesVerdict && matchesQuery;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Top Notification Toast */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-amber-300 font-bold text-xs px-4 py-2 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm text-amber-400">info</span>
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header Bar */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/90 border border-rose-500 flex items-center justify-center text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">verified_user</span>
            </div>
            <div>
              <h3 className="font-extrabold text-base tracking-tight flex items-center gap-2">
                <span>
                  {lang === 'mr'
                    ? 'अफवा खंडन व सत्यता पडताळणी कक्ष'
                    : 'Rumor Buster & Fact-Checking Engine'}
                </span>
                <span className="text-[10px] bg-rose-500 text-white font-mono px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  KoparAlert 360
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {lang === 'mr'
                  ? 'शासकीय जी.आर. व थेट हायड्रो टेलिमेत्रीद्वारे अफवांचे खंडन'
                  : 'Multi-hazard fact-check hub powered by real-time dam telemetry & SDM Disaster Cell'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="bg-slate-800 p-1 rounded-2xl border border-slate-700 flex items-center gap-1">
              <button
                onClick={() => setActiveTab('citizen')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'citizen'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">public</span>
                <span>{lang === 'mr' ? 'नागरिक हब' : 'Public Hub'}</span>
              </button>
              <button
                onClick={() => setActiveTab('authority')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'authority'
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                <span>
                  {lang === 'mr' ? 'आपत्ती कक्ष पडताळणी' : 'Disaster Cell Queue'}
                </span>
                {pendingRumors.length > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[10px] font-mono flex items-center justify-center font-extrabold animate-pulse">
                    {pendingRumors.length}
                  </span>
                )}
              </button>
            </div>

            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors ml-2"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 p-5 sm:p-6 overflow-y-auto space-y-6 bg-slate-50 no-scrollbar">
          {activeTab === 'citizen' ? (
            /* ==========================================
               MODE 1: CITIZEN PUBLIC FACT-CHECK HUB
               ========================================== */
            <div className="space-y-6">
              {/* Banner & Submit CTA */}
              <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 text-[11px] font-mono font-bold uppercase tracking-wide border border-rose-500/30">
                    <span className="material-symbols-outlined text-sm">shield</span>
                    <span>{lang === 'mr' ? 'नागरिक सुरक्षा ढाल' : 'Zero Panic Fact-Check Shield'}</span>
                  </div>
                  <h4 className="text-lg font-bold tracking-tight">
                    {lang === 'mr'
                      ? 'सोशल मीडियावरील संशयास्पद बातमीची सत्यता तपासा'
                      : 'Circulating WhatsApp Rumor or Dam Breach Claim? Verify Here.'}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xl">
                    {lang === 'mr'
                      ? 'कोपरगाव आपत्ती नियंत्रण कक्ष व थेट हायड्रो डेटाद्वारे पडताळलेले अधिकृत दावे पहा किंवा नवीन अफवा तपासा.'
                      : 'Official clarification backed by Executive Engineer WRD telemetry, PWD structural audits & Tahsildar GR orders.'}
                  </p>
                </div>

                <button
                  onClick={() => setShowSubmitModal(true)}
                  className="px-5 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-xl flex items-center gap-2 shrink-0 transition-transform active:scale-95"
                >
                  <span className="material-symbols-outlined text-base">post_add</span>
                  <span>{lang === 'mr' ? 'अफवा पडताळणीसाठी पाठवा' : 'Submit Rumor for Fact-Check'}</span>
                </button>
              </div>

              {/* Filters & Search Bar */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      search
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder={
                        lang === 'mr'
                          ? 'अफवा, धरण विसर्ग किंवा पुलाबाबत शोधा...'
                          : 'Search by keyword (e.g. Bhandardara breach, Bridge collapse, Water cut)...'
                      }
                      className="w-full bg-white border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 shadow-sm"
                    />
                  </div>

                  {/* Verdict Filter Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm self-start sm:self-auto">
                    <button
                      onClick={() => setVerdictFilter('ALL')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
                        verdictFilter === 'ALL'
                          ? 'bg-slate-900 text-white shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({publishedRumors.length})
                    </button>
                    <button
                      onClick={() => setVerdictFilter('Fake')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                        verdictFilter === 'Fake'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'text-rose-700 hover:bg-rose-50'
                      }`}
                    >
                      <span>❌ Fake</span>
                      <span>({publishedRumors.filter(r => r.verdict === 'Fake').length})</span>
                    </button>
                    <button
                      onClick={() => setVerdictFilter('Misleading')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                        verdictFilter === 'Misleading'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-amber-800 hover:bg-amber-50'
                      }`}
                    >
                      <span>⚠️ Misleading</span>
                      <span>({publishedRumors.filter(r => r.verdict === 'Misleading').length})</span>
                    </button>
                    <button
                      onClick={() => setVerdictFilter('Verified')}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 ${
                        verdictFilter === 'Verified'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-emerald-800 hover:bg-emerald-50'
                      }`}
                    >
                      <span>✅ Verified</span>
                      <span>({publishedRumors.filter(r => r.verdict === 'Verified').length})</span>
                    </button>
                  </div>
                </div>

                {/* Category Filter Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                  <span className="text-[11px] font-mono font-bold text-slate-500 shrink-0 uppercase tracking-wide mr-1">
                    {lang === 'mr' ? 'वर्गवारी:' : 'Category:'}
                  </span>
                  {['ALL', 'Dam Discharge', 'Bridge & Roads', 'Weather', 'Evacuation', 'General'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-xl font-bold shrink-0 transition-all border ${
                        categoryFilter === cat
                          ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {cat === 'ALL'
                        ? lang === 'mr'
                          ? 'सर्व वर्गवारी'
                          : 'All Categories'
                        : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Published Debunk Cards Feed */}
              <div className="space-y-4">
                {filteredPublishedRumors.length === 0 ? (
                  <div className="p-8 text-center bg-white border border-slate-200 rounded-3xl space-y-2">
                    <span className="material-symbols-outlined text-4xl text-slate-300">find_in_page</span>
                    <p className="text-sm font-bold text-slate-600">
                      {lang === 'mr' ? 'कोणतेही दावे आढळले नाहीत.' : 'No matching claims found.'}
                    </p>
                    <p className="text-xs text-slate-400">
                      Try searching with different keywords or clearing filters.
                    </p>
                  </div>
                ) : (
                  filteredPublishedRumors.map(item => {
                    const isFake = item.verdict === 'Fake';
                    const isMisleading = item.verdict === 'Misleading';
                    const isVerified = item.verdict === 'Verified';

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-3xl p-5 shadow-sm transition-all hover:shadow-md ${
                          isFake
                            ? 'border-rose-300 ring-1 ring-rose-200'
                            : isMisleading
                            ? 'border-amber-300 ring-1 ring-amber-200'
                            : 'border-emerald-300 ring-1 ring-emerald-200'
                        }`}
                      >
                        {/* Header Badge & Metadata */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            {/* Verdict Badge */}
                            <span
                              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-black uppercase tracking-wider flex items-center gap-1.5 shadow-sm ${
                                isFake
                                  ? 'bg-rose-600 text-white'
                                  : isMisleading
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'bg-emerald-600 text-white'
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {isFake ? 'cancel' : isMisleading ? 'warning' : 'verified'}
                              </span>
                              <span>
                                {isFake
                                  ? lang === 'mr'
                                    ? '❌ अफवा / पूर्णपणे खोटे'
                                    : '❌ FAKE / DEBUNKED'
                                  : isMisleading
                                  ? lang === 'mr'
                                    ? '⚠️ दिशाभूल करणारे / जुने फुटेज'
                                    : '⚠️ MISLEADING / OUTDATED'
                                  : lang === 'mr'
                                  ? '✅ सत्य / अधिकृत माहिती'
                                  : '✅ OFFICIAL / VERIFIED'}
                              </span>
                            </span>

                            {/* Category Pill */}
                            <span className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                              {item.category}
                            </span>
                          </div>

                          <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">schedule</span>
                            <span>{item.timestamp}</span>
                          </span>
                        </div>

                        {/* Claim Title & Circulating Text */}
                        <div className="space-y-1.5 mb-4">
                          <h4 className="font-extrabold text-sm text-slate-900 leading-snug">
                            {item.claimTitle}
                          </h4>
                          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-800 italic font-mono leading-relaxed">
                            "{lang === 'mr' && item.claimMarathi ? item.claimMarathi : item.claimText}"
                          </div>
                        </div>

                        {/* Official Fact-Check Clarification & Evidence Card */}
                        <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3 shadow-inner">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="text-xs font-extrabold text-rose-400 flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-base text-emerald-400">
                                verified_user
                              </span>
                              <span>
                                {lang === 'mr'
                                  ? 'प्रशासन व हायड्रो टेलिमेत्री स्पष्टीकरण'
                                  : 'Official Disaster Cell Clarification'}
                              </span>
                            </span>

                            <span className="text-[10px] font-mono text-slate-400 font-bold">
                              {item.verifiedBy}
                            </span>
                          </div>

                          {/* Dual Language Official Clarification */}
                          <div className="space-y-2 text-xs leading-relaxed">
                            <p className="font-semibold text-amber-200">
                              <strong className="text-white">मराठी: </strong>
                              {item.clarificationMarathi}
                            </p>
                            <p className="text-slate-300">
                              <strong className="text-slate-100">English: </strong>
                              {item.officialClarification}
                            </p>
                          </div>

                          {/* Telemetry / Structural Evidence Badge */}
                          {item.evidenceData && (
                            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                              <span className="text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs text-amber-400">analytics</span>
                                <span>{lang === 'mr' ? 'अधिकृत पुरावा:' : 'Official Evidence:'}</span>
                              </span>
                              <span className="font-bold text-emerald-300 bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
                                {item.evidenceData}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Action Footer: Marathi Speech & One-Click WhatsApp Viral Share */}
                        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-rose-500">report</span>
                              <span>{item.reportedCount || 1} Reported</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm text-emerald-600">share</span>
                              <span>{item.sharesCount || 0} Shared</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Speech Audio Button */}
                            <button
                              onClick={() =>
                                SpeechEngine.speak(
                                  lang === 'mr' ? item.clarificationMarathi : item.officialClarification,
                                  lang
                                )
                              }
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 border border-slate-200 transition-colors"
                              title="Listen to official clarification audio"
                            >
                              <span className="material-symbols-outlined text-base text-rose-600">volume_up</span>
                              <span>{lang === 'mr' ? 'ऐका' : 'Listen TTS'}</span>
                            </button>

                            {/* WhatsApp Viral Counter Share Button */}
                            <button
                              onClick={() => handleWhatsAppCounterShare(item)}
                              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                            >
                              <span className="material-symbols-outlined text-base">send</span>
                              <span>{lang === 'mr' ? 'WhatsApp वर फॉरवर्ड करा' : 'Share Fact-Check'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* ==========================================
               MODE 2: AUTHORITY DISASTER CELL COMMAND QUEUE
               ========================================== */
            <div className="space-y-6">
              <div className="bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-mono font-bold uppercase tracking-wide border border-amber-500/30">
                    <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
                    <span>SDM / Tehsildar Disaster Cell Command</span>
                  </div>
                  <h4 className="text-lg font-bold tracking-tight mt-1">
                    Public Submissions & Rumor Verification Queue
                  </h4>
                  <p className="text-xs text-slate-300">
                    Review public rumor submissions, run Gemini 2.5 Flash AI telemetry pre-verification, and publish official debunks.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSelectedPendingRumor(null);
                    setFormTitle('');
                    setFormText('');
                    setFormTextMr('');
                    setFormClarificationEn('');
                    setFormClarificationMr('');
                    setFormEvidenceData('');
                    setShowPublishModal(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg flex items-center gap-2 shrink-0"
                >
                  <span className="material-symbols-outlined text-base">add_circle</span>
                  <span>Create Direct Fact-Check</span>
                </button>
              </div>

              {/* Pending Queue List */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-600 text-base">pending_actions</span>
                  <span>Incoming Citizen Submissions ({pendingRumors.length})</span>
                </h4>

                {pendingRumors.length === 0 ? (
                  <div className="p-6 bg-white border border-slate-200 rounded-2xl text-center space-y-1">
                    <span className="material-symbols-outlined text-3xl text-emerald-500">task_alt</span>
                    <p className="text-xs font-bold text-slate-700">Verification Queue is Empty!</p>
                    <p className="text-[11px] text-slate-400">All submitted rumors have been verified and published.</p>
                  </div>
                ) : (
                  pendingRumors.map(pending => (
                    <div
                      key={pending.id}
                      className="bg-white border border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 font-mono text-[10px] font-bold">
                            {pending.category}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {pending.timestamp} • {pending.originLocation || 'Kopargaon'}
                          </span>
                        </div>

                        <h5 className="font-bold text-xs text-slate-900">"{pending.claimText}"</h5>

                        {pending.screenshotUrl && (
                          <div className="mt-2">
                            <img
                              src={pending.screenshotUrl}
                              alt="Screenshot evidence"
                              className="h-16 rounded-lg border border-slate-200 object-cover"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {/* Gemini AI Pre-Verification Button */}
                        <button
                          onClick={() => handleTriggerAiPreVerification(pending)}
                          className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-transform"
                        >
                          <span className="material-symbols-outlined text-base text-amber-400">auto_awesome</span>
                          <span>AI Pre-Verify & Publish</span>
                        </button>

                        <button
                          onClick={() => handleRejectRumor(pending.id)}
                          className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Published Rumors Audit Summary */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600 text-base">fact_check</span>
                  <span>Published Fact-Check Bulletins ({publishedRumors.length})</span>
                </h4>

                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-mono font-bold border-b border-slate-200">
                        <th className="p-3">Verdict</th>
                        <th className="p-3">Claim</th>
                        <th className="p-3">Official Clarification</th>
                        <th className="p-3">Verified By</th>
                        <th className="p-3 text-right">Shares</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {publishedRumors.map(pub => (
                        <tr key={pub.id} className="hover:bg-slate-50">
                          <td className="p-3 font-bold">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                pub.verdict === 'Fake'
                                  ? 'bg-rose-100 text-rose-800'
                                  : pub.verdict === 'Misleading'
                                  ? 'bg-amber-100 text-amber-900'
                                  : 'bg-emerald-100 text-emerald-900'
                              }`}
                            >
                              {pub.verdict}
                            </span>
                          </td>
                          <td className="p-3 font-sans font-semibold text-slate-900 max-w-xs truncate">
                            {pub.claimTitle}
                          </td>
                          <td className="p-3 font-sans text-slate-600 max-w-md truncate">
                            {pub.officialClarification}
                          </td>
                          <td className="p-3 text-slate-500 text-[10px]">{pub.verifiedBy}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{pub.sharesCount || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ====================================================
          SUB-MODAL 1: CITIZEN SUBMIT RUMOR FOR FACT-CHECK
          ==================================================== */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-rose-500 text-xl">post_add</span>
                  <h4 className="font-extrabold text-sm">
                    {lang === 'mr' ? 'अफवा पडताळणीसाठी नोंदवा' : 'Submit Claim for Verification'}
                  </h4>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handleCitizenSubmit} className="p-6 space-y-4">
                {submitSuccessMsg ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-600 text-lg">check_circle</span>
                    <span>{submitSuccessMsg}</span>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">
                        {lang === 'mr' ? 'दाव्याचे शीर्षक:' : 'Claim Title / Topic:'}
                      </label>
                      <input
                        type="text"
                        value={claimTitleInput}
                        onChange={e => setClaimTitleInput(e.target.value)}
                        placeholder="e.g. Bhandardara dam audio message..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">
                        {lang === 'mr' ? 'व्हाट्सॲप / सोशल मीडिया मेसेज:' : 'Circulating Claim Message / Text:'}
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={claimTextInput}
                        onChange={e => setClaimTextInput(e.target.value)}
                        placeholder={
                          lang === 'mr'
                            ? 'इथे मेसेज पेस्ट करा (उदा. "पाणी बंद होणार आहे...")'
                            : 'Paste forwarded WhatsApp text or audio message transcript...'
                        }
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-600"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Category:</label>
                        <select
                          value={categoryInput}
                          onChange={e => setCategoryInput(e.target.value as any)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        >
                          <option value="Dam Discharge">Dam Discharge</option>
                          <option value="Bridge & Roads">Bridge & Roads</option>
                          <option value="Weather">Weather</option>
                          <option value="Evacuation">Evacuation</option>
                          <option value="General">General</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Origin Location:</label>
                        <input
                          type="text"
                          value={originLocationInput}
                          onChange={e => setOriginLocationInput(e.target.value)}
                          placeholder="e.g. Bet Kopargaon Ward 4"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Image Screenshot Upload */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-700">
                        Upload Screenshot (Optional):
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-100 file:text-slate-800 hover:file:bg-slate-200"
                      />
                      {screenshotInput && (
                        <div className="mt-2 relative">
                          <img src={screenshotInput} alt="Preview" className="h-20 rounded-xl border border-slate-300 object-cover" />
                          <button
                            type="button"
                            onClick={() => setScreenshotInput(null)}
                            className="absolute top-1 left-1 bg-slate-900 text-white rounded-full p-1"
                          >
                            <span className="material-symbols-outlined text-xs">close</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSubmitModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting || !claimTextInput.trim()}
                        className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md"
                      >
                        {isSubmitting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">send</span>
                            <span>Submit for Verification</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ====================================================
          SUB-MODAL 2: AUTHORITY AI PUBLISH FACT-CHECK FORM
          ==================================================== */}
      <AnimatePresence>
        {showPublishModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400 text-xl">auto_awesome</span>
                  <h4 className="font-extrabold text-sm">
                    Authority Fact-Check Publishing & AI Verdict Editor
                  </h4>
                </div>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              </div>

              <form onSubmit={handlePublishRumorSubmit} className="p-6 overflow-y-auto space-y-4 no-scrollbar">
                {isAiVerifying ? (
                  <div className="py-8 text-center space-y-3">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-bold text-slate-800">
                      Gemini 2.5 Flash evaluating claim against live telemetry...
                    </p>
                    <p className="text-[11px] font-mono text-slate-400">
                      Cross-referencing Gangapur discharge cusecs & Kopargaon bridge level.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Claim Title:</label>
                        <input
                          type="text"
                          required
                          value={formTitle}
                          onChange={e => setFormTitle(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Official Verdict:</label>
                        <select
                          value={formVerdict}
                          onChange={e => setFormVerdict(e.target.value as any)}
                          className={`w-full font-extrabold border rounded-xl px-3 py-2 text-xs ${
                            formVerdict === 'Fake'
                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                              : formVerdict === 'Misleading'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          <option value="Fake">❌ Fake / Debunked</option>
                          <option value="Misleading">⚠️ Misleading</option>
                          <option value="Verified">✅ Official Verified</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-extrabold text-slate-700">Circulating Rumor Text:</label>
                      <textarea
                        rows={2}
                        required
                        value={formText}
                        onChange={e => setFormText(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    {/* Official Clarifications (English & Marathi) */}
                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-900 flex items-center justify-between">
                          <span>मराठी स्पष्टीकरण (Official Marathi Clarification):</span>
                          <span className="text-[10px] font-mono text-amber-600">Reads aloud via TTS</span>
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={formClarificationMr}
                          onChange={e => setFormClarificationMr(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-900">
                          English Clarification:
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={formClarificationEn}
                          onChange={e => setFormClarificationEn(e.target.value)}
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Evidence / Telemetry Reference:</label>
                        <input
                          type="text"
                          value={formEvidenceData}
                          onChange={e => setFormEvidenceData(e.target.value)}
                          placeholder="e.g. WRD Bulletin #WRD-2026-BD8"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-extrabold text-slate-700">Verified By Authority:</label>
                        <input
                          type="text"
                          value={formVerifiedBy}
                          onChange={e => setFormVerifiedBy(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Checkbox: Push to Top Ticker Alert */}
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="broadcastTicker"
                          checked={formBroadcastTicker}
                          onChange={e => setFormBroadcastTicker(e.target.checked)}
                          className="w-4 h-4 text-rose-600 rounded focus:ring-rose-500"
                        />
                        <label htmlFor="broadcastTicker" className="text-xs font-bold text-rose-950 cursor-pointer">
                          Push urgent fact-check directly to top emergency ticker banner
                        </label>
                      </div>
                      <span className="text-[10px] bg-rose-600 text-white font-mono px-2 py-0.5 rounded-full font-bold uppercase">
                        Emergency Ticker
                      </span>
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowPublishModal(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPublishing}
                        className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-lg"
                      >
                        {isPublishing ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                            <span>Publishing...</span>
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm text-emerald-400">check_circle</span>
                            <span>Publish Fact-Check Bulletin</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
