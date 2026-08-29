import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthorityContact, AuthorityActionItem } from '../types';
import { store } from '../store';

interface ConcernedAuthoritiesDirectoryProps {
  lang: 'en' | 'mr';
  onShowToast?: (msg: string) => void;
}

export const ConcernedAuthoritiesDirectory: React.FC<ConcernedAuthoritiesDirectoryProps> = ({
  lang,
  onShowToast
}) => {
  const [authorities, setAuthorities] = useState<AuthorityContact[]>([]);
  const [liveActions, setLiveActions] = useState<AuthorityActionItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [isCopied, setIsCopied] = useState<string | null>(null);

  // Fetch authorities & live actions, with continuous real-time sync polling
  const syncData = async () => {
    try {
      const [authList, actionList] = await Promise.all([
        store.getAuthorities().catch(() => []),
        store.getLiveAuthorityActions().catch(() => [])
      ]);
      if (authList && authList.length > 0) {
        setAuthorities(authList);
      }
      if (actionList && actionList.length > 0) {
        setLiveActions(actionList);
      }
      setLastSyncTime(new Date());
    } catch (e) {
      console.warn('Authority sync error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncData();
    const interval = setInterval(syncData, 4000); // Poll every 4 seconds for live sync
    return () => clearInterval(interval);
  }, []);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setIsCopied(text);
    if (onShowToast) onShowToast(`${label} copied: ${text}`);
    setTimeout(() => setIsCopied(null), 2500);
  };

  // Department color badge styling
  const getDeptColorBadge = (dept: string) => {
    switch (dept) {
      case 'Administration & Revenue':
        return 'bg-purple-50 text-purple-800 border-purple-200';
      case 'Water Resources & Irrigation':
        return 'bg-sky-50 text-sky-800 border-sky-200';
      case 'Police & Public Safety':
        return 'bg-blue-50 text-blue-800 border-blue-200';
      case 'Health & Medical Services':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Fire Brigade & Water Rescue':
        return 'bg-rose-50 text-rose-800 border-rose-200';
      case 'Agriculture & Krishi':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'MSEDCL & Power Grid':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const getDeptIcon = (dept: string) => {
    switch (dept) {
      case 'Administration & Revenue':
        return 'account_balance';
      case 'Water Resources & Irrigation':
        return 'water';
      case 'Police & Public Safety':
        return 'local_police';
      case 'Health & Medical Services':
        return 'medical_services';
      case 'Fire Brigade & Water Rescue':
        return 'fire_truck';
      case 'Agriculture & Krishi':
        return 'agriculture';
      case 'MSEDCL & Power Grid':
        return 'bolt';
      default:
        return 'shield_person';
    }
  };

  const cleanPhoneForWa = (phone: string) => {
    return phone.replace(/[^0-9]/g, '');
  };

  const filteredAuthorities = authorities.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.emergency_phone && a.emergency_phone.includes(searchQuery));
    const matchesDept = selectedDept === 'all' || a.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departmentList = [
    { id: 'all', labelEn: 'All Departments', labelMr: 'सर्व विभाग' },
    { id: 'Administration & Revenue', labelEn: 'Administration', labelMr: 'प्रशासन व महसूल' },
    { id: 'Police & Public Safety', labelEn: 'Police & Safety', labelMr: 'पोलीस व सुरक्षा' },
    { id: 'Fire Brigade & Water Rescue', labelEn: 'Fire & Rescue', labelMr: 'अग्निशामक दल' },
    { id: 'Water Resources & Irrigation', labelEn: 'Water (WRD)', labelMr: 'जलसंपदा व पाटबंधारे' },
    { id: 'Health & Medical Services', labelEn: 'Health & Medical', labelMr: 'आरोग्य व रुग्णालय' },
    { id: 'MSEDCL & Power Grid', labelEn: 'Power Grid', labelMr: 'महावितरण वीज' },
    { id: 'Agriculture & Krishi', labelEn: 'Agriculture', labelMr: 'कृषी विभाग' }
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white p-5 sm:p-6 rounded-3xl shadow-md border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
              <span className="material-symbols-outlined text-2xl">support_agent</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  {lang === 'mr' ? 'संबंधित आपत्ती प्राधिकारी थेट संपर्क' : 'Concerned Disaster Authorities Directory'}
                </h2>
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                {lang === 'mr'
                  ? 'कोपरगाव तालुका आपत्ती निवारण नियंत्रण कक्षाचे नोडल अधिकारी. त्वरित संपर्कासाठी नंबरवर टॅप करा.'
                  : 'Nodal Disaster & Response Officers of Kopargaon Taluka. Tap any number to call or WhatsApp directly.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700 text-xs font-mono text-emerald-400">
            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            <span>Live Sync: {authorities.length} Officers</span>
          </div>
        </div>
      </div>

      {/* Live Authority On-Ground Action Stream */}
      {liveActions.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-3xl p-4 sm:p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-700 text-xl animate-pulse">
                notification_important
              </span>
              <h3 className="font-bold text-slate-900 text-sm tracking-tight flex items-center gap-2">
                <span>{lang === 'mr' ? 'प्राधिकरणांची प्रत्यक्ष मदत व बचाव कारवाई (थेट अपडेट)' : 'Live Authority Response & Action Stream'}</span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold">
                  LIVE FIELD ACTIONS
                </span>
              </h3>
            </div>
            <span className="text-[11px] text-amber-900 font-medium">
              {liveActions.length} Actions Active
            </span>
          </div>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
            {liveActions.slice(0, 5).map((act) => (
              <div
                key={act.id}
                className="p-3 rounded-2xl bg-white border border-amber-100/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-blue-600 text-base mt-0.5 shrink-0">
                    verified
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-bold text-slate-900">{act.authority_name}</span>
                      <span className="text-slate-500 font-normal">({act.designation})</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {act.department}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1 font-medium leading-relaxed">
                      {lang === 'mr' && act.action_title_mr ? act.action_title_mr : act.action_title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <a
                    href={`tel:${act.phone}`}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs">call</span>
                    <span>{act.phone}</span>
                  </a>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Search & Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'mr'
                  ? 'अधिकारी नाव, पद, विभाग किंवा फोन नंबर शोधा...'
                  : 'Search by officer name, designation, department or phone...'
              }
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 shrink-0 font-medium px-1 flex items-center justify-between sm:justify-start gap-2">
            <span>
              {lang === 'mr'
                ? `एकूण उपलब्ध अधिकारी: ${filteredAuthorities.length}`
                : `Showing ${filteredAuthorities.length} authorities`}
            </span>
          </div>
        </div>

        {/* Department Quick Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {departmentList.map((dept) => {
            const isSelected = selectedDept === dept.id;
            return (
              <button
                key={dept.id}
                onClick={() => setSelectedDept(dept.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {dept.id !== 'all' && (
                  <span className="material-symbols-outlined text-xs">
                    {getDeptIcon(dept.id)}
                  </span>
                )}
                <span>{lang === 'mr' ? dept.labelMr : dept.labelEn}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Authorities Directory Grid */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
          <span className="material-symbols-outlined text-3xl text-blue-600 animate-spin">
            progress_activity
          </span>
          <p className="text-xs text-slate-500 font-medium">
            {lang === 'mr' ? 'प्राधिकारी माहिती लोड होत आहे...' : 'Loading nodal authority directory...'}
          </p>
        </div>
      ) : filteredAuthorities.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
          <span className="material-symbols-outlined text-4xl text-slate-300">
            contact_phone_off
          </span>
          <h4 className="font-bold text-slate-800 text-sm">
            {lang === 'mr' ? 'कोणतेही प्राधिकारी आढळले नाहीत' : 'No authorities found'}
          </h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {lang === 'mr'
              ? 'कृपया आपले शोध निकष बदला किंवा सर्व विभाग निवडा.'
              : 'Try clearing your search term or selecting a different department filter.'}
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedDept('all');
            }}
            className="mt-2 text-xs font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Reset filters</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAuthorities.map((auth) => {
            const cleanWaNumber = cleanPhoneForWa(auth.phone);
            const isCopiedThis = isCopied === auth.phone;

            return (
              <div
                key={auth.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
              >
                {/* Card Top: Department & Status Badges */}
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getDeptColorBadge(
                      auth.department
                    )}`}
                  >
                    <span className="material-symbols-outlined text-xs">
                      {getDeptIcon(auth.department)}
                    </span>
                    <span>{auth.department}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>ON DUTY</span>
                    </span>
                  </div>
                </div>

                {/* Officer Details */}
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>{auth.name}</span>
                  </h3>
                  <div className="text-xs text-blue-700 font-semibold mt-0.5">
                    {auth.designation}
                  </div>
                  
                  {/* Jurisdiction / Zone & Hazard Info */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                      <span>
                        {auth.zone_id === 'all-taluka' ? 'Entire Taluka' : auth.zone_id.replace('zone-', '').toUpperCase()}
                      </span>
                    </span>

                    <span className="inline-flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                      <span className="material-symbols-outlined text-xs text-amber-500">warning</span>
                      <span>Hazard: {auth.hazard_responsibility.toUpperCase()}</span>
                    </span>
                  </div>
                </div>

                {/* Action Buttons: Direct 1-Tap Call & Direct WhatsApp */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Primary Direct Call Button */}
                    <a
                      href={`tel:${auth.phone}`}
                      className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all text-center"
                      title={`Call ${auth.name} directly`}
                    >
                      <span className="material-symbols-outlined text-base">call</span>
                      <span>Call Now</span>
                    </a>

                    {/* Direct WhatsApp Chat Button */}
                    <a
                      href={`https://wa.me/${cleanWaNumber}?text=URGENT%20DISASTER%20INQUIRY%20-%20Kopargaon%20Control%20Room`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all text-center"
                      title={`WhatsApp ${auth.name}`}
                    >
                      <span className="material-symbols-outlined text-base text-emerald-600">chat</span>
                      <span>WhatsApp</span>
                    </a>
                  </div>

                  {/* Phone & Emergency hotline text bar with direct tap & copy */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Direct Line:</span>
                      <a
                        href={`tel:${auth.phone}`}
                        className="font-mono font-bold text-slate-900 hover:text-blue-600 hover:underline"
                      >
                        {auth.phone}
                      </a>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(auth.phone, auth.name)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                        title="Copy phone number"
                      >
                        <span className="material-symbols-outlined text-sm">
                          {isCopiedThis ? 'check' : 'content_copy'}
                        </span>
                      </button>

                      {auth.email && (
                        <a
                          href={`mailto:${auth.email}`}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          title={`Email ${auth.email}`}
                        >
                          <span className="material-symbols-outlined text-sm">mail</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Secondary 24x7 Hotline if available */}
                  {auth.emergency_phone && (
                    <div className="flex items-center justify-between text-[11px] px-2 text-rose-700">
                      <span className="font-semibold flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">fmd_bad</span>
                        24x7 Hotline:
                      </span>
                      <a
                        href={`tel:${auth.emergency_phone}`}
                        className="font-mono font-bold hover:underline"
                      >
                        {auth.emergency_phone}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
