import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { safeFetchJson } from '../utils/api';
import { store } from '../store';
import { HazardType } from '../types';
import { HAZARD_PALETTES } from './HazardPalettes';

interface Incident {
  id: string;
  reporter_id: string;
  hazard: HazardType;
  description: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  ai_severity_score: number;
  status: 'pending_verification' | 'pending_authority_reply' | 'verified' | 'rejected' | 'ESCALATED_TO_SDM_PARGAON' | 'ESCALATED_TO_MAIN_ADMIN';
  created_at: string;
  verified_at?: string;
  assigned_authority?: {
    id: string;
    name: string;
    designation: string;
    department: string;
    phone: string;
  };
  assigned_desk?: string;
  higher_authority?: string;
  sla_seconds?: number;
  authority_replied?: boolean;
  sla_breached?: boolean;
  escalated_to_sdm?: boolean;
  escalation_reason?: string;
}

interface Props {
  onShowToast: (msg: string) => void;
  currentUser: any;
}

const DEMO_SLA_SECONDS = 120; // 2 minutes SLA threshold (120 seconds)

export const IncidentsManagementTab: React.FC<Props> = ({ onShowToast, currentUser }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const fetchIncidents = async () => {
    try {
      const token = await store.getToken();
      const res = await safeFetchJson('/api/v1/admin/incidents', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (res.ok && res.data?.incidents) {
        setIncidents(res.data.incidents);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  };

  // Background SLA check loop & Auto-Escalation to Higher Authority: Admin SDM at Pargaon HQ
  const checkAndEscalate = () => {
    const current = Date.now();
    setNow(current);

    const breachedIds: string[] = [];

    setIncidents(prev => {
      let hasChanges = false;
      const nextIncidents = prev.map(item => {
        if (!item.authority_replied && (item.status === 'pending_verification' || item.status === 'pending_authority_reply' || !item.status)) {
          const ageSeconds = Math.floor((current - new Date(item.created_at).getTime()) / 1000);
          if (ageSeconds >= DEMO_SLA_SECONDS && !item.sla_breached) {
            breachedIds.push(item.id);
            hasChanges = true;
            return {
              ...item,
              status: 'ESCALATED_TO_SDM_PARGAON' as const,
              assigned_desk: 'HIGHER_AUTHORITY: Admin SDM at Pargaon HQ',
              sla_breached: true,
              escalated_to_sdm: true
            };
          }
        }
        return item;
      });
      return hasChanges ? nextIncidents : prev;
    });

    if (breachedIds.length > 0) {
      setTimeout(() => {
        breachedIds.forEach(id => {
          const shortId = id.includes('-') ? id.split('-')[1] : id;
          onShowToast(`🚨 2-MIN SLA BREACH: Incident #${shortId} auto-escalated to Higher Authority (Admin SDM at Pargaon HQ)!`);
        });
      }, 0);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const fetchInterval = setInterval(fetchIncidents, 5000);
    const slaInterval = setInterval(checkAndEscalate, 1000);
    return () => {
      clearInterval(fetchInterval);
      clearInterval(slaInterval);
    };
  }, []);

  const handleVerify = async (id: string, action: 'verify' | 'reject') => {
    setActioningId(id);
    try {
      const token = await store.getToken();
      const res = await safeFetchJson(`/api/v1/admin/incidents/${id}/verify`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ action, reply_note: 'Verified & actioned by Admin SDM Disaster Cell.' })
      });
      if (res.ok) {
        onShowToast(`Incident successfully ${action === 'verify' ? 'verified' : 'rejected'}`);
        fetchIncidents();
      } else {
        onShowToast(res.error || 'Failed to update incident');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Failed to update incident');
    } finally {
      setActioningId(null);
    }
  };

  const pendingIncidents = incidents.filter(i => (i.status === 'pending_verification' || i.status === 'pending_authority_reply' || !i.status) && !i.authority_replied);
  const escalatedIncidents = incidents.filter(i => i.status === 'ESCALATED_TO_SDM_PARGAON' || i.status === 'ESCALATED_TO_MAIN_ADMIN');
  const verifiedIncidents = incidents.filter(i => i.status === 'verified');
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected');

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading citizen reports & SLA timers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* SLA Auto-Escalated Banner if any exist */}
      {escalatedIncidents.length > 0 && (
        <div className="p-4 rounded-3xl bg-rose-600 text-white shadow-xl flex items-center justify-between gap-3 animate-pulse border border-rose-400">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">warning</span>
            <div>
              <div className="font-extrabold text-sm tracking-tight">
                2-MIN SLA BREACH ALERT: {escalatedIncidents.length} Incident(s) Auto-Escalated to Admin SDM (Pargaon HQ)
              </div>
              <div className="text-xs text-rose-100 font-medium mt-0.5">
                Concerned authority did not reply within 2 minutes. Re-routed with top priority to Higher Authority: Sub-Divisional Magistrate (SDM), Pargaon HQ.
              </div>
            </div>
          </div>
          <span className="px-3 py-1.5 rounded-xl bg-white text-rose-800 text-xs font-mono font-extrabold uppercase shadow-sm shrink-0">
            PASSED TO SDM HQ
          </span>
        </div>
      )}

      {/* Pending & Escalated Incident Queue */}
      <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">
              Incident Response Queue ({pendingIncidents.length + escalatedIncidents.length})
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Automated 2-Minute SLA Router: Messages reach concerned authorities first & escalate to Admin SDM (Pargaon HQ) if unreplied.
            </p>
          </div>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 border border-slate-300 flex items-center gap-1 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Refresh Queue</span>
          </button>
        </div>

        {[...escalatedIncidents, ...pendingIncidents].length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <span className="material-symbols-outlined text-4xl text-emerald-500 mb-2">check_circle</span>
            <p className="text-sm font-bold text-slate-800">All incident reports actioned!</p>
            <p className="text-xs text-slate-500 mt-1">No pending citizen reports require verification or SLA escalation.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {[...escalatedIncidents, ...pendingIncidents].map(incident => {
                const palette = HAZARD_PALETTES[incident.hazard] || HAZARD_PALETTES.flood;
                const elapsedSec = Math.floor((now - new Date(incident.created_at).getTime()) / 1000);
                const remainingSec = Math.max(0, DEMO_SLA_SECONDS - elapsedSec);
                const isEscalated = incident.status === 'ESCALATED_TO_SDM_PARGAON' || incident.status === 'ESCALATED_TO_MAIN_ADMIN' || remainingSec === 0;

                const minsLeft = Math.floor(remainingSec / 60);
                const secsLeft = remainingSec % 60;

                return (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`border rounded-2xl p-4 transition-all flex flex-col justify-between ${
                      isEscalated
                        ? 'border-rose-400 bg-rose-50/70 shadow-md ring-2 ring-rose-200'
                        : 'border-slate-200 bg-white shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span 
                          className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 shadow-xs"
                          style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                        >
                          <span className="material-symbols-outlined text-sm">{palette.symbol}</span>
                          {incident.hazard}
                        </span>

                        {isEscalated ? (
                          <span className="px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-mono font-extrabold uppercase flex items-center gap-1 shadow-xs">
                            <span className="material-symbols-outlined text-xs">local_police</span>
                            <span>SDM PARGAON HQ</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-950 text-[10px] font-mono font-extrabold border border-amber-200 flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs text-amber-700 animate-spin">timer</span>
                            <span>2M SLA: {minsLeft}m {secsLeft < 10 ? `0${secsLeft}` : secsLeft}s</span>
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-extrabold text-slate-900 leading-snug mb-2">
                        "{incident.description}"
                      </p>
                      
                      {incident.photo_url && (
                        <div className="mt-2 mb-3 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 max-h-32 flex items-center justify-center">
                          <img src={incident.photo_url} alt="Incident" className="object-cover w-full h-full" />
                        </div>
                      )}

                      <div className="space-y-1.5 mt-3 pt-2.5 border-t border-slate-200/80 text-xs">
                        {/* Concerned Authority Assigned */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Concerned Authority:</span>
                          <span className="font-bold text-slate-800 font-sans text-[11px] truncate max-w-[180px]">
                            {incident.assigned_authority?.name || 'Department Officer'}
                          </span>
                        </div>

                        {/* Department Desk */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Target Department:</span>
                          <span className="font-mono font-bold text-slate-700 text-[10px] truncate max-w-[180px]">
                            {incident.assigned_authority?.department || 'Field Ops'}
                          </span>
                        </div>

                        {/* Higher Authority Fallback */}
                        <div className="flex items-center justify-between">
                          <span className="text-slate-500 font-medium">Higher Authority:</span>
                          <span className="font-bold text-amber-800 text-[11px] font-mono">
                            Admin SDM (Pargaon HQ)
                          </span>
                        </div>

                        {/* Location */}
                        <div className="flex items-center gap-1 text-[11px] text-slate-600 font-mono pt-1">
                          <span className="material-symbols-outlined text-xs text-slate-400">location_on</span>
                          <span className="truncate">
                            {typeof incident?.latitude === 'number' ? incident.latitude.toFixed(4) : '19.8880'}, {typeof incident?.longitude === 'number' ? incident.longitude.toFixed(4) : '74.4750'}
                          </span>
                        </div>
                      </div>

                      {isEscalated && (
                        <div className="mt-3 p-2 rounded-xl bg-rose-100 border border-rose-200 text-[11px] text-rose-900 font-medium leading-tight">
                          ⚠️ <strong>SLA Breached:</strong> Concerned authority did not respond within 2 mins. Escalated directly to Admin SDM at Pargaon HQ for emergency action.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center gap-2">
                      <button
                        disabled={actioningId === incident.id}
                        onClick={() => handleVerify(incident.id, 'reject')}
                        className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors disabled:opacity-50"
                      >
                        Reject
                      </button>
                      <button
                        disabled={actioningId === incident.id}
                        onClick={() => handleVerify(incident.id, 'verify')}
                        className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>SDM Verify & Dispatch</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {(verifiedIncidents.length > 0 || rejectedIncidents.length > 0) && (
        <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-4 shadow-sm">
          <h3 className="font-bold text-slate-900 text-lg">Actioned Reports Log</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3">ID / DATE</th>
                  <th className="p-3">HAZARD</th>
                  <th className="p-3">DETAILS</th>
                  <th className="p-3">SLA STATUS</th>
                  <th className="p-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...verifiedIncidents, ...rejectedIncidents].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20).map(incident => (
                  <tr key={incident.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-slate-700">{incident.id.split('-')[1]}</div>
                      <div className="text-slate-400 text-[10px]">{new Date(incident.created_at).toLocaleDateString()}</div>
                    </td>
                    <td className="p-3 uppercase text-slate-800 font-semibold">{incident.hazard}</td>
                    <td className="p-3">
                      <div className="text-slate-800 font-sans truncate max-w-xs">{incident.description}</div>
                    </td>
                    <td className="p-3">
                      {incident.sla_breached ? (
                        <span className="text-rose-700 font-bold">BREACHED</span>
                      ) : (
                        <span className="text-emerald-700 font-bold">WITHIN_SLA</span>
                      )}
                    </td>
                    <td className="p-3">
                      {incident.status === 'verified' ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">Verified</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-bold">Rejected</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
