import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from './Auth';
import { HazardType, RiskLevel, AuthorityActionItem, AuthorityContact, DisasterDispatchLog, Alert } from '../types';
import { DOMAIN_ACTION_TEMPLATES, DomainActionTemplate, DomainActionResource } from '../data/domainActions';
import { HAZARD_PALETTES } from './HazardPalettes';
import { store } from '../store';
import { safeFetchJson } from '../utils/api';

export const ConcernedAuthorityPortal: React.FC = () => {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<'incidents' | 'domain-actions' | 'submit-action' | 'dispatches' | 'actions-feed'>('incidents');
  const [dispatchLogs, setDispatchLogs] = useState<DisasterDispatchLog[]>([]);
  const [liveActions, setLiveActions] = useState<AuthorityActionItem[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [replyingIncidentId, setReplyingIncidentId] = useState<string | null>(null);
  const [replyNote, setReplyNote] = useState<string>('');
  const [replying, setReplying] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [loading, setLoading] = useState<boolean>(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Quick Deploy Action Modal State
  const [selectedTemplate, setSelectedTemplate] = useState<DomainActionTemplate | null>(null);
  const [modalResources, setModalResources] = useState<DomainActionResource>({});
  const [modalZone, setModalZone] = useState<string>('zone-bet');
  const [modalStatus, setModalStatus] = useState<'action_taken' | 'in_field' | 'acknowledged'>('action_taken');
  const [modalCustomNotes, setModalCustomNotes] = useState<string>('');
  const [deploying, setDeploying] = useState<boolean>(false);

  // Custom Submit Action Form State
  const [selectedDispatchId, setSelectedDispatchId] = useState<string>('');
  const [actionTitle, setActionTitle] = useState<string>('');
  const [actionTitleMr, setActionTitleMr] = useState<string>('');
  const [actionStatus, setActionStatus] = useState<'action_taken' | 'in_field' | 'acknowledged'>('action_taken');
  const [actionHazard, setActionHazard] = useState<HazardType>('flood');
  const [actionZone, setActionZone] = useState<string>(user?.zone_id || 'zone-bet');
  const [actionCategory, setActionCategory] = useState<string>('rescue');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Filter for Domain Actions tab
  const [domainFilter, setDomainFilter] = useState<string>('my-dept');
  const [hazardFilter, setHazardFilter] = useState<string>('all');

  const officerName = user?.name || 'Concerned Officer';
  const officerDept = user?.department || 'Water Resources & Irrigation';
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
      const [logsRes, actionsRes, alertsRes, incRes] = await Promise.all([
        safeFetchJson('/api/v1/authorities/dispatch-logs'),
        safeFetchJson('/api/v1/authorities/live-actions'),
        store.getAlerts(),
        safeFetchJson('/api/v1/admin/incidents')
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
      if (incRes.ok && incRes.data?.incidents) {
        setIncidents(incRes.data.incidents);
      }
    } catch (e) {
      console.error('Error loading concerned authority portal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
    const interval = setInterval(() => {
      setNow(Date.now());
      loadPortalData();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleIncidentReply = async (incidentId: string) => {
    if (!replyNote.trim()) {
      showToast('Please enter an action note or field update before sending.');
      return;
    }
    setReplying(true);
    try {
      const token = await store.getToken();
      const res = await safeFetchJson(`/api/v1/incidents/${incidentId}/reply`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({
          action_note: replyNote,
          status_action: 'verify'
        })
      });

      if (res.ok) {
        showToast('✅ Acknowledged & Replied! 2-Minute SLA satisfied. Control room updated.');
        setReplyingIncidentId(null);
        setReplyNote('');
        loadPortalData();
      } else {
        showToast(res.error || 'Failed to submit reply');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to submit reply');
    } finally {
      setReplying(false);
    }
  };

  // Filter domain templates based on tab selection
  const filteredTemplates = DOMAIN_ACTION_TEMPLATES.filter(tmpl => {
    if (domainFilter === 'my-dept') {
      const matchDept = tmpl.department.toLowerCase().includes(officerDept.toLowerCase()) ||
                        officerDept.toLowerCase().includes(tmpl.department.toLowerCase());
      if (!matchDept) return false;
    } else if (domainFilter !== 'all') {
      if (tmpl.department !== domainFilter) return false;
    }

    if (hazardFilter !== 'all' && tmpl.hazard !== 'all' && tmpl.hazard !== hazardFilter) {
      return false;
    }

    return true;
  });

  const handleOpenQuickDeploy = (template: DomainActionTemplate) => {
    setSelectedTemplate(template);
    setModalResources({ ...template.default_resources });
    setModalZone(template.recommended_zone || officerZone || 'zone-bet');
    setModalStatus('action_taken');
    setModalCustomNotes('');
  };

  const handleExecuteQuickDeploy = async () => {
    if (!selectedTemplate) return;
    setDeploying(true);

    try {
      const token = await store.getToken();
      
      // Construct detailed description with resource metrics
      let resourceSummary = '';
      const r = modalResources;
      const rParts: string[] = [];
      if (r.boats) rParts.push(`${r.boats} Motorized Boats`);
      if (r.volunteers) rParts.push(`${r.volunteers} Volunteers`);
      if (r.divers) rParts.push(`${r.divers} Divers`);
      if (r.teams) rParts.push(`${r.teams} Special Teams`);
      if (r.ambulances) rParts.push(`${r.ambulances} Ambulances`);
      if (r.pumps) rParts.push(`${r.pumps} Dewatering Pumps`);
      if (r.tankers) rParts.push(`${r.tankers} Water Tankers`);
      if (r.food_packets) rParts.push(`${r.food_packets} Food Packets`);
      if (r.linemen) rParts.push(`${r.linemen} Linemen`);
      if (r.sandbags) rParts.push(`${r.sandbags} Sandbags`);
      if (r.tarpaulins) rParts.push(`${r.tarpaulins} Tarpaulins`);

      if (rParts.length > 0) {
        resourceSummary = ` [Deployed: ${rParts.join(', ')}]`;
      }

      const finalTitleEn = `${selectedTemplate.title_en}${resourceSummary}${modalCustomNotes ? ` - Note: ${modalCustomNotes}` : ''}`;
      const finalTitleMr = `${selectedTemplate.title_mr}${modalCustomNotes ? ` - टिप: ${modalCustomNotes}` : ''}`;

      const res = await safeFetchJson('/api/v1/authorities/submit-action', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({
          dispatch_id: `action-quick-${Date.now()}`,
          action_title: finalTitleEn,
          action_title_mr: finalTitleMr,
          status: modalStatus,
          hazard: selectedTemplate.hazard === 'all' ? 'flood' : selectedTemplate.hazard,
          zone_id: modalZone,
          category: selectedTemplate.category,
          resources: modalResources,
          authority_id: user?.authority_id || user?.id,
          authority_name: officerName,
          designation: officerDesignation,
          department: selectedTemplate.department || officerDept,
          phone: officerPhone
        })
      });

      if (!res.ok) throw new Error(res.error || 'Failed to deploy domain action');

      showToast(`Action Deployed: ${selectedTemplate.title_en.substring(0, 45)}...`);
      setSelectedTemplate(null);
      setActiveTab('actions-feed');
      loadPortalData();
    } catch (err: any) {
      showToast('Error deploying action: ' + err.message);
    } finally {
      setDeploying(false);
    }
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

  const handleSubmitCustomAction = async (e: React.FormEvent) => {
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
          category: actionCategory,
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
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900 text-white border border-slate-700 shadow-2xl text-xs font-bold flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-emerald-400 text-base">check_circle</span>
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

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
            onClick={() => setActiveTab('incidents')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'incidents'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base text-amber-400 animate-pulse">timer</span>
            <span>Assigned Incidents (2-Min SLA)</span>
            {incidents.filter(i => !i.authority_replied).length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500 text-slate-950">
                {incidents.filter(i => !i.authority_replied).length} Active
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('domain-actions')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'domain-actions'
                ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="material-symbols-outlined text-base">task_alt</span>
            <span>Domain Actions Hub (1-Click Deploy)</span>
          </button>

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
            <span>Custom Field Action Log</span>
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
            <span>Live Inter-Agency Action Stream</span>
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
              Logged in as: <strong>{officerName}</strong> ({officerDept}). Select your departmental actions below (e.g. deploying boats, volunteers, ambulances, tankers, or de-energizing lines) to broadcast directly to citizens and the SDM incident command room.
            </p>
          </div>
        </div>

        {/* TAB 0: ASSIGNED CITIZEN INCIDENTS (2-MIN SLA) */}
        {activeTab === 'incidents' && (
          <div className="flex flex-col gap-6">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-2xl">emergency_home</span>
                  <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Assigned Citizen Reports & 2-Minute SLA Tracker
                  </h2>
                </div>
                <p className="text-xs text-slate-600 font-medium mt-1">
                  Reports are dispatched immediately to concerned departmental officers. You have <strong>2 minutes</strong> to reply. If unreplied, messages automatically escalate to <strong>Higher Authority (Admin SDM at Pargaon HQ)</strong>.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto">
                <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-mono font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-amber-700 animate-spin">timer</span>
                  <span>SLA Limit: 120 Seconds (2 Mins)</span>
                </span>
                <button
                  onClick={loadPortalData}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono font-bold text-slate-700 border border-slate-300 flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {incidents.length === 0 ? (
              <div className="p-10 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
                <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
                <h3 className="text-sm font-extrabold text-slate-800">No Citizen Reports Pending</h3>
                <p className="text-xs text-slate-500 mt-1">All dispatched incident reports have been answered within SLA.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {incidents.map(inc => {
                  const palette = HAZARD_PALETTES[inc.hazard] || HAZARD_PALETTES.flood;
                  const elapsedSec = Math.floor((now - new Date(inc.created_at).getTime()) / 1000);
                  const remainingSec = Math.max(0, (inc.sla_seconds || 120) - elapsedSec);
                  const isSlaBreached = !inc.authority_replied && (elapsedSec >= (inc.sla_seconds || 120) || inc.status === 'ESCALATED_TO_SDM_PARGAON');

                  const minsLeft = Math.floor(remainingSec / 60);
                  const secsLeft = remainingSec % 60;

                  return (
                    <div
                      key={inc.id}
                      className={`rounded-3xl border p-5 flex flex-col justify-between transition-all bg-white shadow-sm ${
                        isSlaBreached
                          ? 'border-rose-300 ring-2 ring-rose-200 bg-rose-50/40'
                          : inc.authority_replied
                          ? 'border-emerald-200 bg-emerald-50/30'
                          : 'border-amber-200 ring-1 ring-amber-100'
                      }`}
                    >
                      <div>
                        {/* Header Status Bar */}
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <span
                            className="px-2.5 py-1 rounded-xl text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-xs"
                            style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                          >
                            <span className="material-symbols-outlined text-sm">{palette.symbol}</span>
                            {inc.hazard}
                          </span>

                          {inc.authority_replied ? (
                            <span className="px-3 py-1 rounded-xl bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px] font-mono font-extrabold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-emerald-700">task_alt</span>
                              <span>REPLIED (SLA MET)</span>
                            </span>
                          ) : isSlaBreached ? (
                            <span className="px-3 py-1 rounded-xl bg-rose-600 text-white text-[10px] font-mono font-extrabold uppercase flex items-center gap-1 animate-pulse shadow-sm">
                              <span className="material-symbols-outlined text-xs">local_police</span>
                              <span>ESCALATED TO SDM PARGAON HQ</span>
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-xl bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-mono font-extrabold flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs text-amber-700 animate-spin">timer</span>
                              <span>SLA: {minsLeft}m {secsLeft < 10 ? `0${secsLeft}` : secsLeft}s</span>
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                          "{inc.description}"
                        </h3>

                        {inc.photo_url && (
                          <div className="mt-3 mb-3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-36 flex items-center justify-center">
                            <img src={inc.photo_url} alt="Incident" className="object-cover w-full h-full" />
                          </div>
                        )}

                        {/* Assigned Routing Info */}
                        <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Concerned Authority:</span>
                            <span className="font-bold text-slate-900">
                              {inc.assigned_authority?.name || officerName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Department:</span>
                            <span className="font-mono font-bold text-slate-800 text-[11px]">
                              {inc.assigned_authority?.department || officerDept}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-medium">Higher Authority Fallback:</span>
                            <span className="font-bold text-rose-700 text-[11px] font-mono">
                              Admin SDM at Pargaon HQ
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono pt-1 border-t border-slate-200/60">
                            <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                            <span>GPS: {typeof inc?.latitude === 'number' ? inc.latitude.toFixed(4) : '19.8880'}, {typeof inc?.longitude === 'number' ? inc.longitude.toFixed(4) : '74.4750'}</span>
                          </div>
                        </div>

                        {/* SLA Breach Notice Banner */}
                        {isSlaBreached && !inc.authority_replied && (
                          <div className="mt-3 p-3 rounded-2xl bg-rose-100 border border-rose-300 text-xs text-rose-950 font-medium leading-relaxed">
                            <div className="font-bold flex items-center gap-1 text-rose-900 mb-0.5">
                              <span className="material-symbols-outlined text-sm text-rose-700">warning</span>
                              <span>2-Minute Response Time Exceeded</span>
                            </div>
                            This incident was not replied to within 2 minutes. It has been passed to <strong>Higher Authority (Admin SDM at Pargaon HQ)</strong> for emergency intervention. You can still submit a field response below.
                          </div>
                        )}

                        {/* Submitted Reply Note */}
                        {inc.authority_replied && inc.reply_note && (
                          <div className="mt-3 p-3 rounded-2xl bg-emerald-100/80 border border-emerald-300 text-xs text-emerald-950 leading-relaxed">
                            <div className="font-extrabold text-emerald-900 flex items-center gap-1 mb-0.5">
                              <span className="material-symbols-outlined text-sm text-emerald-700">check_circle</span>
                              <span>Officer Field Response Logged ({inc.replied_by || officerName}):</span>
                            </div>
                            "{inc.reply_note}"
                          </div>
                        )}
                      </div>

                      {/* Reply Form / Action Button */}
                      {!inc.authority_replied && (
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          {replyingIncidentId === inc.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={replyNote}
                                onChange={e => setReplyNote(e.target.value)}
                                placeholder="Enter operational update e.g., 'Rescue boat & team dispatched to Bet Kopargaon Ward 4. Field officer en route.'"
                                rows={2}
                                className="w-full text-xs p-3 rounded-2xl border border-slate-300 bg-slate-50 focus:bg-white focus:border-amber-500 outline-none resize-none font-sans"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setReplyingIncidentId(null)}
                                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
                                >
                                  Cancel
                                </button>
                                <button
                                  disabled={replying}
                                  onClick={() => handleIncidentReply(inc.id)}
                                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                >
                                  <span className="material-symbols-outlined text-sm">send</span>
                                  <span>{replying ? 'Sending...' : 'Submit Reply & Satisfy SLA'}</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReplyingIncidentId(inc.id);
                                setReplyNote(`Acknowledged by ${officerName} (${officerDept}). Field unit dispatched.`);
                              }}
                              className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-sm transition-all flex items-center justify-center gap-1.5"
                            >
                              <span className="material-symbols-outlined text-base">quick_reply</span>
                              <span>Acknowledge & Send Operational Reply</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: DOMAIN ACTIONS HUB (1-Click Deployment) */}
        {activeTab === 'domain-actions' && (
          <div className="flex flex-col gap-6">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                  Domain-Specific Operational Actions
                </h2>
                <p className="text-xs text-slate-500">
                  Pre-configured Standard Operating Procedures (SOPs) with resource metrics for your domain.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Department Scope Selector */}
                <select
                  value={domainFilter}
                  onChange={e => setDomainFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus:border-slate-900 focus:bg-white outline-none"
                >
                  <option value="my-dept">⭐ My Department ({officerDept})</option>
                  <option value="all">🌐 All Agency Domains</option>
                  <option value="Water Resources & Irrigation">🌊 Water Resources & Irrigation</option>
                  <option value="Fire Brigade & Water Rescue">🚒 Fire Brigade & Rescue</option>
                  <option value="Police & Public Safety">👮 Police & Public Safety</option>
                  <option value="Health & Medical Services">🏥 Health & Medical Services</option>
                  <option value="Administration & Revenue">🏛️ Administration & Revenue</option>
                  <option value="Agriculture & Krishi">🌾 Agriculture & Krishi</option>
                  <option value="MSEDCL & Power Grid">⚡ MSEDCL & Power Grid</option>
                  <option value="Municipal Administration">🚰 Municipal Administration</option>
                  <option value="NGO & Volunteer Relief">🤝 NGO & Volunteer Relief</option>
                </select>

                {/* Hazard Filter */}
                <select
                  value={hazardFilter}
                  onChange={e => setHazardFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold focus:border-slate-900 focus:bg-white outline-none"
                >
                  <option value="all">All Hazards</option>
                  <option value="flood">Flood (पूर)</option>
                  <option value="drought">Drought (दुष्काळ)</option>
                  <option value="heatwave">Heatwave (उष्णतेची लाट)</option>
                  <option value="unseasonal">Unseasonal Rain (अवेळी पाऊस)</option>
                </select>
              </div>
            </div>

            {/* Action Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map(tmpl => {
                const palette = HAZARD_PALETTES[tmpl.hazard === 'all' ? 'flood' : tmpl.hazard] || HAZARD_PALETTES.flood;
                const isMyDept = tmpl.department.toLowerCase().includes(officerDept.toLowerCase()) || 
                                 officerDept.toLowerCase().includes(tmpl.department.toLowerCase());

                return (
                  <div
                    key={tmpl.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all bg-white hover:shadow-md ${
                      isMyDept ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-9 h-9 rounded-xl ${tmpl.badge_color} text-white flex items-center justify-center shadow-xs`}>
                            <span className="material-symbols-outlined text-xl">{tmpl.icon}</span>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-800 block line-clamp-1">
                              {tmpl.department}
                            </span>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Sector: {tmpl.recommended_zone}
                            </span>
                          </div>
                        </div>

                        {tmpl.hazard !== 'all' && (
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                            style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                          >
                            {tmpl.hazard}
                          </span>
                        )}
                      </div>

                      {/* Action Titles */}
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
                        {tmpl.title_en}
                      </h3>

                      <p className="text-xs font-semibold text-slate-600 mt-1 line-clamp-2">
                        {tmpl.title_mr}
                      </p>

                      <p className="text-xs text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                        {tmpl.description_en}
                      </p>

                      {/* Resource Metrics Chips */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                        {tmpl.default_resources.boats && (
                          <span className="px-2 py-0.5 rounded-lg bg-blue-50 text-blue-800 font-mono font-bold text-[11px] border border-blue-100 flex items-center gap-1">
                            <span>🚤</span>
                            <span>{tmpl.default_resources.boats} Boats</span>
                          </span>
                        )}
                        {tmpl.default_resources.volunteers && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono font-bold text-[11px] border border-emerald-100 flex items-center gap-1">
                            <span>👥</span>
                            <span>{tmpl.default_resources.volunteers} Volunteers</span>
                          </span>
                        )}
                        {tmpl.default_resources.divers && (
                          <span className="px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 font-mono font-bold text-[11px] border border-cyan-100 flex items-center gap-1">
                            <span>🤿</span>
                            <span>{tmpl.default_resources.divers} Divers</span>
                          </span>
                        )}
                        {tmpl.default_resources.teams && (
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-800 font-mono font-bold text-[11px] border border-indigo-100 flex items-center gap-1">
                            <span>🛡️</span>
                            <span>{tmpl.default_resources.teams} Squads</span>
                          </span>
                        )}
                        {tmpl.default_resources.ambulances && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-mono font-bold text-[11px] border border-rose-100 flex items-center gap-1">
                            <span>🚑</span>
                            <span>{tmpl.default_resources.ambulances} Ambulances</span>
                          </span>
                        )}
                        {tmpl.default_resources.pumps && (
                          <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-800 font-mono font-bold text-[11px] border border-orange-100 flex items-center gap-1">
                            <span>⚙️</span>
                            <span>{tmpl.default_resources.pumps} Heavy Pumps</span>
                          </span>
                        )}
                        {tmpl.default_resources.tankers && (
                          <span className="px-2 py-0.5 rounded-lg bg-sky-50 text-sky-800 font-mono font-bold text-[11px] border border-sky-100 flex items-center gap-1">
                            <span>🚰</span>
                            <span>{tmpl.default_resources.tankers} Water Tankers</span>
                          </span>
                        )}
                        {tmpl.default_resources.food_packets && (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-800 font-mono font-bold text-[11px] border border-purple-100 flex items-center gap-1">
                            <span>🍲</span>
                            <span>{tmpl.default_resources.food_packets} Meals</span>
                          </span>
                        )}
                        {tmpl.default_resources.linemen && (
                          <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-mono font-bold text-[11px] border border-amber-100 flex items-center gap-1">
                            <span>⚡</span>
                            <span>{tmpl.default_resources.linemen} Linemen</span>
                          </span>
                        )}
                        {tmpl.default_resources.tarpaulins && (
                          <span className="px-2 py-0.5 rounded-lg bg-green-50 text-green-800 font-mono font-bold text-[11px] border border-green-100 flex items-center gap-1">
                            <span>⛺</span>
                            <span>{tmpl.default_resources.tarpaulins} Tarpaulins</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Deploy Button */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                      <button
                        onClick={() => handleOpenQuickDeploy(tmpl)}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-base text-amber-400">bolt</span>
                        <span>1-Click Quick Deploy &rarr;</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: ADMIN ORDERS & DISPATCHES */}
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

        {/* TAB 3: CUSTOM SUBMIT ACTION FORM */}
        {activeTab === 'submit-action' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">
                    Record Custom Departmental Action
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
                  Live Citizen Link
                </span>
              </div>

              <form onSubmit={handleSubmitCustomAction} className="mt-5 flex flex-col gap-4">
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
                    placeholder="e.g. Stationed 4 motorized rescue boats, 16 volunteers and 8 divers at Bet Kopargaon ghats."
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
                    placeholder="उदा. गोदावरी नदीकाठी ४ बचाव बोटी व १६ स्वयंसेवक जीवरक्षक तैनात करण्यात आले आहेत."
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

            {/* Quick Link to Domain Actions */}
            <div className="flex flex-col gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100 text-amber-600">
                  <span className="material-symbols-outlined text-lg">bolt</span>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Standard Domain Actions
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                  Instead of typing manually, you can use our 1-click domain actions for {officerDept} with pre-configured boats, volunteers, teams, and shelters:
                </p>
                <button
                  onClick={() => setActiveTab('domain-actions')}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  <span>Open 1-Click Domain Actions Hub</span>
                </button>
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

        {/* TAB 4: INTER-AGENCY LIVE ACTION STREAM */}
        {activeTab === 'actions-feed' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">
                  Live Field Response Feed (All Departments)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Synchronized real-time actions taken by Police, WRD, Fire, Health, Tahsil, Agriculture, MSEDCL, and NGOs.
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
                  Streaming Live to Citizens & SDM HQ
                </span>
              </div>

              <div className="divide-y divide-slate-100">
                {liveActions.map((act) => {
                  const palette = HAZARD_PALETTES[act.hazard as HazardType] || HAZARD_PALETTES.flood;
                  const isMine = act.authority_id === user?.authority_id || act.department === officerDept;

                  return (
                    <div key={act.id} className={`p-4 sm:p-5 transition-colors ${isMine ? 'bg-amber-50/30' : 'hover:bg-slate-50/60'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-900 text-white">
                            {act.department}
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            {act.authority_name}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            ({act.designation})
                          </span>
                          {isMine && (
                            <span className="px-2 py-0.2 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                              My Action
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                            style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                          >
                            {act.hazard}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            act.status === 'action_taken' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : act.status === 'in_field'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {act.status === 'action_taken' ? '✓ Action Completed' : act.status === 'in_field' ? '⚡ In Field' : '● Acknowledged'}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {act.action_title}
                      </p>

                      {act.action_title_mr && act.action_title_mr !== act.action_title && (
                        <p className="text-xs text-slate-600 font-medium mt-1">
                          {act.action_title_mr}
                        </p>
                      )}

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                        <span>Jurisdiction: <strong>{act.zone_id}</strong></span>
                        <span className="font-mono">{new Date(act.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* QUICK DEPLOY ACTION MODAL */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-900"
            >
              {/* Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${selectedTemplate.badge_color} text-white flex items-center justify-center shadow-sm`}>
                    <span className="material-symbols-outlined text-2xl">{selectedTemplate.icon}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      1-Click Domain Action Deployment
                    </span>
                    <h3 className="text-sm font-bold text-white leading-tight">
                      {selectedTemplate.department}
                    </h3>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="w-8 h-8 rounded-full hover:bg-white/20 text-white flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 leading-snug">
                    {selectedTemplate.title_en}
                  </h4>
                  <p className="text-xs font-semibold text-slate-600 mt-1">
                    {selectedTemplate.title_mr}
                  </p>
                  <p className="text-xs text-slate-500 mt-2">
                    {selectedTemplate.description_en}
                  </p>
                </div>

                {/* Resource Metrics Customizer */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Deployable Resource Quantification:
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Boats */}
                    {selectedTemplate.default_resources.boats !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🚤</span> Boats:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, boats: Math.max(1, (r.boats || 1) - 1) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-5 text-center">{modalResources.boats}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, boats: (r.boats || 1) + 1 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Volunteers */}
                    {selectedTemplate.default_resources.volunteers !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>👥</span> Volunteers:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, volunteers: Math.max(1, (r.volunteers || 5) - 5) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-6 text-center">{modalResources.volunteers}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, volunteers: (r.volunteers || 5) + 5 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Divers */}
                    {selectedTemplate.default_resources.divers !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🤿</span> Divers:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, divers: Math.max(1, (r.divers || 2) - 2) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-5 text-center">{modalResources.divers}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, divers: (r.divers || 2) + 2 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Teams */}
                    {selectedTemplate.default_resources.teams !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🛡️</span> Teams:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, teams: Math.max(1, (r.teams || 1) - 1) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-5 text-center">{modalResources.teams}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, teams: (r.teams || 1) + 1 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Ambulances */}
                    {selectedTemplate.default_resources.ambulances !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🚑</span> Ambulances:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, ambulances: Math.max(1, (r.ambulances || 1) - 1) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-5 text-center">{modalResources.ambulances}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, ambulances: (r.ambulances || 1) + 1 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}

                    {/* Water Tankers */}
                    {selectedTemplate.default_resources.tankers !== undefined && (
                      <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                          <span>🚰</span> Tankers:
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, tankers: Math.max(1, (r.tankers || 2) - 2) }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >-</button>
                          <span className="text-xs font-bold font-mono w-5 text-center">{modalResources.tankers}</span>
                          <button
                            type="button"
                            onClick={() => setModalResources(r => ({ ...r, tankers: (r.tankers || 2) + 2 }))}
                            className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold flex items-center justify-center"
                          >+</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Target Zone & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700">Sector / Zone</label>
                    <select
                      value={modalZone}
                      onChange={e => setModalZone(e.target.value)}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium"
                    >
                      <option value="zone-bet">Bet Kopargaon (Godavari Basin)</option>
                      <option value="zone-market">Main Town & Market</option>
                      <option value="zone-rural-north">North Rural (Sanjivani/Kolpewadi)</option>
                      <option value="zone-rural-south">South Drylands (Pohegaon)</option>
                      <option value="all-taluka">Entire Kopargaon Taluka</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-700">Deployment Status</label>
                    <select
                      value={modalStatus}
                      onChange={e => setModalStatus(e.target.value as any)}
                      className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium"
                    >
                      <option value="action_taken">✓ Action Completed / Deployed</option>
                      <option value="in_field">⚡ In Field (Mobilizing)</option>
                      <option value="acknowledged">● Standby / Acknowledged</option>
                    </select>
                  </div>
                </div>

                {/* Optional Note */}
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700">Officer Live Note (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Unit positioned at Old Bridge ghats with VHF radios."
                    value={modalCustomNotes}
                    onChange={e => setModalCustomNotes(e.target.value)}
                    className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTemplate(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={deploying}
                  onClick={handleExecuteQuickDeploy}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50"
                >
                  {deploying ? (
                    'Broadcasting Action...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-base text-amber-400">bolt</span>
                      <span>Confirm & Broadcast Live Action</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
