import { AuthorityDepartment, HazardType } from '../types';

export interface DomainActionResource {
  boats?: number;
  volunteers?: number;
  teams?: number;
  vehicles?: number;
  pumps?: number;
  tankers?: number;
  food_packets?: number;
  divers?: number;
  linemen?: number;
  ambulances?: number;
  tarpaulins?: number;
  sandbags?: number;
}

export interface DomainActionTemplate {
  id: string;
  department: AuthorityDepartment | string;
  hazard: HazardType | 'all';
  title_en: string;
  title_mr: string;
  description_en: string;
  description_mr: string;
  category: 'rescue' | 'evacuation' | 'medical' | 'infrastructure' | 'agriculture' | 'relief_shelter' | 'law_order' | 'power';
  icon: string;
  badge_color: string;
  default_resources: DomainActionResource;
  recommended_zone: string;
}

export const DOMAIN_ACTION_TEMPLATES: DomainActionTemplate[] = [
  // 1. WATER RESOURCES & IRRIGATION
  {
    id: 'wrd-deploy-boats-volunteers',
    department: 'Water Resources & Irrigation',
    hazard: 'flood',
    title_en: 'Deploy Safety Boats & Rescue Volunteers at Godavari Old Bridge & Bet Ghats',
    title_mr: 'गोदावरी जुन्या पुलावर व बेट घाटावर आपत्कालीन बचाव बोटी व पूर स्वयंसेवक पथक तैनात करा',
    description_en: 'Position motorized inspection boats, deploy local swimmer volunteers, and monitor Godavari river level (Warning stage: 492.3m).',
    description_mr: 'गोदावरी नदीकाठी मोटार बोट सज्ज ठेवून स्थानिक पट्टीच्या पोहणाऱ्या स्वयंसेवकांची बचाव तुकडी तैनात केली.',
    category: 'rescue',
    icon: 'sailing',
    badge_color: 'bg-blue-600',
    default_resources: { boats: 4, volunteers: 16, divers: 8 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'wrd-dam-discharge-coordination',
    department: 'Water Resources & Irrigation',
    hazard: 'flood',
    title_en: 'Coordinate Dam Discharges & Sluice Gate Control (Gangapur & Darna)',
    title_mr: 'गंगापूर व दारणा धरणातील विसर्ग समन्वय व कालवा दरवाजे नियंत्रण',
    description_en: 'Maintain 24x7 hydro-telemetry liaison with upstream dams; close vulnerable sluice gates to avoid residential backwater ingress.',
    description_mr: 'धरण नियंत्रण कक्षाशी थेट संपर्क ठेवून विसर्ग नियंत्रित केला व सखल भागातील विमोचक दरवाजे बंद केले.',
    category: 'infrastructure',
    icon: 'water_ec',
    badge_color: 'bg-cyan-600',
    default_resources: { teams: 2, volunteers: 6 },
    recommended_zone: 'all-taluka'
  },
  {
    id: 'wrd-sandbag-embankment',
    department: 'Water Resources & Irrigation',
    hazard: 'flood',
    title_en: 'Erect Emergency Sandbag Bunds along Low-Lying River Embankments',
    title_mr: 'नदीकाठच्या सखल भागात वाळूच्या गोणींचे तात्पुरते संरक्षक बंधारे उभारणे',
    description_en: 'Mobilize volunteer workforce to fortify riverbank crest with 1,200 heavy sandbags to prevent bank overflow.',
    description_mr: 'नदीचे पाणी वस्तीत शिरू नये म्हणून स्वयंसेवकांच्या मदतीने वाळूच्या गोणींचे संरक्षक बंधारे उभारले.',
    category: 'infrastructure',
    icon: 'layers',
    badge_color: 'bg-indigo-600',
    default_resources: { sandbags: 1200, volunteers: 30, teams: 3 },
    recommended_zone: 'zone-bet'
  },

  // 2. FIRE BRIGADE & WATER RESCUE
  {
    id: 'fire-deploy-swiftwater-boats',
    department: 'Fire Brigade & Water Rescue',
    hazard: 'flood',
    title_en: 'Deploy Motorized Swift-Water Rescue Boats & Dive Volunteers',
    title_mr: 'मोटार बचाव बोटी, लाईफ जॅकेट्स व जीवरक्षक स्वयंसेवक पथक तैनात करा',
    description_en: 'Dispatch 6 heavy rescue craft, lifebuoys, certified divers, and civil defense rescue squads along Bet Kopargaon riverbanks.',
    description_mr: 'बेट कोपरगाव नदीपात्रात ६ बचाव बोटी, लाईफ जॅकेट्स व जीवरक्षक स्वयंसेवक पथक सज्ज ठेवले.',
    category: 'rescue',
    icon: 'directions_boat',
    badge_color: 'bg-rose-600',
    default_resources: { boats: 6, volunteers: 24, divers: 12 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'fire-deploy-dewatering-pumps',
    department: 'Fire Brigade & Water Rescue',
    hazard: 'flood',
    title_en: 'Deploy High-Capacity Submersible Dewatering Pumps in Submerged Wards',
    title_mr: 'पाण्याखाली गेलेल्या प्रभागांमध्ये अतिउच्च क्षमतेचे पाण्याचे उपसा पंप तैनात करा',
    description_en: 'Operate high-discharge pumps to drain waterlogged residential streets, basements, and public utilities.',
    description_mr: 'नागरी वस्त्या व मुख्य रस्त्यांवर साचलेले पूरपाणी काढण्यासाठी हाय-कॅपॅसिटी पंप सुरू केले.',
    category: 'rescue',
    icon: 'mode_fan',
    badge_color: 'bg-red-600',
    default_resources: { pumps: 8, volunteers: 14, teams: 4 },
    recommended_zone: 'zone-market'
  },
  {
    id: 'fire-clear-fallen-trees-storm',
    department: 'Fire Brigade & Water Rescue',
    hazard: 'unseasonal',
    title_en: 'Clear Storm-Fell Trees, Poles & Unblock Emergency Evacuation Corridors',
    title_mr: 'वादळामुळे पडलेली झाडे व खांब हटवून आपत्कालीन वाहतूक मार्ग मोकळा करा',
    description_en: 'Rapid obstacle clearance squads equipped with power saws to keep hospital and shelter routes unobstructed.',
    description_mr: 'रस्त्यावरील पडलेली झाडे व अडथळे त्वरित दूर करून ॲम्ब्युलन्स व मदत कार्यासाठी रस्ते मोकळे केले.',
    category: 'rescue',
    icon: 'handyman',
    badge_color: 'bg-orange-600',
    default_resources: { teams: 4, vehicles: 3, volunteers: 15 },
    recommended_zone: 'all-taluka'
  },

  // 3. POLICE & PUBLIC SAFETY
  {
    id: 'police-barricade-old-bridge',
    department: 'Police & Public Safety',
    hazard: 'flood',
    title_en: 'Barricade Godavari Old Bridge & Enforce Traffic Diversion to Bypass',
    title_mr: 'गोदावरी जुन्या पुलावर कडक बॅरिकेडिंग करून वाहतूक नवीन बायपास पुलावरून वळवा',
    description_en: 'Erect steel road barricades, post 24x7 traffic constables and youth traffic wardens to prevent bridge crossings during high flood stage.',
    description_mr: 'पूर पातळी वाढल्याने जुन्या पुलाची वाहतूक पूर्ण बंद करून नवीन बायपास पुलावरून वळवण्यात आली.',
    category: 'law_order',
    icon: 'traffic',
    badge_color: 'bg-amber-600',
    default_resources: { teams: 4, volunteers: 15, vehicles: 3 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'police-mobile-loudspeakers',
    department: 'Police & Public Safety',
    hazard: 'flood',
    title_en: 'Deploy Mobile Loudspeaker Vehicles for Evacuation Announcements',
    title_mr: 'फिरत्या पोलीस वाहनांमधून ध्वनिक्षेपकाद्वारे सुरक्षित स्थलांतराच्या सूचना द्या',
    description_en: 'Patrol riverside slums and ghats with sirens & PA systems urging citizens to relocate before water levels peak.',
    description_mr: 'नदीकाठच्या वस्त्यांमध्ये लाऊडस्पीकरद्वारे नागरिकांना सतर्कतेचा व स्थलांतराचा इशारा दिला.',
    category: 'law_order',
    icon: 'campaign',
    badge_color: 'bg-blue-700',
    default_resources: { vehicles: 5, volunteers: 10 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'police-anti-looting-patrols',
    department: 'Police & Public Safety',
    hazard: 'flood',
    title_en: 'Station Night Vigil & Anti-Theft Security Patrols in Evacuated Colonies',
    title_mr: 'स्थलांतरित पूरग्रस्त भागांमध्ये चोरी रोखण्यासाठी २४ तास रात्र गस्त पथक तैनात करा',
    description_en: 'Provide continuous security protection to citizens’ locked homes and commercial shops in inundated areas.',
    description_mr: 'स्थलांतरित नागरिकांच्या घरांचे व दुकानांचे रक्षण करण्यासाठी रात्रंदिवस पोलीस गस्त सुरू केली.',
    category: 'law_order',
    icon: 'security',
    badge_color: 'bg-slate-800',
    default_resources: { teams: 6, vehicles: 4, volunteers: 12 },
    recommended_zone: 'zone-market'
  },

  // 4. HEALTH & MEDICAL SERVICES
  {
    id: 'health-deploy-ambulances-relief-camp',
    department: 'Health & Medical Services',
    hazard: 'flood',
    title_en: 'Deploy 108 Advanced Ambulances & First-Aid Trauma Posts at Shelters',
    title_mr: '१०८ ॲम्ब्युलन्स व प्राथमिक प्रथमोपचार पथक सोमय्या मदत केंद्रावर तैनात करा',
    description_en: 'Station medical officers, emergency nursing staff, essential trauma drugs, and emergency transport units at relief centers.',
    description_mr: 'पूर मदत केंद्रात डॉक्टर, औषधे व १०८ रुग्णवाहिका २४ तास सेवेसाठी तैनात केल्या.',
    category: 'medical',
    icon: 'emergency',
    badge_color: 'bg-emerald-600',
    default_resources: { ambulances: 5, teams: 4, volunteers: 20 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'health-heatstroke-cold-wards',
    department: 'Health & Medical Services',
    hazard: 'heatwave',
    title_en: 'Set Up Cold-Room Heatstroke Wards & ORS Booths at Bus Stand & Mandis',
    title_mr: 'बसस्थानक व बाजारपेठेत उष्माघात विशेष शीतकक्ष व ओआरएस वाटप केंद्र सुरू करा',
    description_en: 'Equip cooling centers with ice packs, IV rehydration fluids, electrolyte drinks, and volunteer health monitors.',
    description_mr: 'उष्माघातापासून बचावासाठी शीतकक्ष, ओआरएस व थंड पाण्याची मोफत केंद्रे सुरू केली.',
    category: 'medical',
    icon: 'severe_cold',
    badge_color: 'bg-teal-600',
    default_resources: { teams: 6, volunteers: 25 },
    recommended_zone: 'zone-market'
  },
  {
    id: 'health-water-chlorination-drive',
    department: 'Health & Medical Services',
    hazard: 'flood',
    title_en: 'Conduct Mass Water Chlorination & Epidemic Prevention Tablet Distribution',
    title_mr: 'पिण्याच्या पाण्याचे शुद्धीकरण, क्लोरीन गोळ्या वाटप व साथीचे रोग प्रतिबंधक मोहीम',
    description_en: 'Disinfect municipal water supply wells, test water samples for coliform, and distribute halogen water purification tablets.',
    description_mr: 'दूषित पाण्यामुळे होणारे रोग टाळण्यासाठी क्लोरीन गोळ्यांचे वाटप व विहिरींचे निर्जंतुकीकरण केले.',
    category: 'medical',
    icon: 'vaccines',
    badge_color: 'bg-emerald-700',
    default_resources: { teams: 8, volunteers: 30 },
    recommended_zone: 'all-taluka'
  },

  // 5. ADMINISTRATION & REVENUE / TAHSILDAR
  {
    id: 'admin-activate-somaiya-shelter',
    department: 'Administration & Revenue',
    hazard: 'flood',
    title_en: 'Activate K.J. Somaiya Relief Shelter with Hot Meals & Clean Bedding',
    title_mr: 'सोमय्या कॉलेज हॉल मदत केंद्र सुरू करून मोफत जेवण व निवाऱ्याची सोय करा',
    description_en: 'Open multi-hall shelter for 1,200 displaced citizens with community kitchen, drinking water, generators, and sanitized washrooms.',
    description_mr: 'पूरग्रस्तांसाठी सोमय्या हॉलमध्ये अन्नछत्र, स्वच्छ पिण्याचे पाणी व निवाऱ्याची व्यवस्था सुरू केली.',
    category: 'relief_shelter',
    icon: 'night_shelter',
    badge_color: 'bg-purple-600',
    default_resources: { food_packets: 2000, volunteers: 35, teams: 4 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'admin-mobilize-disaster-volunteers',
    department: 'Administration & Revenue',
    hazard: 'all',
    title_en: 'Mobilize Taluka Disaster Volunteer Brigades (NCC/NSS/Youth Clubs)',
    title_mr: 'तालुका आपत्ती निवारण स्वयंसेवक ब्रिगेड व एनसीसी/एनएसएस तरुणांची नेमणूक करा',
    description_en: 'Register and assign field tasks to 100+ vetted local youth volunteers for food distribution, escorting elderly, and logistics.',
    description_mr: 'मदत व बचाव कार्यासाठी १००+ स्थानिक तरुण स्वयंसेवकांची नोंदणी करून पथके नेमली.',
    category: 'relief_shelter',
    icon: 'diversity_3',
    badge_color: 'bg-indigo-700',
    default_resources: { volunteers: 80, teams: 8 },
    recommended_zone: 'all-taluka'
  },
  {
    id: 'admin-issue-section-144-advisory',
    department: 'Administration & Revenue',
    hazard: 'flood',
    title_en: 'Issue Prohibitory Orders (Sec 144) around Flooded Riverbanks & Ghats',
    title_mr: 'गोदावरी नदीकाठी गर्दी रोखण्यासाठी प्रतिबंधात्मक आदेश (कलम १४४) लागू करा',
    description_en: 'Ban recreational gathering, swimming, and selfie-taking along swollen river banks under Disaster Management Act.',
    description_mr: 'नदीपात्रात पोहण्यास व गर्दी करण्यास प्रतिबंध करणारे आपत्कालीन आदेश जारी केले.',
    category: 'law_order',
    icon: 'gavel',
    badge_color: 'bg-slate-900',
    default_resources: { teams: 4, volunteers: 10 },
    recommended_zone: 'zone-bet'
  },

  // 6. AGRICULTURE & KRISHI DEPARTMENT
  {
    id: 'agri-crop-loss-panchnama-teams',
    department: 'Agriculture & Krishi',
    hazard: 'unseasonal',
    title_en: 'Deploy Drone & Ground Survey Teams for Rapid Crop Damage Panchnama',
    title_mr: 'अवेळी पाऊस व गारपिटीच्या पीक नुकसानीसाठी ड्रोन व पंचनामा पथके पाठवा',
    description_en: 'Dispatch 8 Talathi & Krishi Sahayak teams to assess sugarcane, onion, and pomegranate losses across Kolpewadi & Sanjivani belt.',
    description_mr: 'शेतकऱ्यांच्या पिकांचे पंचनामे करण्यासाठी ड्रोन व कृषी अधिकारी पथके रवाना केली.',
    category: 'agriculture',
    icon: 'agriculture',
    badge_color: 'bg-lime-700',
    default_resources: { teams: 8, vehicles: 4, volunteers: 16 },
    recommended_zone: 'zone-rural-north'
  },
  {
    id: 'agri-distribute-tarpaulins-apmc',
    department: 'Agriculture & Krishi',
    hazard: 'unseasonal',
    title_en: 'Distribute Waterproof Tarpaulins for APMC Grain Mandis & Onion Storage',
    title_mr: 'बाजार समितीतील शेतमाल व कांदा चाळींच्या संरक्षणासाठी ताडपत्री वाटप करा',
    description_en: 'Supply 600 heavy-duty plastic sheets to farmers to prevent harvest rotting during unexpected rains.',
    description_mr: 'बाजार समितीत शेतमाल भिजण्यापासून वाचवण्यासाठी ताडपत्रीचे तातडीने वाटप केले.',
    category: 'agriculture',
    icon: 'roofing',
    badge_color: 'bg-green-700',
    default_resources: { tarpaulins: 600, volunteers: 20 },
    recommended_zone: 'zone-market'
  },
  {
    id: 'agri-fodder-camp-drought',
    department: 'Agriculture & Krishi',
    hazard: 'drought',
    title_en: 'Activate Fodder Supply Centers & Mobile Veterinary Clinics for Livestock',
    title_mr: 'जनावरांसाठी चारा छावण्या व फिरती पशुवैद्यकीय पथके सुरू करा',
    description_en: 'Ensure uninterrupted green/dry fodder availability and livestock vaccinations in water-stressed southern villages.',
    description_mr: 'टंचाईग्रस्त भागातील जनावरांसाठी चारा पुरवठा व मोफत वैद्यकीय तपासणी सुरू केली.',
    category: 'agriculture',
    icon: 'pest_control_rodent',
    badge_color: 'bg-amber-700',
    default_resources: { teams: 4, vehicles: 3, volunteers: 18 },
    recommended_zone: 'zone-rural-south'
  },

  // 7. MSEDCL & POWER GRID
  {
    id: 'msedcl-deenergize-flooded-dps',
    department: 'MSEDCL & Power Grid',
    hazard: 'flood',
    title_en: 'De-Energize Flooded 11kV Substations & Isolate Submerged Transformers',
    title_mr: 'पूरबाधित ११ केव्ही ट्रान्सफॉर्मर बंद करून संभाव्य वीज अपघात रोखा',
    description_en: 'Disconnect electricity to submerged poles, meter boxes, and pump feeders along riverbanks to eliminate electrocution risk.',
    description_mr: 'पूरग्रस्त भागातील वीजपुरवठा खंडित करून सुरक्षितता सुनिश्चित केली.',
    category: 'power',
    icon: 'power_off',
    badge_color: 'bg-yellow-600',
    default_resources: { linemen: 16, teams: 4, vehicles: 2 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'msedcl-emergency-generators-hospitals',
    department: 'MSEDCL & Power Grid',
    hazard: 'all',
    title_en: 'Deploy Heavy Diesel Backup Generators to Hospitals & Water Works',
    title_mr: 'रुग्णालये व जलशुद्धीकरण केंद्रांसाठी हाय-कॅपॅसिटी डिझेल जनरेटर सुरू करा',
    description_en: 'Ensure critical ICU beds, oxygen units, and municipal water pumping stations remain continuously energized.',
    description_mr: 'रुग्णालयातील अतिदक्षता विभाग व पाणीपुरवठा अखंड चालू ठेवण्यासाठी जनरेटर व्यवस्था केली.',
    category: 'power',
    icon: 'bolt',
    badge_color: 'bg-amber-600',
    default_resources: { teams: 3, linemen: 8, vehicles: 3 },
    recommended_zone: 'all-taluka'
  },

  // 8. MUNICIPAL ADMINISTRATION
  {
    id: 'municipality-drinking-water-tankers',
    department: 'Municipal Administration',
    hazard: 'drought',
    title_en: 'Dispatch Clean Drinking Water Tankers to Water-Stressed Wards',
    title_mr: 'टंचाईग्रस्त प्रभागांना शुद्ध पिण्याच्या पाण्याचे टँकर तात्काळ सुरू करा',
    description_en: 'Operate 12 GPS-tracked water tankers on scheduled rounds to ensure adequate potable water supply in drought wards.',
    description_mr: 'पाण्याची टंचाई असलेल्या भागात टँकरद्वारे घरोघरी स्वच्छ पाणीपुरवठा सुरू केला.',
    category: 'relief_shelter',
    icon: 'water_drop',
    badge_color: 'bg-sky-600',
    default_resources: { tankers: 12, volunteers: 15, teams: 3 },
    recommended_zone: 'zone-rural-south'
  },
  {
    id: 'municipality-bleaching-sanitation',
    department: 'Municipal Administration',
    hazard: 'flood',
    title_en: 'Conduct Post-Flood Silt Clearance, Bleaching Powder Spray & Disinfection',
    title_mr: 'पूर ओसरताच चिखल उपसा, ब्लिचिंग पावडर फवारणी व शहर निर्जंतुकीकरण मोहीम',
    description_en: 'Mobilize 60 municipal sanitation workers, JCBs, and fogging machines to eliminate epidemic risks.',
    description_mr: 'पूर ओसरताच रोगराई रोखण्यासाठी चिखल हटवून जंतुनाशक पावडरची फवारणी केली.',
    category: 'relief_shelter',
    icon: 'cleaning_services',
    badge_color: 'bg-teal-700',
    default_resources: { volunteers: 45, teams: 6, vehicles: 5 },
    recommended_zone: 'zone-market'
  },

  // 9. NGO & VOLUNTEER RELIEF
  {
    id: 'ngo-food-ration-distribution',
    department: 'NGO & Volunteer Relief',
    hazard: 'flood',
    title_en: 'Distribute Cooked Meal Packets, Drinking Water & Dry Rations to Displaced Families',
    title_mr: 'पूरबाधित कुटुंबांना तयार जेवणाची पाकिटे, पिण्याचे पाणी व शिधा वाटप करा',
    description_en: 'Civil society network delivering 3,000 hot meal boxes and clean drinking water pouches directly to evacuation shelters.',
    description_mr: 'मदत छावण्यांमध्ये स्वयंसेवकांमार्फत जेवणाचे डबे व पिण्याच्या पाण्याचे वाटप सुरू केले.',
    category: 'relief_shelter',
    icon: 'restaurant',
    badge_color: 'bg-rose-700',
    default_resources: { food_packets: 3000, volunteers: 50, vehicles: 4 },
    recommended_zone: 'zone-bet'
  },
  {
    id: 'ngo-vulnerable-elderly-care',
    department: 'NGO & Volunteer Relief',
    hazard: 'all',
    title_en: 'Deploy Dedicated Women, Children & Elderly Care Units with Stretcher Squads',
    title_mr: 'महिला, लहान मुले व वृद्धांसाठी विशेष काळजी पथक व स्ट्रेचर तुकडी तैनात करा',
    description_en: 'Volunteer squads assisting senior citizens and bedridden patients with wheelchair transit, sanitary kits, and child food.',
    description_mr: 'वृद्ध व दिव्यांग नागरिकांना सुरक्षित स्थळी नेण्यासाठी स्ट्रेचर व विशेष मदत पथक तयार केले.',
    category: 'relief_shelter',
    icon: 'elderly',
    badge_color: 'bg-pink-700',
    default_resources: { volunteers: 30, teams: 5 },
    recommended_zone: 'all-taluka'
  }
];
