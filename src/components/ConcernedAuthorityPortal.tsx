import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './Auth';
import { HazardType, RiskLevel, AuthorityActionItem, AuthorityContact, DisasterDispatchLog, Alert } from '../types';
import { HAZARD_PALETTES } from './HazardPalettes';
import { store } from '../store';
import { safeFetchJson } from '../utils/api';

interface DepartmentActionPreset {
  dept: string;
  en: string;
  mr: string;
  hazard: HazardType;
}

const DEPARTMENT_PRESETS: DepartmentActionPreset[] = [
  // WRD
  {
    dept: 'Water Resources & Irrigation',
    en: '24x7 hydro-gauging team deployed at Godavari Old Bridge; continuous discharge telemetry linked with Gangapur & Darna dam control.',
    mr: 'गोदावरी जुन्या पुलावर जलमापक पथक २४ तास तैनात; गंगापूर व दारणा धरणाशी थेट विसर्ग समन्वय सुरू.',
    hazard: 'flood'
  },
  {
    dept: 'Water Resources & Irrigation',
    en: 'Monitored canal gate discharge; closed low-lying sluice gates to prevent backwater ingress into residential sectors.',
    mr: 'कालवा विसर्ग नियंत्रित केला; सखल भागातील पाणी रोखण्यासाठी विमोचक दरवाजे बंद केले.',
    hazard: 'flood'
  },
  // Police
  {
    dept: 'Police & Public Safety',
    en: 'Barricaded low-level Godavari Old Bridge and deployed traffic diversions towards New Bypass Bridge.',
    mr: 'गोदावरी जुन्या पुलावर बॅरिकेडिंग करून वाहतूक नवीन बायपास पुलावरून वळवण्यात आली.',
    hazard: 'flood'
  },
  {
    dept: 'Police & Public Safety',
    en: 'Enforced riverbank perimeter cordon along Bet Kopargaon ghats; cleared unauthorized crowds and tourists.',
    mr: 'बेट कोपरगाव नदीकाठावर जमावबंदी व सुरक्षा घेरा तयार केला; पर्यटकांना सुरक्षित अंतरावर ठेवले.',
    hazard: 'flood'
  },
  // Fire & Rescue
  {
    dept: 'Fire Brigade & Water Rescue',
    en: 'Deployed 2 motorized swift-water rescue boats and 12 certified swimmers on active vigil along Bet Kopargaon riverbanks.',
    mr: 'बेट कोपरगाव गोदावरी नदीपात्रात २ आपत्कालीन बचाव बोटी व १२ जीवरक्षक तैनात करण्यात आले.',
    hazard: 'flood'
  },
  {
    dept: 'Fire Brigade & Water Rescue',
    en: 'Conducted emergency evacuation for 18 families stranded in low-lying riverside agricultural hutments.',
    mr: 'नदीकाठच्या सखल भागातील १८ पूरग्रस्त कुटुंबांना सुरक्षित मदत केंद्रात हलवले.',
    hazard: 'flood'
  },
  // Health
  {
    dept: 'Health & Medical Services',
    en: 'Stationed 3 Advanced 108 Life Support Ambulances and trauma first-aid desk at K.J. Somaiya Relief Camp.',
    mr: 'के. जे. सोमय्या मदत केंद्रात ३ रुग्णवाहिका व प्राथमिक प्रथमोपचार पथक २४ तास तैनात.',
    hazard: 'flood'
  },
  {
    dept: 'Health & Medical Services',
    en: 'Distributed 2,500 ORS sachets and chlorinated drinking water packets across rural wards.',
    mr: 'ग्रामीण भागात २,५०० ओआरएस पाकिटे व शुद्ध पिण्याच्या पाण्याच्या बाटल्यांचे वाटप केले.',
    hazard: 'heatwave'
  },
  // Administration / Tahsil
  {
    dept: 'Administration & Revenue',
    en: 'Activated K.J. Somaiya College Hall as Tier-1 evacuation center with hot meals and drinking water for 800 citizens.',
    mr: 'सोमय्या कॉलेज हॉलमध्ये ८०० नागरिकांसाठी अन्नधान्य व निवारा केंद्राची सोय सुरू केली.',
    hazard: 'flood'
  },
  // Power / MSEDCL
  {
    dept: 'MSEDCL & Power Grid',
    en: 'De-energized flood-prone 11kV substations along river banks in Bet sector to prevent electrical accidents.',
    mr: 'बेट भागातील पूरबाधित ११ केव्ही ट्रान्सफॉर्मर बंद करून संभाव्य वीज अपघात टाळले.',
    hazard: 'flood'
  },
  // Agriculture
  {
    dept: 'Agriculture & Krishi',
    en: 'Dispatched 4 panchnama survey teams to assess crop damage in Kolpewadi & Sanjivani belt.',
    mr: 'कोळपेवाडी व संजिवनी पट्ट्यात पीक नुकसान पंचनाम्यासाठी ४ पथके रवाना केली.',
    hazard: 'unseasonal'
  }
];

