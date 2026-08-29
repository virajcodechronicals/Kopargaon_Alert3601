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
  status: 'pending_verification' | 'verified' | 'rejected';
  created_at: string;
  verified_at?: string;
}

interface Props {
  onShowToast: (msg: string) => void;
  currentUser: any;
}

export const IncidentsManagementTab: React.FC<Props> = ({ onShowToast, currentUser }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

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

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async (id: string, action: 'verify' | 'reject') => {
    setActioningId(id);
    try {
      const token = await store.getToken();
      const res = await safeFetchJson(`/api/v1/admin/incidents/${id}/verify`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: JSON.stringify({ action })
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

  const pendingIncidents = incidents.filter(i => i.status === 'pending_verification' || !i.status);
  const verifiedIncidents = incidents.filter(i => i.status === 'verified');
  const rejectedIncidents = incidents.filter(i => i.status === 'rejected');

  if (loading) {
    return <div className="p-10 text-center text-slate-500">Loading citizen reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 p-6 rounded-3xl space-y-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-lg">Pending Citizen Reports ({pendingIncidents.length})</h3>
            <p className="text-xs text-slate-500">Verify ground-truth reports from citizens before dispatching authorities.</p>
          </div>
          <button
            onClick={fetchIncidents}
            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-mono text-slate-700 border border-slate-300 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span>Refresh</span>
          </button>
        </div>

        {pendingIncidents.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100">
            <span className="material-symbols-outlined text-4xl text-emerald-400 mb-2">check_circle</span>
            <p className="text-sm font-bold text-slate-700">All caught up!</p>
            <p className="text-xs text-slate-500 mt-1">No pending citizen reports require verification.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {pendingIncidents.map(incident => {
                const palette = HAZARD_PALETTES[incident.hazard] || HAZARD_PALETTES.flood;
                return (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="border border-slate-200 rounded-2xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span 
                          className="px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                          style={{ backgroundColor: palette.tone90, color: palette.tone30 }}
                        >
                          <span className="material-symbols-outlined text-sm">{palette.symbol}</span>
                          {incident.hazard}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(incident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-800 leading-snug mb-2">
                        "{incident.description}"
                      </p>
                      
                      {incident.photo_url && (
                        <div className="mt-2 mb-3 rounded-xl overflow-hidden border border-slate-100 bg-slate-50 max-h-32 flex items-center justify-center">
                          <img src={incident.photo_url} alt="Incident" className="object-cover w-full h-full" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3 text-xs text-slate-600 font-mono">
                        <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                        <span className="truncate">{incident.latitude.toFixed(4)}, {incident.longitude.toFixed(4)}</span>
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span className="text-slate-500">AI Severity Score:</span>
                        <span className={`font-bold ${incident.ai_severity_score >= 0.8 ? 'text-rose-600' : incident.ai_severity_score >= 0.5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {incident.ai_severity_score.toFixed(2)} / 1.0
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
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
                        Verify & Send
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
                  <th className="p-3">AI SCORE</th>
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
                    <td className="p-3 font-bold text-slate-600">{incident.ai_severity_score.toFixed(2)}</td>
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
