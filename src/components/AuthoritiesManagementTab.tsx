import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthorityContact, AuthorityDepartment, DisasterDispatchLog, HazardType, RiskLevel, CentralBroadcastPayload } from '../types';
import { store } from '../store';

interface AuthoritiesManagementTabProps {
  onShowToast: (msg: string) => void;
  currentUser?: { name?: string; email?: string; role?: string };
}

const DEPARTMENTS: AuthorityDepartment[] = [
  'Administration & Revenue',
  'Water Resources & Irrigation',
  'Disaster Management & SDRF',
  'Police & Public Safety',
  'Health & Medical Services',
  'Fire Brigade & Water Rescue',
  'Agriculture & Krishi',
  'MSEDCL & Power Grid',
  'Municipal Administration',
  'NGO & Volunteer Relief'
];

const ZONES = [
  { id: 'all-taluka', name: 'Entire Taluka (All Zones)' },
  { id: 'zone-bet', name: 'Bet Kopargaon (Godavari Basin)' },
  { id: 'zone-market', name: 'Kopargaon Main Town & Market' },
  { id: 'zone-rural-north', name: 'Northern Belt (Sanjivani/Kolpewadi)' },
  { id: 'zone-rural-south', name: 'Southern Drylands (Pohegaon Road)' }
];