export const ConcernedAuthorityPortal: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'dispatches' | 'submit-action' | 'actions-feed' | 'citizen-reports'>('dispatches');
  const [dispatchLogs, setDispatchLogs] = useState<DisasterDispatchLog[]>([]);
  const [liveActions, setLiveActions] = useState<AuthorityActionItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Submit Action Form State
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>('');
  const [actionTitle, setActionTitle] = useState<string>('');
  const [actionTitleMr, setActionTitleMr] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<'action_taken' | 'in_field' | 'acknowledged'>('action_taken');
  const [actionHazard, setActionHazard] = useState<HazardType>('flood');
  const [actionZone, setActionZone] = useState<string>(user?.zone_id || 'zone-bet');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const officerName = user?.name || 'Concerned Officer';
  const officerDept = user?.department || 'Department Authority';
  const officerDesignation = user?.designation || 'Concerned Disaster Authority';
  const officerPhone = user?.phone || '+91-98000-00000';
  const officerZone = user?.zone_id || 'all-taluka';
  const officerHazard = user?.hazard_responsibility || 'all';

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const loadPortalData = async () => {
    try {
      const [logsRes, actionsRes, alertsRes] = await Promise.all([
        safeFetchJson('/api/v1/authorities/dispatch-logs'),
        safeFetchJson('/api/v1/authorities/live-actions'),
        store.getAlerts()
      ]);

      if (logsRes.ok && logsRes.data?.logs) {
        setDispatchLogs(logsRes.data.logs);
      }
      if (actionsRes.ok && actionsRes.data?.actions) {
        setLiveActions(actionsRes.data.actions);
      }
      if (alertsRes) {
        setAlerts(alertsRes);
      }
    } catch (e) {
      console.error('Error loading concerned authority portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
    const interval = setInterval(loadPortalData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Filter presets for this officer's department
  const officerPresets = DEPARTMENT_PRESETS.filter(p => 
    p.dept.toLowerCase().includes(officerDept.toLowerCase()) || 
    officerDept.toLowerCase().includes(p.dept.toLowerCase())
  );

  const applyPreset = (preset: DepartmentActionPreset) => {
    setActionTitle(preset.en);
    setActionTitleMr(preset.mr);
    setActionHazard(preset.hazard);
    showToast(`Loaded standard ${preset.dept} action template`);
  };

  const handleAcknowledgeDispatch = async (dispatch: DisasterDispatchLog) => {
    try {
      const token = await store.getToken();
      const res = await safeFetchJson('/api/v1/authorities/acknowledge-dispatch', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({
          dispatch_id: dispatch.id,
          note: `Officer ${officerName} (${officerDept}) acknowledged command receipt. Unit in field.`
        })
      });

      if (!res.ok) throw new Error(res.error || 'Failed to acknowledge dispatch');

      showToast(`Acknowledged Admin Command. Status synced with SDM Command HQ.`);
      loadPortalData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    }
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) {
      showToast('Please enter an action description.');
      return;
    }

    setSubmitting(true);
    try {
      const token = await store.getToken();
      const res = await safeFetchJson('/api/v1/authorities/submit-action', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({
          dispatch_id: selectedDispatchId || undefined,
          action_title: actionTitle.trim(),
          action_title_mr: actionTitleMr.trim() || actionTitle.trim(),
          status: actionStatus,
          hazard: actionHazard,
          zone_id: actionZone,
          authority_id: user?.authority_id || user?.id,
          authority_name: officerName,
          designation: officerDesignation,
          department: officerDept,
          phone: officerPhone
        })
      });

      if (!res.ok) throw new Error(res.error || 'Failed to log field action');

      showToast('Action recorded! Broadcasted live to Citizen Feed and SDM Command.');
      setActionTitle('');
      setActionTitleMr('');
      setSelectedDispatchId('');
      setActiveTab('actions-feed');
      loadPortalData();
    } catch (err: any) {
      showToast('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Find relevant dispatches that target this officer or all departments
  const relevantDispatches = dispatchLogs.filter(d => {
    if (!d.target_authorities || d.target_authorities.length === 0) return true;
    return d.target_authorities.some(t => 
      t.authority_id === user?.authority_id ||
      t.department?.toLowerCase() === officerDept?.toLowerCase() ||
      t.name?.toLowerCase() === officerName?.toLowerCase()
    ) || d.zone_id === officerZone || officerZone === 'all-taluka';
  });

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Officer Header HUD */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <span className="material-symbols-outlined text-2xl">shield_person</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-white tracking-tight leading-none">
                  {officerName}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Concerned Authority
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  Sub-Admin / Operational Level
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sky-400">{officerDept}</span>
                <span>•</span>
                <span>{officerDesignation}</span>
                <span>•</span>
                <span>Zone: <strong className="text-slate-200">{officerZone}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <a 
              href="tel:1077"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:bg-rose-600/50 text-xs font-semibold transition-colors"
              title="Direct Hotline to SDM Incident Commander"
            >
              <span className="material-symbols-outlined text-sm text-rose-400">call</span>
              <span>SDM Hotline (1077)</span>
            </a>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-sm">logout</span>
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Portal Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex border-t border-slate-800/80 gap-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('dispatches')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'dispatches'
                ? 'border-sky-500 text-sky-400 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">emergency_share</span>
            <span>Admin Orders & Dispatches</span>
            {relevantDispatches.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-sky-500 text-slate-950">
                {relevantDispatches.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('submit-action')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'submit-action'
                ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">bolt</span>
            <span>Submit Live Field Action</span>
          </button>

          <button
            onClick={() => setActiveTab('actions-feed')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'actions-feed'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">stream</span>
            <span>Inter-Agency Live Action Stream</span>
            {liveActions.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-indigo-500 text-white">
                {liveActions.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Notice Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 shadow-sm">
          <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">verified</span>
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-amber-950">
              Departmental Operational Console — Sub-Divisional Disaster Cell
            </p>
            <p className="mt-0.5 text-amber-800">
              You are logged in as a <strong>Concerned Disaster Authority</strong>. Any action logged here directly updates the live emergency feed for citizens and confirms status on the SDM Admin Incident Command Dashboard in real time.
            </p>
          </div>
        </div>

        {/* VIEW 1: ADMIN ORDERS & DISPATCHES */}
        {activeTab === 'dispatches' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Emergency Mobilization Orders from Admin Command HQ
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct orders dispatched by SDM / Incident Commander requiring your department's action.
                </p>
              </div>
              <button
                onClick={loadPortalData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Refresh Orders</span>
              </button>
            </div>

            {relevantDispatches.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-slate-400">task_alt</span>
                <p className="text-sm font-bold text-slate-700 mt-2">No Active Emergency Dispatches</p>
                <p className="text-xs text-slate-500 mt-1">All departments are in normal readiness mode. Standby for SDM triggers.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {relevantDispatches.map(dispatch => {
                  const palette = HAZARD_PALETTES[dispatch.disaster_hazard as HazardType] || HAZARD_PALETTES.flood;
                  const myTarget = dispatch.target_authorities?.find(t => 
                    t.authority_id === user?.authority_id ||
                    t.department?.toLowerCase() === officerDept?.toLowerCase() ||
                    t.name?.toLowerCase() === officerName?.toLowerCase()
                  );
                  const isAcknowledged = myTarget?.status === 'acknowledged' || myTarget?.status === 'action_taken';
                  const isActionTaken = myTarget?.status === 'action_taken';

                  return (
                    <div 
                      key={dispatch.id}
                      className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span 
                              className="px-2.5 py-1 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                              style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                            >
                              <span className="material-symbols-outlined text-sm">{palette.symbol}</span>
                              {dispatch.disaster_hazard}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              dispatch.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {dispatch.severity}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(dispatch.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 leading-snug">
                          {dispatch.trigger_event}
                        </h3>

                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            SDM Direct Instruction:
                          </div>
                          <p className="font-medium text-slate-800">{dispatch.message_sent}</p>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                          <span>Jurisdiction: <strong>{dispatch.zone_id}</strong></span>
                          <span>Issued by: <strong>{dispatch.initiated_by}</strong></span>
                        </div>

                        {/* Status for this department */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-xs text-slate-500">My Unit Status:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            isActionTaken 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : isAcknowledged 
                              ? 'bg-sky-100 text-sky-800' 
                              : 'bg-rose-100 text-rose-800 animate-pulse'
                          }`}>
                            {isActionTaken ? '✓ Action Completed' : isAcknowledged ? '● Acknowledged (In Field)' : '⚠ Action Required'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Action Buttons */}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                        {!isAcknowledged && (
                          <button
                            onClick={() => handleAcknowledgeDispatch(dispatch)}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span className="material-symbols-outlined text-base">done</span>
                            <span>1-Tap Acknowledge</span>
                          </button>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDispatchId(dispatch.id);
                            setActionHazard(dispatch.disaster_hazard as HazardType);
                            setActionZone(dispatch.zone_id);
                            setActiveTab('submit-action');
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-base text-emerald-400">bolt</span>
                          <span>Log Field Action &rarr;</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: SUBMIT LIVE FIELD ACTION */}
        {activeTab === 'submit-action' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Section */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Record Live Departmental Action
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Broadcasting from: <strong>{officerName}</strong> ({officerDept})
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Live Public Link
                </span>
              </div>

              <form onSubmit={handleSubmitAction} className="mt-5 flex flex-col gap-4">
                {/* Tied Dispatch Selector */}
                {relevantDispatches.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Connect with Admin Dispatch (Optional)
                    </label>
                    <select
                      value={selectedDispatchId}
                      onChange={e => setSelectedDispatchId(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:bg-white outline-none font-medium"
                    >
                      <option value="">-- Standalone Departmental Action --</option>
                      {relevantDispatches.map(d => (
                        <option key={d.id} value={d.id}>
                          [{d.disaster_hazard.toUpperCase()}] {d.trigger_event.substring(0, 60)}...
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Hazard & Zone Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Hazard Type</label>
                    <select
                      value={actionHazard}
                      onChange={e => setActionHazard(e.target.value as HazardType)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:bg-white outline-none font-medium"
                    >
                      <option value="flood">Flood (गोदावरी पूर)</option>
                      <option value="drought">Drought (दुष्काळ)</option>
                      <option value="heatwave">Heatwave (उष्णतेची लाट)</option>
                      <option value="unseasonal">Unseasonal Rain / Hailstorm (अवेळी पाऊस / गारपीट)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Sector / Zone</label>
                    <select
                      value={actionZone}
                      onChange={e => setActionZone(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 text-xs focus:border-slate-900 focus:bg-white outline-none font-medium"
                    >
                      <option value="all-taluka">Entire Taluka (सर्व कोपरगाव तालुका)</option>
                      <option value="zone-bet">Bet Kopargaon (Godavari Basin)</option>
                      <option value="zone-market">Main Town & Market</option>
                      <option value="zone-rural-north">North Rural (Sanjivani / Kolpewadi)</option>
                      <option value="zone-rural-south">South Drylands (Pohegaon)</option>
                    </select>
                  </div>
                </div>

                {/* Action Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Action Status</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setActionStatus('action_taken')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        actionStatus === 'action_taken'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ✓ Action Completed
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionStatus('in_field')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        actionStatus === 'in_field'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ⚡ In Field (Active)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActionStatus('acknowledged')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                        actionStatus === 'acknowledged'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      ● Acknowledged
                    </button>
                  </div>
                </div>

                {/* Action Title EN */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Action Description (English)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Barricaded Godavari Old Bridge and stationed 4 SDRF rescue swimmers at Bet Kopargaon ghats."
                    value={actionTitle}
                    onChange={e => setActionTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs focus:border-slate-900 focus:bg-white outline-none leading-relaxed"
                  />
                </div>

                {/* Action Title MR */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    कृतीचे वर्णन (मराठी) - Live Citizen Feed
                  </label>
                  <textarea
                    rows={2}
                    placeholder="उदा. गोदावरी जुन्या पुलावर बॅरिकेडिंग केले असून ४ जीवरक्षक तैनात करण्यात आले आहेत."
                    value={actionTitleMr}
                    onChange={e => setActionTitleMr(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs focus:border-slate-900 focus:bg-white outline-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950 font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                >
                  {submitting ? (
                    'Broadcasting Field Action...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base text-emerald-400">send</span>
                      <span>Broadcast Action to Citizens & SDM Command HQ</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Department Fast Action Presets */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                  <span className="material-symbols-outlined text-sky-600 text-lg">electric_bolt</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    {officerDept} Presets
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  1-Tap to autofill standard departmental response actions:
                </p>

                <div className="flex flex-col gap-2.5">
                  {(officerPresets.length > 0 ? officerPresets : DEPARTMENT_PRESETS.slice(0, 4)).map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="text-left p-3 rounded-xl bg-slate-50 hover:bg-sky-50 border border-slate-200 hover:border-sky-300 transition-all text-xs text-slate-800 group"
                    >
                      <p className="font-semibold group-hover:text-sky-900 line-clamp-2">
                        {preset.en}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                        {preset.mr}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Direct Hotline Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 text-amber-400">
                  <span className="material-symbols-outlined text-lg">emergency</span>
                  <h3 className="text-xs font-bold uppercase tracking-wider">
                    Command Coordination
                  </h3>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                  Need additional NDRF battalions, motorized boats, or district flood funds? Call SDM Incident Command directly:
                </p>
                <div className="flex flex-col gap-2">
                  <a
                    href="tel:1077"
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold text-center transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">call</span>
                    <span>Toll-Free Control Room: 1077</span>
                  </a>
                  <a
                    href="tel:+919422010771"
                    className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold text-center transition-colors"
                  >
                    SDM Dr. Rajesh Shinde (IAS): 9422010771
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: INTER-AGENCY LIVE ACTION STREAM */}
        {activeTab === 'actions-feed' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Live Field Response Feed (All Departments)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized actions taken by Police, WRD, Fire, Health, Tahsil, Agriculture, and MSEDCL.
                </p>
              </div>
              <button
                onClick={loadPortalData}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                <span>Refresh Live Feed</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider">
                <span>Recent Authority Field Actions ({liveActions.length})</span>
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Streaming Live to Citizens
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {liveActions.map((act) => {
                  const palette = HAZARD_PALETTES[act.hazard as HazardType] || HAZARD_PALETTES.flood;
                  const isMine = act.authority_id === user?.authority_id || act.department === officerDept;

                  return (
                    <div key={act.id} className={`p-4 sm:p-5 transition-colors ${isMine ? 'bg-sky-50/40' : 'hover:bg-slate-50/60'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                            {act.department}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {act.authority_name} ({act.designation})
                          </span>
                          {isMine && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-900">
                              My Unit
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {new Date(act.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <p className="text-xs font-semibold text-slate-900 leading-relaxed">
                        {act.action_title}
                      </p>
                      {act.action_title_mr && (
                        <p className="text-xs text-slate-600 mt-1 italic leading-relaxed">
                          {act.action_title_mr}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
                        <div className="flex items-center gap-3">
                          <span>Zone: <strong>{act.zone_id}</strong></span>
                          <span>•</span>
                          <span className="capitalize">Hazard: <strong>{act.hazard}</strong></span>
                        </div>

                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          act.status === 'action_taken' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {act.status === 'action_taken' ? '✓ Action Taken' : '⚡ In Field'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white text-xs font-semibold shadow-2xl border border-slate-800 flex items-center gap-2 max-w-md w-full mx-4"
          >
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            <span className="flex-1">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
