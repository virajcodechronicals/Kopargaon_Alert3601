export type Language = 'en' | 'mr';

export type UserRole = 'citizen' | 'authority' | 'responder';

export type HazardType = 'flood' | 'drought' | 'heatwave' | 'unseasonal';

export type RiskLevel = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface LiveTelemetry {
  source: string;
  coordinates: { lat: number; lng: number };
  temperature_c: number;
  relative_humidity_pct: number;
  apparent_temperature_c: number;
  precipitation_mm: number;
  rain_mm: number;
  wind_speed_kmh: number;
  fetched_at: string;
}

export interface StructuredAIPrediction {
  overallRiskLevel: RiskLevel;
  riskScore: number;
  primaryThreat: string;
  estimatedImpactTime: string;
  vulnerableAreas: string[];
  recommendedActions: string[];
  evacuationRequired: boolean;
  alertHeadlineMarathi: string;
  modelReasoning?: string;
}

export interface NormalizedTelemetry {
  value: number | string;
  unit: string;
  source: string;
  fetched_at: string;
  confidence: number;
}

export interface RiskPrediction {
  zone_id: string;
  hazard_type: HazardType;
  risk_level: RiskLevel;
  risk_score: number;
  eta_peak: string;
  model_reasoning: string;
  created_at: string;
  source: string;
  fetched_at: string;
  confidence: number;
}

export interface HazardRisk {
  hazard: HazardType;
  level: RiskLevel;
  telemetry: NormalizedTelemetry;
  prediction?: RiskPrediction; // Optional because we append this layer
}

export interface EmergencyContact {
  role: string;
  name: string;
  phone: string;
}

export interface Shelter {
  id: string;
  name: string;
  name_mr?: string;
  location: { lat: number; lng: number };
  capacity: number;
  current_occupancy: number;
  status: 'standby' | 'activated';
  address?: string;
  phone?: string;
}

export interface Alert {
  id: string;
  zone_id: string;
  hazard: HazardType;
  severity: RiskLevel;
  message_en: string;
  message_mr: string;
  created_at: string;
  published?: boolean;
}

export type AuthorityDepartment =
  | 'Administration & Revenue'
  | 'Water Resources & Irrigation'
  | 'Disaster Management & SDRF'
  | 'Police & Public Safety'
  | 'Health & Medical Services'
  | 'Fire Brigade & Water Rescue'
  | 'Agriculture & Krishi'
  | 'MSEDCL & Power Grid'
  | 'Municipal Administration'
  | 'NGO & Volunteer Relief';

export interface AuthorityContact {
  id: string;
  name: string;
  designation: string;
  department: AuthorityDepartment | string;
  phone: string;
  emergency_phone?: string;
  email: string;
  zone_id: string; // 'all-taluka' | 'zone-bet' | 'zone-market' | 'zone-rural-north' | 'zone-rural-south'
  hazard_responsibility: HazardType | 'all';
  status: 'active' | 'on_duty' | 'standby' | 'off_duty';
  login_username?: string;
  login_password?: string;
  role?: 'concerned_authority' | 'admin';
  access_level?: 'sub_admin' | 'operational_field' | 'department_head';
  notify_channels: {
    sms: boolean;
    whatsapp: boolean;
    voice_call: boolean;
    email: boolean;
    central_broadcast: boolean;
  };
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthorityActionItem {
  id: string;
  dispatch_id: string;
  authority_id: string;
  authority_name: string;
  designation: string;
  department: string;
  phone: string;
  hazard: HazardType;
  zone_id: string;
  action_title: string;
  action_title_mr: string;
  status: 'acknowledged' | 'action_taken' | 'in_field';
  timestamp: string;
}

export interface DisasterDispatchLog {
  id: string;
  disaster_hazard: HazardType;
  severity: RiskLevel;
  zone_id: string;
  trigger_event: string;
  target_authorities: {
    authority_id: string;
    name: string;
    designation: string;
    department: string;
    phone: string;
    channels: string[];
    status: 'sent' | 'delivered' | 'acknowledged' | 'action_taken';
    action_note?: string;
    action_timestamp?: string;
  }[];
  message_sent: string;
  channels: string[];
  sent_at: string;
  initiated_by: string;
}

export interface CentralBroadcastPayload {
  hazard: HazardType;
  severity: RiskLevel;
  zone_id: string;
  author_id?: string;
  author_name?: string;
  author_designation?: string;
  message_en: string;
  message_mr: string;
  channels: {
    app_banner: boolean;
    push_fcm: boolean;
    cell_sms: boolean;
    sirens: boolean;
    voice_tts: boolean;
  };
  evacuation_shelters?: string[];
  urgency_action?: string;
}
