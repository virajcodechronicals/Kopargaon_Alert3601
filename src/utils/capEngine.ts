// Common Alerting Protocol (CAP v1.2) Serialization Engine
// Compliant with NDMA SACHET / CDAC Standard schemas for Kopargaon Disaster Cell

export interface CAPAlertData {
  identifier: string;
  sender: string;
  sentTime: string; // ISO 8601 string
  status: 'Actual' | 'Exercise' | 'System' | 'Test';
  msgType: 'Alert' | 'Update' | 'Cancel';
  scope: 'Public' | 'Restricted' | 'Private';
  hazard: string;
  severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor';
  urgency: 'Immediate' | 'Expected' | 'Future' | 'Past';
  certainty: 'Observed' | 'Likely' | 'Possible' | 'Unlikely';
  headlineEn: string;
  descriptionEn: string;
  headlineMr: string;
  descriptionMr: string;
  instructionEn?: string;
  instructionMr?: string;
  areaDesc: string;
  polygon?: string;
  coordinates?: { lat: number; lng: number };
}

export function generateCapXml(data: CAPAlertData): string {
  const sentISO = data.sentTime || new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${data.identifier}</identifier>
  <sender>${data.sender || 'Kopargaon.DDMA.Ahilyanagar@maharashtra.gov.in'}</sender>
  <sent>${sentISO}</sent>
  <status>${data.status}</status>
  <msgType>${data.msgType}</msgType>
  <scope>${data.scope}</scope>
  <code>NDMA_SACHET_V1.2</code>
  <info>
    <language>en-US</language>
    <category>Safety</category>
    <event>${data.hazard.toUpperCase()} EARLY WARNING</event>
    <urgency>${data.urgency}</urgency>
    <severity>${data.severity}</severity>
    <certainty>${data.certainty}</certainty>
    <eventCode>
      <valueName>SAME</valueName>
      <value>${data.hazard.toUpperCase()}</value>
    </eventCode>
    <headline>${escapeXml(data.headlineEn)}</headline>
    <description>${escapeXml(data.descriptionEn)}</description>
    ${data.instructionEn ? `<instruction>${escapeXml(data.instructionEn)}</instruction>` : ''}
    <web>https://kopargaon-alert360.gov.in</web>
    <contact>Kopargaon Emergency Operation Center (EOC) - 02423-222200</contact>
    <area>
      <areaDesc>${escapeXml(data.areaDesc)}</areaDesc>
      ${data.polygon ? `<polygon>${data.polygon}</polygon>` : '<circle>19.8912,74.4789,15000</circle>'}
    </area>
  </info>
  <info>
    <language>mr-IN</language>
    <category>Safety</category>
    <event>${data.hazard.toUpperCase()} आपत्कालीन इशारा</event>
    <urgency>${data.urgency}</urgency>
    <severity>${data.severity}</severity>
    <certainty>${data.certainty}</certainty>
    <headline>${escapeXml(data.headlineMr)}</headline>
    <description>${escapeXml(data.descriptionMr)}</description>
    ${data.instructionMr ? `<instruction>${escapeXml(data.instructionMr)}</instruction>` : ''}
    <area>
      <areaDesc>कोपरगाव तालुका, गोदावरी नदीकाठ व नजीकचा परिसर</areaDesc>
    </area>
  </info>
</alert>`;
}

export function generateCapJson(data: CAPAlertData): Record<string, any> {
  return {
    cap_version: '1.2',
    ndma_sachet_compliant: true,
    identifier: data.identifier,
    sender: data.sender || 'Kopargaon.DDMA@maharashtra.gov.in',
    sent: data.sentTime || new Date().toISOString(),
    status: data.status,
    msgType: data.msgType,
    scope: data.scope,
    info: [
      {
        language: 'en-US',
        category: 'Safety',
        event: `${data.hazard.toUpperCase()} WARNING`,
        urgency: data.urgency,
        severity: data.severity,
        certainty: data.certainty,
        headline: data.headlineEn,
        description: data.descriptionEn,
        instruction: data.instructionEn || 'Evacuate to designated relief shelters immediately.',
        area: {
          areaDesc: data.areaDesc,
          polygon: data.polygon || '19.898,74.460 19.891,74.478 19.882,74.505'
        }
      },
      {
        language: 'mr-IN',
        category: 'Safety',
        event: `${data.hazard.toUpperCase()} आपत्कालीन इशारा`,
        urgency: data.urgency,
        severity: data.severity,
        certainty: data.certainty,
        headline: data.headlineMr,
        description: data.descriptionMr,
        instruction: data.instructionMr || 'तातडीने सुरक्षित स्थळी / सोमय्या हॉल निवाऱ्यामध्ये जा.',
        area: {
          areaDesc: 'कोपरगाव तालुका आणि गोदावरी परिसर'
        }
      }
    ]
  };
}

export function downloadCapXml(data: CAPAlertData) {
  const xmlContent = generateCapXml(data);
  const blob = new Blob([xmlContent], { type: 'application/xml;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `CAP-ALERT-KOPARGAON-${data.identifier}.xml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function copyCapJson(data: CAPAlertData): Promise<void> {
  const jsonObject = generateCapJson(data);
  return navigator.clipboard.writeText(JSON.stringify(jsonObject, null, 2));
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