export const AuthoritiesManagementTab: React.FC<AuthoritiesManagementTabProps> = ({
  onShowToast,
  currentUser
}) => {
  const [authorities, setAuthorities] = useState<AuthorityContact[]>([]);
  const [dispatchLogs, setDispatchLogs] = useState<DisasterDispatchLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSubView, setActiveSubView] = useState<'roster' | 'emergency-dispatch' | 'central-broadcast' | 'dispatch-logs'>('roster');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState<string>('all');
  const [filterHazard, setFilterHazard] = useState<string>('all');

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAuth, setEditingAuth] = useState<AuthorityContact | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Direct Page Modal
  const [directPageTarget, setDirectPageTarget] = useState<AuthorityContact | null>(null);
  const [directPageMsg, setDirectPageMsg] = useState('');

  // 1. Emergency Dispatch Form State (Inform Concerned Authorities When Disaster Hits)
  const [dispatchHazard, setDispatchHazard] = useState<HazardType>('flood');
  const [dispatchSeverity, setDispatchSeverity] = useState<RiskLevel>('CRITICAL');
  const [dispatchZone, setDispatchZone] = useState<string>('zone-bet');
  const [dispatchTrigger, setDispatchTrigger] = useState('Godavari river stage reached 492.35m with upstream discharge 45,000 cfs from Gangapur & Darna dams.');
  const [dispatchCustomMsg, setDispatchCustomMsg] = useState('Immediate Stage-2 flood response protocol activated. Mobilize rescue boats to Bet Kopargaon ghats, activate Somaiya Hall shelter, and de-energize low-lying 11kV lines.');
  const [dispatchChannels, setDispatchChannels] = useState({
    sms: true,
    whatsapp: true,
    voice_call: true,
    fcm: true
  });
  const [dispatchSuccessReceipt, setDispatchSuccessReceipt] = useState<any | null>(null);

  // 2. Central Public Broadcast Form State (Issued by Concerned Authority)
  const [centralHazard, setCentralHazard] = useState<HazardType>('flood');
  const [centralSeverity, setCentralSeverity] = useState<RiskLevel>('CRITICAL');
  const [centralZone, setCentralZone] = useState<string>('zone-bet');
  const [authorDesignation, setAuthorDesignation] = useState('Sub-Divisional Magistrate (SDM) Kopargaon');
  const [centralEn, setCentralEn] = useState('HIGH FLOOD EVACUATION NOTICE: Godavari river has breached warning level (492.3m). Residents in low-lying Bet Kopargaon must move to designated shelters immediately.');
  const [centralMr, setCentralMr] = useState('पूर इशारा व स्थलांतर सूचना: गोदावरी नदीने इशारा पातळी (४९२.३ मी) ओलांडली आहे. बेट कोपरगाव भागातील रहिवाशांनी तात्काळ सोमय्या हॉल मदत केंद्रात स्थलांतर करावे.');
  const [centralChannels, setCentralChannels] = useState({
    app_banner: true,
    push_fcm: true,
    cell_sms: true,
    sirens: true,
    voice_tts: true
  });

  // Authority Form State (Add / Edit)
  const [formName, setFormName] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formDepartment, setFormDepartment] = useState<AuthorityDepartment>('Administration & Revenue');
  const [formPhone, setFormPhone] = useState('+91-');
  const [formEmergencyPhone, setFormEmergencyPhone] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formZone, setFormZone] = useState('all-taluka');
  const [formHazard, setFormHazard] = useState<HazardType | 'all'>('all');
  const [formStatus, setFormStatus] = useState<'active' | 'on_duty' | 'standby' | 'off_duty'>('on_duty');
  const [formNotes, setFormNotes] = useState('');
  const [formLoginUsername, setFormLoginUsername] = useState('');
  const [formLoginPassword, setFormLoginPassword] = useState('');
  const [formRole, setFormRole] = useState<'concerned_authority' | 'admin'>('concerned_authority');
  const [formAccessLevel, setFormAccessLevel] = useState<'sub_admin' | 'operational_field' | 'department_head'>('operational_field');
  const [formChannels, setFormChannels] = useState({
    sms: true,
    whatsapp: true,
    voice_call: true,
    email: true,
    central_broadcast: true
  });

  // Load authorities and logs
  const loadData = async () => {
    setLoading(true);
    try {
      const [authList, logs] = await Promise.all([
        store.getAuthorities(),
        store.getDispatchLogs()
      ]);
      setAuthorities(authList);
      setDispatchLogs(logs);
    } catch (e) {
      console.error('Error loading authorities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingAuth(null);
    setFormName('');
    setFormDesignation('');
    setFormDepartment('Administration & Revenue');
    setFormPhone('+91-');
    setFormEmergencyPhone('');
    setFormEmail('');
    setFormZone('all-taluka');
    setFormHazard('all');
    setFormStatus('on_duty');
    setFormNotes('');
    setFormLoginUsername('officer.' + Math.floor(100 + Math.random() * 900));
    setFormLoginPassword('pass@' + Math.floor(1000 + Math.random() * 9000));
    setFormRole('concerned_authority');
    setFormAccessLevel('operational_field');
    setFormChannels({ sms: true, whatsapp: true, voice_call: true, email: true, central_broadcast: true });
    setShowAddModal(true);
  };

  const openEditModal = (auth: AuthorityContact) => {
    setEditingAuth(auth);
    setFormName(auth.name);
    setFormDesignation(auth.designation);
    setFormDepartment(auth.department as AuthorityDepartment);
    setFormPhone(auth.phone);
    setFormEmergencyPhone(auth.emergency_phone || '');
    setFormEmail(auth.email);
    setFormZone(auth.zone_id || 'all-taluka');
    setFormHazard(auth.hazard_responsibility || 'all');
    setFormStatus(auth.status || 'on_duty');
    setFormNotes(auth.notes || '');
    setFormLoginUsername(auth.login_username || '');
    setFormLoginPassword(auth.login_password || '');
    setFormRole(auth.role || 'concerned_authority');
    setFormAccessLevel(auth.access_level || 'operational_field');
    setFormChannels(auth.notify_channels || { sms: true, whatsapp: true, voice_call: true, email: true, central_broadcast: true });
    setShowAddModal(true);
  };

  const handleSaveAuthority = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formDesignation.trim() || !formPhone.trim() || !formEmail.trim()) {
      onShowToast('Please fill all required authority contact fields.');
      return;
    }

    setActionLoading(true);
    try {
      const payload: Partial<AuthorityContact> = {
        name: formName.trim(),
        designation: formDesignation.trim(),
        department: formDepartment,
        phone: formPhone.trim(),
        emergency_phone: formEmergencyPhone.trim(),
        email: formEmail.trim(),
        zone_id: formZone,
        hazard_responsibility: formHazard,
        status: formStatus,
        notes: formNotes.trim(),
        login_username: formLoginUsername.trim() || undefined,
        login_password: formLoginPassword.trim() || undefined,
        role: formRole,
        access_level: formAccessLevel,
        notify_channels: formChannels
      };

      if (editingAuth) {
        const updated = await store.updateAuthority(editingAuth.id, payload);
        setAuthorities(prev => prev.map(a => (a.id === editingAuth.id ? updated : a)));
        onShowToast(`Updated officer profile & login for ${updated.name}`);
      } else {
        const created = await store.addAuthority(payload);
        setAuthorities(prev => [created, ...prev]);
        onShowToast(`Added ${created.name} (${created.designation}) with login credentials`);
      }
      setShowAddModal(false);
    } catch (err: any) {
      onShowToast('Error saving authority: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteAuthority = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove ${name} from the disaster response roster?`)) return;
    try {
      await store.deleteAuthority(id);
      setAuthorities(prev => prev.filter(a => a.id !== id));
      onShowToast(`Removed ${name} from authorities directory.`);
    } catch (err: any) {
      onShowToast('Error removing authority: ' + err.message);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'on_duty' | 'standby' | 'off_duty') => {
    try {
      const updated = await store.updateAuthority(id, { status: newStatus });
      setAuthorities(prev => prev.map(a => (a.id === id ? updated : a)));
      onShowToast(`Status updated to ${newStatus.toUpperCase().replace('_', ' ')}`);
    } catch (err: any) {
      onShowToast('Status update failed: ' + err.message);
    }
  };

  // Trigger Emergency Dispatch to Concerned Authorities
  const handleTriggerEmergencyDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setDispatchSuccessReceipt(null);
    try {
      const activeChannelsList = Object.entries(dispatchChannels)
        .filter(([_, active]) => active)
        .map(([ch]) => ch.toUpperCase());

      const res = await store.notifyConcernedAuthorities({
        hazard: dispatchHazard,
        severity: dispatchSeverity,
        zone_id: dispatchZone,
        trigger_event: dispatchTrigger,
        custom_message: dispatchCustomMsg,
        channels: activeChannelsList
      });

      setDispatchSuccessReceipt(res.dispatch);
      onShowToast(res.message || 'Concerned disaster authorities successfully notified!');
      store.getDispatchLogs().then(setDispatchLogs);
    } catch (err: any) {
      onShowToast('Dispatch error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Transmit Central Public Broadcast by Concerned Authority
  const handleSendCentralBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const payload: CentralBroadcastPayload = {
        hazard: centralHazard,
        severity: centralSeverity,
        zone_id: centralZone,
        author_name: currentUser?.name || 'SDM Kopargaon Command Cell',
        author_designation: authorDesignation,
        message_en: centralEn,
        message_mr: centralMr,
        channels: centralChannels
      };

      const res = await store.sendCentralBroadcast(payload);
      onShowToast('Central disaster broadcast transmitted across sirens, mobile push & SMS!');
      setActiveSubView('dispatch-logs');
      store.getDispatchLogs().then(setDispatchLogs);
    } catch (err: any) {
      onShowToast('Central broadcast error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Direct Page Officer
  const handleDirectPageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPageTarget) return;
    setActionLoading(true);
    try {
      await store.notifyConcernedAuthorities({
        hazard: (directPageTarget.hazard_responsibility !== 'all' ? directPageTarget.hazard_responsibility : 'flood') as HazardType,
        severity: 'HIGH',
        zone_id: directPageTarget.zone_id || 'all-taluka',
        trigger_event: `Direct Emergency Page from Control Room to ${directPageTarget.name}`,
        custom_message: directPageMsg || `URGENT DIRECT PAGE: ${directPageTarget.name} (${directPageTarget.designation}), please report to Kopargaon Disaster Control Room immediately.`,
        channels: ['SMS', 'WhatsApp', 'Voice IVR', 'FCM']
      });
      onShowToast(`Direct emergency page dispatched to ${directPageTarget.name} (${directPageTarget.phone})`);
      setDirectPageTarget(null);
      setDirectPageMsg('');
      store.getDispatchLogs().then(setDispatchLogs);
    } catch (err: any) {
      onShowToast('Direct page error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter matched authorities for the live preview in Emergency Dispatch Console
  const matchedConcernedAuthorities = authorities.filter(a => {
    const hazardMatch = a.hazard_responsibility === 'all' || a.hazard_responsibility === dispatchHazard;
    const zoneMatch = a.zone_id === 'all-taluka' || a.zone_id === dispatchZone;
    return hazardMatch || zoneMatch;
  });

  // Filtered authorities for Roster table
  const filteredAuthorities = authorities.filter(a => {
    const matchesSearch =
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.designation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.phone.includes(searchQuery) ||
      a.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = filterDepartment === 'all' || a.department === filterDepartment;
    const matchesHazard = filterHazard === 'all' || a.hazard_responsibility === filterHazard || a.hazard_responsibility === 'all';
    return matchesSearch && matchesDept && matchesHazard;
  });

  // Department color helper
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

  return (
    <div className="space-y-6">
      {/* Top Section Summary & KPI Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Registered Authorities</span>
            <span className="material-symbols-outlined text-sky-600">supervised_user_circle</span>
          </div>
          <div className="text-3xl text-slate-900 font-mono my-2 font-bold">{authorities.length}</div>
          <div className="text-xs text-sky-700 font-medium">Nodal Disaster Officers</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>On-Duty Readiness</span>
            <span className="material-symbols-outlined text-emerald-600">verified_user</span>
          </div>
          <div className="text-3xl text-slate-900 font-mono my-2 font-bold">
            {authorities.filter(a => a.status === 'on_duty' || a.status === 'active').length}
          </div>
          <div className="text-xs text-emerald-700 font-medium">Ready for Instant Mobilization</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Dispatches Sent</span>
            <span className="material-symbols-outlined text-rose-600">quickreply</span>
          </div>
          <div className="text-3xl text-slate-900 font-mono my-2 font-bold">{dispatchLogs.length}</div>
          <div className="text-xs text-rose-700 font-medium">CAP Priority Alert Runs</div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-3xl flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase">
            <span>Dispatch Channels</span>
            <span className="material-symbols-outlined text-amber-600">cell_tower</span>
          </div>
          <div className="text-3xl text-slate-900 font-mono my-2 font-bold">5 Active</div>
          <div className="text-xs text-amber-700 font-medium">SMS • WhatsApp • IVR • Push • Sirens</div>
        </div>
      </div>

      {/* Sub-Navigation Switcher */}
      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/70 rounded-2xl border border-slate-300/60 max-w-fit">
        <button
          onClick={() => setActiveSubView('roster')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'roster'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">badge</span>
          <span>Authority Roster ({authorities.length})</span>
        </button>

        <button
          onClick={() => setActiveSubView('emergency-dispatch')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'emergency-dispatch'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">notifications_active</span>
          <span>Inform Concerned Authorities</span>
        </button>

        <button
          onClick={() => setActiveSubView('central-broadcast')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'central-broadcast'
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">campaign</span>
          <span>Central-Based Broadcast</span>
        </button>

        <button
          onClick={() => setActiveSubView('dispatch-logs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeSubView === 'dispatch-logs'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">history</span>
          <span>Dispatch History ({dispatchLogs.length})</span>
        </button>
      </div>

      {/* VIEW 1: AUTHORITY DIRECTORY & ROSTER (CRUD) */}
      {activeSubView === 'roster' && (
        <div className="space-y-4">
          {/* Action & Filter Bar */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-1 flex-wrap items-center gap-3 w-full">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[240px]">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search officer name, designation, phone, or dept..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Department Filter */}
              <select
                value={filterDepartment}
                onChange={e => setFilterDepartment(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Hazard Responsibility Filter */}
              <select
                value={filterHazard}
                onChange={e => setFilterHazard(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700"
              >
                <option value="all">All Hazard Roles</option>
                <option value="flood">Flood Specialists</option>
                <option value="drought">Drought Cells</option>
                <option value="heatwave">Heatwave Medical</option>
                <option value="unseasonal">Agriculture / Storms</option>
              </select>
            </div>

            <button
              id="add-new-authority-btn"
              onClick={openAddModal}
              className="py-2.5 px-4 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm shrink-0 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              <span>ADD RESPECTIVE AUTHORITY</span>
            </button>
          </div>

          {/* Roster Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              Loading authority directory...
            </div>
          ) : filteredAuthorities.length === 0 ? (
            <div className="bg-white border border-slate-200 p-10 rounded-3xl text-center space-y-2">
              <span className="material-symbols-outlined text-4xl text-slate-400">group_off</span>
              <p className="text-sm font-bold text-slate-700">No authorities matched your filters</p>
              <p className="text-xs text-slate-500">Try adjusting your search criteria or add a new officer.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuthorities.map(auth => (
                <div
                  key={auth.id}
                  className="bg-white border border-slate-200 hover:border-slate-300 rounded-3xl p-5 shadow-sm flex flex-col justify-between space-y-4 transition-all"
                >
                  <div className="space-y-3">
                    {/* Header: Name, Department, Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">{auth.name}</h3>
                        </div>
                        <p className="text-xs text-slate-600 font-medium leading-tight">{auth.designation}</p>
                      </div>

                      {/* Status Dropdown */}
                      <select
                        value={auth.status}
                        onChange={e => handleStatusChange(auth.id, e.target.value as any)}
                        className={`text-[10px] font-bold uppercase rounded-lg px-2 py-1 border ${
                          auth.status === 'on_duty'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : auth.status === 'active'
                            ? 'bg-sky-50 text-sky-800 border-sky-200'
                            : auth.status === 'standby'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <option value="on_duty">ON DUTY</option>
                        <option value="active">ACTIVE</option>
                        <option value="standby">STANDBY</option>
                        <option value="off_duty">OFF DUTY</option>
                      </select>
                    </div>

                    {/* Department Badge */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getDeptColorBadge(auth.department)}`}>
                        {auth.department}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                        {auth.zone_id === 'all-taluka' ? 'Taluka-wide' : auth.zone_id.replace('zone-', '').toUpperCase()}
                      </span>
                      <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-2 py-0.5 rounded-md border border-rose-200 capitalize">
                        {auth.hazard_responsibility === 'all' ? 'Multi-Hazard' : auth.hazard_responsibility}
                      </span>
                    </div>

                    {/* Contact details with Direct Tap-to-Call */}
                    <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                      {/* Primary Phone - Tap to Call */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium shrink-0">
                          <span className="material-symbols-outlined text-sm text-slate-400">call</span>
                          Primary:
                        </span>
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <a
                            href={`tel:${auth.phone.replace(/[^0-9+]/g, '')}`}
                            title="Tap to direct dial phone number"
                            className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 bg-white hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-slate-200 px-2.5 py-1 rounded-xl shadow-xs transition-all active:scale-95 group"
                          >
                            <span className="material-symbols-outlined text-xs text-emerald-600 group-hover:scale-110 transition-transform">
                              call
                            </span>
                            <span className="truncate">{auth.phone}</span>
                          </a>
                          <a
                            href={`https://wa.me/${auth.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Direct WhatsApp Chat"
                            className="p-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shrink-0"
                          >
                            <span className="material-symbols-outlined text-sm">chat</span>
                          </a>
                        </div>
                      </div>

                      {/* Emergency Hotline - Tap to Call */}
                      {auth.emergency_phone && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-slate-500 flex items-center gap-1.5 font-medium shrink-0">
                            <span className="material-symbols-outlined text-sm text-rose-500">crisis_alert</span>
                            Emergency:
                          </span>
                          <a
                            href={`tel:${auth.emergency_phone.replace(/[^0-9+]/g, '')}`}
                            title="Tap to call emergency hotline immediately"
                            className="inline-flex items-center gap-1 font-mono font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-900 border border-rose-200 px-2.5 py-1 rounded-xl shadow-xs transition-all active:scale-95"
                          >
                            <span className="material-symbols-outlined text-xs text-rose-600 animate-pulse">
                              phone_in_talk
                            </span>
                            <span className="truncate">{auth.emergency_phone}</span>
                          </a>
                        </div>
                      )}

                      {/* Email - Tap to Mail */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 flex items-center gap-1.5 font-medium shrink-0">
                          <span className="material-symbols-outlined text-sm text-slate-400">mail</span>
                          Email:
                        </span>
                        <a
                          href={`mailto:${auth.email}`}
                          title="Send direct email"
                          className="font-mono text-[11px] text-slate-700 hover:text-sky-600 hover:underline truncate max-w-[190px]"
                        >
                          {auth.email}
                        </a>
                      </div>
                    </div>

                    {/* Concerned Authority Login Credentials Badge */}
                    <div className="bg-amber-50/80 p-3 rounded-2xl border border-amber-200/90 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm text-amber-700">key</span>
                          Concern Authority Login:
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-amber-200 text-amber-950">
                          {auth.access_level === 'sub_admin' ? 'Sub-Admin' : 'Field Nodal'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-800 bg-white px-2.5 py-1.5 rounded-xl border border-amber-200">
                        <span className="truncate">User: <strong className="text-amber-950">{auth.login_username || auth.email.split('@')[0]}</strong></span>
                        <span className="truncate ml-2">Pass: <strong className="text-slate-700">{auth.login_password || '••••••••'}</strong></span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`Concern Authority Login:\nUsername: ${auth.login_username || auth.email.split('@')[0]}\nPassword: ${auth.login_password || 'Set by SDM'}\nPortal: Kopargaon Disaster System`);
                            onShowToast(`Copied officer credentials for ${auth.name}`);
                          }}
                          className="text-[10px] text-amber-800 hover:text-amber-950 font-extrabold underline shrink-0 ml-2"
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    {auth.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-amber-50/50 border border-amber-200/50 p-2 rounded-xl">
                        "{auth.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${auth.phone.replace(/[^0-9+]/g, '')}`}
                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                        title="Tap to Call Immediately"
                      >
                        <span className="material-symbols-outlined text-sm">call</span>
                        <span>Call Now</span>
                      </a>

                      <button
                        onClick={() => {
                          setDirectPageTarget(auth);
                          setDirectPageMsg(`URGENT OPERATIONAL CALL: ${auth.name} (${auth.designation}), kindly contact Kopargaon Disaster Command HQ immediately.`);
                        }}
                        className="py-1.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title="Send Direct Emergency Page"
                      >
                        <span className="material-symbols-outlined text-sm">notifications</span>
                        <span>Page</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(auth)}
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors"
                        title="Edit Authority Contact"
                      >
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button
                        onClick={() => handleDeleteAuthority(auth.id, auth.name)}
                        className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Delete Officer Record"
                      >
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: EMERGENCY DISPATCH CONSOLE ("Inform Concerned Authorities When Disaster Hits") */}
      {activeSubView === 'emergency-dispatch' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Dispatch Control Form */}
          <div className="lg:col-span-2 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <span className="material-symbols-outlined text-2xl">crisis_alert</span>
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Inform Concerned Authorities When Disaster Hits
                </h3>
                <p className="text-xs text-slate-500">
                  Dispatches CAP emergency mobilization messages directly to respective departmental authorities.
                </p>
              </div>
            </div>

            <form onSubmit={handleTriggerEmergencyDispatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Disaster Hazard</label>
                  <select
                    value={dispatchHazard}
                    onChange={e => setDispatchHazard(e.target.value as HazardType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-bold"
                  >
                    <option value="flood">Flood / River Inundation</option>
                    <option value="drought">Agricultural Drought</option>
                    <option value="heatwave">Extreme Heatwave</option>
                    <option value="unseasonal">Unseasonal Storm / Hail</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Severity Level</label>
                  <select
                    value={dispatchSeverity}
                    onChange={e => setDispatchSeverity(e.target.value as RiskLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-rose-700"
                  >
                    <option value="CRITICAL">CRITICAL (Immediate Action Required)</option>
                    <option value="HIGH">HIGH (Preparedness Alert)</option>
                    <option value="MODERATE">MODERATE (Advisory Notice)</option>
                    <option value="LOW">LOW (Informational)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Impact Zone</label>
                  <select
                    value={dispatchZone}
                    onChange={e => setDispatchZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900"
                  >
                    {ZONES.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Fast Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-500">Quick Event Templates:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchHazard('flood');
                      setDispatchSeverity('CRITICAL');
                      setDispatchZone('zone-bet');
                      setDispatchTrigger('Godavari river gauge reached 492.40m with upstream Gangapur discharge 48,000 cfs.');
                      setDispatchCustomMsg('Stage-2 evacuation declared for Bet Kopargaon. WRD engineers maintain hydro-monitoring, SDRF deploy rescue boats, MSEDCL cut riverside 11kV lines, Health Dept station ambulances at Somaiya Hall.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-800 text-[11px] font-semibold"
                  >
                    🌊 Godavari Flood Inundation
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchHazard('unseasonal');
                      setDispatchSeverity('HIGH');
                      setDispatchZone('zone-rural-north');
                      setDispatchTrigger('Severe hailstorm & 65km/h gale squall reported over Sanjivani-Kolpewadi agricultural belt.');
                      setDispatchCustomMsg('Agriculture Officers initiate rapid crop panchnama survey; Tahsil revenue officers setup compensation desk; MSEDCL restore fallen feeders.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-semibold"
                  >
                    ⛈️ Hailstorm & Crop Damage
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDispatchHazard('heatwave');
                      setDispatchSeverity('HIGH');
                      setDispatchZone('all-taluka');
                      setDispatchTrigger('IMD red advisory: Maximum temperature forecasted to cross 43.5°C with intense Loo winds.');
                      setDispatchCustomMsg('Taluka Health Officer deploy ORS kiosks at Kopargaon Bus Stand and Weekly Market; Municipal tankers supply drinking water to shanties.');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-[11px] font-semibold"
                  >
                    🌡️ 43.5°C Heatwave Warning
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Trigger Event / Sensor Reading</label>
                <input
                  type="text"
                  value={dispatchTrigger}
                  onChange={e => setDispatchTrigger(e.target.value)}
                  placeholder="e.g. River stage 492.35m or Dam discharge 45,000 cfs..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">
                  Action Directives for Respective Authorities
                </label>
                <textarea
                  rows={3}
                  value={dispatchCustomMsg}
                  onChange={e => setDispatchCustomMsg(e.target.value)}
                  placeholder="Specify immediate operational steps for Police, WRD, Health, Fire, and Power departments..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium resize-none"
                  required
                />
              </div>

              {/* Channel Selector */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[11px] font-bold uppercase text-slate-500 block">
                  Dispatch Notification Gateways:
                </span>
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchChannels.sms}
                      onChange={e => setDispatchChannels({ ...dispatchChannels, sms: e.target.checked })}
                      className="accent-rose-600"
                    />
                    <span>Priority SMS Gateway (Gov Route)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchChannels.whatsapp}
                      onChange={e => setDispatchChannels({ ...dispatchChannels, whatsapp: e.target.checked })}
                      className="accent-rose-600"
                    />
                    <span>WhatsApp Enterprise Alert</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchChannels.voice_call}
                      onChange={e => setDispatchChannels({ ...dispatchChannels, voice_call: e.target.checked })}
                      className="accent-rose-600"
                    />
                    <span>Automated Voice Call IVR</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={dispatchChannels.fcm}
                      onChange={e => setDispatchChannels({ ...dispatchChannels, fcm: e.target.checked })}
                      className="accent-rose-600"
                    />
                    <span>FCM Officer Mobile App Push</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md flex items-center justify-center gap-2 transition-all"
              >
                <span className="material-symbols-outlined">send_and_archive</span>
                <span>
                  {actionLoading
                    ? 'Transmitting Priority Dispatch...'
                    : `DISPATCH EMERGENCY MOBILIZATION TO ${matchedConcernedAuthorities.length} CONCERNED AUTHORITIES`}
                </span>
              </button>
            </form>

            {/* Success Receipt */}
            {dispatchSuccessReceipt && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>DISPATCH TRANSMITTED • {dispatchSuccessReceipt.target_authorities?.length || 0} Officers Notified</span>
                </div>
                <p className="text-xs text-emerald-900 font-mono">
                  Receipt ID: {dispatchSuccessReceipt.id} | Timestamp: {new Date(dispatchSuccessReceipt.sent_at).toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>

          {/* Live Matched Authorities Preview Sidebar */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col space-y-4">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center justify-between">
                <span>Concerned Authorities ({matchedConcernedAuthorities.length})</span>
                <span className="text-[11px] font-mono text-rose-600 font-bold">LIVE MATCH</span>
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Officers dynamically filtered by hazard ({dispatchHazard}) and zone responsibility.
              </p>
            </div>

            <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
              {matchedConcernedAuthorities.map(auth => (
                <div
                  key={auth.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-bold text-slate-900 truncate">{auth.name}</span>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 shrink-0">
                      ON DUTY
                    </span>
                  </div>
                  <div className="text-slate-600 text-[11px] truncate">{auth.designation}</div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${auth.phone.replace(/[^0-9+]/g, '')}`}
                        className="inline-flex items-center gap-1 font-mono font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-lg border border-emerald-200 transition-colors"
                        title="Tap to direct dial officer"
                      >
                        <span className="material-symbols-outlined text-xs">call</span>
                        <span>{auth.phone}</span>
                      </a>
                      <a
                        href={`https://wa.me/${auth.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded-lg bg-white text-emerald-600 hover:bg-emerald-50 border border-slate-200 transition-colors"
                        title="WhatsApp"
                      >
                        <span className="material-symbols-outlined text-xs">chat</span>
                      </a>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate max-w-[90px]">{auth.department.split(' ')[0]}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: CENTRAL-BASED PUBLIC BROADCAST HUB ("Concerned Authority Central Notification") */}
      {activeSubView === 'central-broadcast' && (
        <div className="max-w-3xl mx-auto bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-600">
              <span className="material-symbols-outlined text-3xl">broadcast_on_home</span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-900">
                Central-Based Public Disaster Broadcast
              </h3>
              <p className="text-xs text-slate-500">
                Authorized broadcast transmittal sent by the concerned authority to all citizens and nodal responders across Taluka.
              </p>
            </div>
          </div>

          <form onSubmit={handleSendCentralBroadcast} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Hazard Type</label>
                <select
                  value={centralHazard}
                  onChange={e => setCentralHazard(e.target.value as HazardType)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-bold"
                >
                  <option value="flood">Flood</option>
                  <option value="drought">Drought</option>
                  <option value="heatwave">Heatwave</option>
                  <option value="unseasonal">Unseasonal Storm</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Severity Level</label>
                <select
                  value={centralSeverity}
                  onChange={e => setCentralSeverity(e.target.value as RiskLevel)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-rose-700"
                >
                  <option value="CRITICAL">CRITICAL (Direct Evacuation)</option>
                  <option value="HIGH">HIGH (Preparedness Warning)</option>
                  <option value="MODERATE">MODERATE (Advisory)</option>
                  <option value="LOW">LOW (Informational)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Jurisdiction Zone</label>
                <select
                  value={centralZone}
                  onChange={e => setCentralZone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900"
                >
                  {ZONES.map(z => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">
                Issuing Officer Designation
              </label>
              <input
                type="text"
                value={authorDesignation}
                onChange={e => setAuthorDesignation(e.target.value)}
                placeholder="e.g. Sub-Divisional Magistrate (SDM) / Tahsildar / Executive Engineer WRD"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">
                English Broadcast Notice
              </label>
              <textarea
                rows={2}
                value={centralEn}
                onChange={e => setCentralEn(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium resize-none"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">
                मराठी आपत्ती संदेश (Marathi Notice)
              </label>
              <textarea
                rows={2}
                value={centralMr}
                onChange={e => setCentralMr(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium resize-none"
                required
              />
            </div>

            {/* Broadcast Media Checkboxes */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <span className="text-xs font-bold uppercase text-slate-600 block">
                Synchronized Broadcast Channels:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-slate-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={centralChannels.app_banner}
                    onChange={e => setCentralChannels({ ...centralChannels, app_banner: e.target.checked })}
                    className="accent-sky-600"
                  />
                  <span>Citizen App Red Banner & Modal</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={centralChannels.push_fcm}
                    onChange={e => setCentralChannels({ ...centralChannels, push_fcm: e.target.checked })}
                    className="accent-sky-600"
                  />
                  <span>FCM Mobile Push Notifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={centralChannels.cell_sms}
                    onChange={e => setCentralChannels({ ...centralChannels, cell_sms: e.target.checked })}
                    className="accent-sky-600"
                  />
                  <span>Cell Broadcast Geo-fenced SMS</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={centralChannels.sirens}
                    onChange={e => setCentralChannels({ ...centralChannels, sirens: e.target.checked })}
                    className="accent-rose-600"
                  />
                  <span className="font-bold text-rose-700">Municipal Acoustic Warning Sirens</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-sky-600 hover:bg-sky-700 active:scale-95 shadow-md flex items-center justify-center gap-2 transition-all"
            >
              <span className="material-symbols-outlined">campaign</span>
              <span>{actionLoading ? 'Broadcasting to Citizen Feeds & Responders...' : 'TRANSMIT CENTRAL BROADCAST'}</span>
            </button>
          </form>
        </div>
      )}

      {/* VIEW 4: DISASTER DISPATCH AUDIT LOGS */}
      {activeSubView === 'dispatch-logs' && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-rose-600">history_toggle_off</span>
              <span>Emergency Dispatch & Mobilization Audit Log</span>
            </h3>
            <span className="text-xs font-mono text-slate-500">
              Showing {dispatchLogs.length} recent dispatches
            </span>
          </div>

          {dispatchLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs font-mono">
              No disaster mobilization dispatches recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {dispatchLogs.map(log => (
                <div
                  key={log.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        log.severity === 'CRITICAL'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.severity} • {log.disaster_hazard}
                      </span>
                      <span className="text-xs font-mono text-slate-600 font-semibold">
                        Zone: {log.zone_id.replace('zone-', '').toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono text-slate-500">
                      {new Date(log.sent_at).toLocaleString()}
                    </div>
                  </div>

                  <div className="text-xs font-bold text-slate-800">
                    Trigger: <span className="font-medium text-slate-700">{log.trigger_event}</span>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 font-medium">
                    "{log.message_sent}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-700">Notified Officers ({log.target_authorities?.length || 0}):</span>
                      <span className="font-mono text-slate-600">
                        {log.target_authorities?.map(t => t.name).slice(0, 3).join(', ')}
                        {(log.target_authorities?.length || 0) > 3 ? ` +${(log.target_authorities?.length || 0) - 3} more` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-700 font-bold">DELIVERED</span>
                      <span className="text-slate-400">Initiated by: {log.initiated_by}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADD / EDIT AUTHORITY MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl my-8 flex flex-col"
            >
              <div className="px-6 py-4 bg-sky-50 border-b border-sky-200 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sky-800 font-bold text-base">
                  <span className="material-symbols-outlined">badge</span>
                  <span>{editingAuth ? 'Edit Authority Contact Profile' : 'Add Respective Authority'}</span>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="w-8 h-8 rounded-full bg-sky-100 hover:bg-sky-200 text-sky-800 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              </div>

              <form onSubmit={handleSaveAuthority} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Officer Name *</label>
                    <input
                      type="text"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Dr. Rajesh Shinde (IAS)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Official Designation *</label>
                    <input
                      type="text"
                      value={formDesignation}
                      onChange={e => setFormDesignation(e.target.value)}
                      placeholder="e.g. Sub-Divisional Magistrate (SDM)"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Department *</label>
                    <select
                      value={formDepartment}
                      onChange={e => setFormDepartment(e.target.value as AuthorityDepartment)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Jurisdiction Zone</label>
                    <select
                      value={formZone}
                      onChange={e => setFormZone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                    >
                      {ZONES.map(z => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Primary Contact Phone *</label>
                    <input
                      type="tel"
                      value={formPhone}
                      onChange={e => setFormPhone(e.target.value)}
                      placeholder="+91-94220-XXXXX"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Emergency Hotline / Control Room</label>
                    <input
                      type="text"
                      value={formEmergencyPhone}
                      onChange={e => setFormEmergencyPhone(e.target.value)}
                      placeholder="e.g. 1077 / 02423-222333"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-mono font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Official Email *</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={e => setFormEmail(e.target.value)}
                      placeholder="officer@maharashtra.gov.in"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Responsible Hazard Domain</label>
                    <select
                      value={formHazard}
                      onChange={e => setFormHazard(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                    >
                      <option value="all">All Hazards (Taluka Disaster Management)</option>
                      <option value="flood">Flood & Dam Outflow Specialist</option>
                      <option value="drought">Drought & Water Scarcity</option>
                      <option value="heatwave">Heatwave & Medical Relief</option>
                      <option value="unseasonal">Unseasonal Rain & Crop Protection</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Readiness Status</label>
                    <select
                      value={formStatus}
                      onChange={e => setFormStatus(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-900"
                    >
                      <option value="on_duty">ON DUTY (Instant Dispatch)</option>
                      <option value="active">ACTIVE (Available)</option>
                      <option value="standby">STANDBY (Reserve)</option>
                      <option value="off_duty">OFF DUTY</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Operational Notes</label>
                    <input
                      type="text"
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="e.g. Lead for SDRF boats, shelter food logistics..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-900">
                      <span className="material-symbols-outlined text-base text-amber-700">key</span>
                      <span>Concern Authority Login Credentials & Role Tier</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = formDepartment.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'officer';
                        setFormLoginUsername(`${prefix}.${Math.floor(100 + Math.random() * 900)}`);
                        setFormLoginPassword(`${prefix}@${Math.floor(1000 + Math.random() * 9000)}`);
                      }}
                      className="text-[11px] font-bold text-amber-800 hover:text-amber-950 underline"
                    >
                      Auto-generate Info
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">Login Username *</label>
                      <input
                        type="text"
                        value={formLoginUsername}
                        onChange={e => setFormLoginUsername(e.target.value)}
                        placeholder="e.g. wrd.godavari or police.kopargaon"
                        className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">Login Password / Secret Key *</label>
                      <input
                        type="text"
                        value={formLoginPassword}
                        onChange={e => setFormLoginPassword(e.target.value)}
                        placeholder="e.g. wrd@2026 or police@112"
                        className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">System Access Level</label>
                      <select
                        value={formAccessLevel}
                        onChange={e => setFormAccessLevel(e.target.value as any)}
                        className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium"
                      >
                        <option value="operational_field">Operational Field Unit (Below Admin HQ)</option>
                        <option value="department_head">Department Nodal Head</option>
                        <option value="sub_admin">Sub-Admin (Disaster Desk)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-slate-700 mb-1 block">Account Role</label>
                      <select
                        value={formRole}
                        onChange={e => setFormRole(e.target.value as any)}
                        className="w-full bg-white border border-amber-200 rounded-xl p-2.5 text-xs text-slate-900 font-medium"
                      >
                        <option value="concerned_authority">Concerned Authority (Sub-Admin)</option>
                        <option value="admin">SDM Master Admin (Full Control)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="text-xs font-bold uppercase text-slate-600 block">
                    Enabled Alert Gateways for this Officer:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-medium text-slate-700">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.sms}
                        onChange={e => setFormChannels({ ...formChannels, sms: e.target.checked })}
                        className="accent-sky-600"
                      />
                      <span>SMS Gateway</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.whatsapp}
                        onChange={e => setFormChannels({ ...formChannels, whatsapp: e.target.checked })}
                        className="accent-sky-600"
                      />
                      <span>WhatsApp API</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.voice_call}
                        onChange={e => setFormChannels({ ...formChannels, voice_call: e.target.checked })}
                        className="accent-sky-600"
                      />
                      <span>Automated Voice Call</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.email}
                        onChange={e => setFormChannels({ ...formChannels, email: e.target.checked })}
                        className="accent-sky-600"
                      />
                      <span>Official Email</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formChannels.central_broadcast}
                        onChange={e => setFormChannels({ ...formChannels, central_broadcast: e.target.checked })}
                        className="accent-sky-600"
                      />
                      <span>Central Broadcast</span>
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="py-3 px-6 rounded-2xl font-bold text-xs text-white bg-sky-600 hover:bg-sky-700 active:scale-95 shadow-md flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>{actionLoading ? 'Saving...' : editingAuth ? 'Update Authority Profile' : 'Save Authority Officer'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIRECT PAGE MODAL */}
      <AnimatePresence>
        {directPageTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                  <span className="material-symbols-outlined">notifications_active</span>
                  <span>Direct Emergency Page: {directPageTarget.name}</span>
                </div>
                <button
                  onClick={() => setDirectPageTarget(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">{directPageTarget.designation}</div>
                <div className="text-slate-600">{directPageTarget.department}</div>
                <div className="font-mono text-slate-700 font-semibold">{directPageTarget.phone}</div>
              </div>

              <form onSubmit={handleDirectPageSubmit} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-600 mb-1 block">Emergency Directive Message</label>
                  <textarea
                    rows={3}
                    value={directPageMsg}
                    onChange={e => setDirectPageMsg(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 font-medium resize-none"
                    required
                  />
                </div>

                <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-emerald-600">verified</span>
                  <span>Will dispatch priority SMS, WhatsApp, and voice IVR notification directly to this officer.</span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDirectPageTarget(null)}
                    className="py-2 px-3 rounded-xl text-xs font-bold text-slate-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="py-2.5 px-5 rounded-2xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 active:scale-95 shadow-md flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">send</span>
                    <span>{actionLoading ? 'Paging...' : 'PAGE OFFICER NOW'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
