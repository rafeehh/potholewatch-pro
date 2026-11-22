import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export const SEVERITY_WEIGHT = { critical: 50, medium: 25, low: 10 };
export const VERIFY_THRESHOLD = 3;
export const FLAG_THRESHOLD = 3;
export const FLAG_THRESHOLD_VERIFIED = 5;
export const MAX_REPORTS_PER_HOUR = 5;
export const CAPTURE_WINDOW_MINUTES = 45;

export const HAZARD_TYPES = {
  pothole: { label: 'Pothole', icon: 'pothole' },
  manhole: { label: 'Open manhole', icon: 'manhole' },
  collapse: { label: 'Road collapse', icon: 'collapse' },
  debris: { label: 'Debris / obstruction', icon: 'debris' },
};

export const uid = (prefix) => `${prefix}_${crypto.randomBytes(8).toString('hex')}`;

export function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function daysSince(dateStr, now = Date.now()) {
  return Math.max(0, (now - new Date(dateStr).getTime()) / 86_400_000);
}

const hoursAgo = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86_400_000).toISOString();

/** Trim a full name down to "First L." so public records stay privacy-safe. */
export function publicName(name) {
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

function seed() {
  const roads = [
    {
      id: 'galle-road',
      name: 'Galle Road',
      stretch: 'Kollupitiya → Bambalapitiya',
      district: 'Colombo',
      lat: 6.9035,
      lng: 79.8518,
      lengthKm: 4.2,
      authority: 'Colombo Municipal Council — Roads & Bridges',
      notes: 'Six-lane coastal artery. Heavy bus and three-wheeler traffic all day.',
    },
    {
      id: 'baseline-road',
      name: 'Baseline Road',
      stretch: 'Borella → Dematagoda',
      district: 'Colombo',
      lat: 6.9257,
      lng: 79.8657,
      lengthKm: 3.1,
      authority: 'Colombo Municipal Council — Roads & Bridges',
      notes: 'Runs beside the main canal; surface drains poorly after rain.',
      },
    {
      id: 'havelock-road',
      name: 'Havelock Road',
      stretch: 'Kirulapone → Thimbirigasyaya',
      district: 'Colombo',
      lat: 6.8858,
      lng: 79.8689,
      lengthKm: 2.8,
      authority: 'Colombo Municipal Council — Roads & Bridges',
      notes: 'School and hospital corridor with heavy morning pedestrian traffic.',
    },
    {
      id: 'duplication-road',
      name: 'Duplication Road',
      stretch: 'Bambalapitiya → Kollupitiya',
      district: 'Colombo',
      lat: 6.8982,
      lng: 79.8535,
      lengthKm: 3.4,
      authority: 'Colombo Municipal Council — Roads & Bridges',
      notes: 'Parallel to Galle Road, used as the main detour during peak hours.',
    },
    {
      id: 'nawala-road',
      name: 'Nawala Road',
      stretch: 'Nugegoda → Rajagiriya',
      district: 'Colombo',
      lat: 6.8903,
      lng: 79.8895,
      lengthKm: 5.6,
      authority: 'Sri Jayawardenepura Kotte Municipal Council',
      notes: 'Narrow two-lane stretch with no hard shoulder for broken-down vehicles.',
    },
    {
      id: 'negombo-road',
      name: 'Negombo Road',
      stretch: 'Peliyagoda → Wattala',
      district: 'Gampaha',
      lat: 6.9703,
      lng: 79.8816,
      lengthKm: 6.2,
      authority: 'Road Development Authority — Western Province',
      notes: 'High-speed lorries; a pothole here is a motorway-level hazard.',
    },
    {
      id: 'high-level-road',
      name: 'High Level Road',
      stretch: 'Nugegoda → Maharagama',
      district: 'Colombo',
      lat: 6.8604,
      lng: 79.9002,
      lengthKm: 7.4,
      authority: 'Road Development Authority — Western Province',
      notes: 'Recently patched in sections; two verified repairs this month.',
    },
  ];

  const users = [
    { id: 'u_nadia', name: 'Nadia Perera' },
    { id: 'u_ruwan', name: 'Ruwan Silva' },
    { id: 'u_amara', name: 'Amara Fernando' },
    { id: 'u_kavishka', name: 'Kavishka Jayasuriya' },
    { id: 'u_ishara', name: 'Ishara Weerasinghe' },
    { id: 'u_dilan', name: 'Dilan Costa' },
    { id: 'u_tharindu', name: 'Tharindu Mendis' },
    { id: 'u_shalini', name: 'Shalini Gunasekara' },
    { id: 'u_farhan', name: 'Farhan Rahim' },
    { id: 'u_malsha', name: 'Malsha Ekanayake' },
    { id: 'u_janith', name: 'Janith Ranatunga' },
    { id: 'u_priya', name: 'Priya Selvam' },
    { id: 'u_sahan', name: 'Sahan Bandara' },
    { id: 'u_nuwani', name: 'Nuwani Herath' },
  ].map((u) => ({ ...u, createdAt: daysAgo(120), demo: true }));

  const votes = [];
  const addVotes = (reportId, userIds, kind = 'verify', at = hoursAgo(20)) => {
    for (const userId of userIds) votes.push({ reportId, userId, kind, at });
  };

  const reports = [];
  const add = (r) => reports.push(r);

  add({
    id: 'r_galle_1',
    roadId: 'galle-road',
    type: 'pothole',
    severity: 'critical',
    description:
      'Deep pothole in the left lane just past the Kollupitiya junction. Wide enough to swallow a scooter wheel, and the edge is crumbling fast. Cars swerve into the middle lane without warning.',
    reporterId: 'u_ruwan',
    status: 'verified',
    createdAt: daysAgo(9),
    verifiedAt: daysAgo(8.8),
    lat: 6.9039,
    lng: 79.8512,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_galle_1', ['u_nadia', 'u_amara', 'u_kavishka', 'u_dilan', 'u_ishara'], 'verify', daysAgo(8.9));

  add({
    id: 'r_galle_2',
    roadId: 'galle-road',
    type: 'pothole',
    severity: 'medium',
    description:
      'Cracked patch spreading across the centre lane near the bus stop. Not deep yet, but the whole square of tarmac is lifting.',
    reporterId: 'u_nadia',
    status: 'verified',
    createdAt: daysAgo(4),
    verifiedAt: daysAgo(3.7),
    lat: 6.9018,
    lng: 79.8529,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_galle_2', ['u_amara', 'u_farhan', 'u_sahan'], 'verify', daysAgo(3.8));

  add({
    id: 'r_galle_3',
    roadId: 'galle-road',
    type: 'manhole',
    severity: 'critical',
    description:
      'Manhole cover sitting at an angle near the Bambalapitiya flyover turn-off, with a gap you can see straight into. Marked it with a plastic crate for now.',
    reporterId: 'u_kavishka',
    status: 'pending',
    createdAt: hoursAgo(6),
    lat: 6.8952,
    lng: 79.8551,
    media: { url: '/demo/manhole-baseline.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_galle_3', ['u_malsha', 'u_tharindu'], 'verify', hoursAgo(4));

  add({
    id: 'r_base_1',
    roadId: 'baseline-road',
    type: 'manhole',
    severity: 'critical',
    description:
      'Manhole cover missing outside the Borella market entrance. The last barricade has collapsed into the hole and three-wheelers are clipping it at night.',
    reporterId: 'u_amara',
    status: 'verified',
    createdAt: daysAgo(21),
    verifiedAt: daysAgo(20.7),
    lat: 6.9249,
    lng: 79.8661,
    media: { url: '/demo/manhole-baseline.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes(
    'r_base_1',
    ['u_nadia', 'u_ruwan', 'u_kavishka', 'u_dilan', 'u_ishara', 'u_priya', 'u_tharindu'],
    'verify',
    daysAgo(20.6),
  );

  add({
    id: 'r_base_2',
    roadId: 'baseline-road',
    type: 'collapse',
    severity: 'medium',
    description:
      'Edge of the road has sunk next to the canal railing. You can see the gravel base underneath now. Road is still open but the lane is effectively half-width.',
    reporterId: 'u_dilan',
    status: 'verified',
    createdAt: daysAgo(12),
    verifiedAt: daysAgo(11.6),
    lat: 6.9265,
    lng: 79.8649,
    media: { url: '/demo/collapse-havelock.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_base_2', ['u_farhan', 'u_shalini', 'u_sahan', 'u_malsha'], 'verify', daysAgo(11.7));

  add({
    id: 'r_base_3',
    roadId: 'baseline-road',
    type: 'pothole',
    severity: 'low',
    description:
      'Small water-filled pothole right where pedestrians cross near the temple. Hard to see when the road is wet.',
    reporterId: 'u_shalini',
    status: 'pending',
    createdAt: daysAgo(1),
    lat: 6.9231,
    lng: 79.8673,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_base_3', ['u_janith', 'u_ishara'], 'verify', hoursAgo(5));

  add({
    id: 'r_base_4',
    roadId: 'baseline-road',
    type: 'pothole',
    severity: 'critical',
    description: 'HUGE CRATER NEEDS FIXING TODAY!!!',
    reporterId: 'u_janith',
    status: 'flagged',
    createdAt: daysAgo(2),
    lat: 6.9302,
    lng: 79.8614,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture'],
    demo: true,
  });
  addVotes('r_base_4', ['u_nadia', 'u_ruwan', 'u_priya', 'u_sahan'], 'flag', hoursAgo(30));

  add({
    id: 'r_havelock_1',
    roadId: 'havelock-road',
    type: 'collapse',
    severity: 'critical',
    description:
      'Tarmac has collapsed over a drain outside the school gate. Roughly a metre wide and deep enough that a car tyre disappears into it. School vans are queuing around it every morning.',
    reporterId: 'u_tharindu',
    status: 'verified',
    createdAt: daysAgo(5),
    verifiedAt: daysAgo(4.8),
    lat: 6.8864,
    lng: 79.8685,
    media: { url: '/demo/collapse-havelock.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_havelock_1', ['u_malsha', 'u_nadia', 'u_dilan', 'u_priya', 'u_shalini'], 'verify', daysAgo(4.7));

  add({
    id: 'r_havelock_2',
    roadId: 'havelock-road',
    type: 'pothole',
    severity: 'medium',
    description:
      'Series of three potholes in a row on the hospital side of the road, about 15 metres apart. The middle one is the worst.',
    reporterId: 'u_malsha',
    status: 'pending',
    createdAt: hoursAgo(3),
    lat: 6.8849,
    lng: 79.8697,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_havelock_2', ['u_ishara'], 'verify', hoursAgo(2));

  add({
    id: 'r_dup_1',
    roadId: 'duplication-road',
    type: 'pothole',
    severity: 'medium',
    description:
      'Pothole on the Bambalapitiya side of the junction, about the size of a dinner plate but getting wider with every rain.',
    reporterId: 'u_farhan',
    status: 'verified',
    createdAt: daysAgo(15),
    verifiedAt: daysAgo(14.6),
    lat: 6.8976,
    lng: 79.8541,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_dup_1', ['u_nadia', 'u_kavishka', 'u_sahan'], 'verify', daysAgo(14.5));

  add({
    id: 'r_dup_2',
    roadId: 'duplication-road',
    type: 'pothole',
    severity: 'low',
    description:
      'Shallow pothole by the bus halt. Nobody is swerving for it yet, but it collects water and hides the depth.',
    reporterId: 'u_sahan',
    status: 'verified',
    createdAt: daysAgo(7),
    verifiedAt: daysAgo(6.6),
    lat: 6.8941,
    lng: 79.8557,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_dup_2', ['u_ishara', 'u_malsha', 'u_ruwan'], 'verify', daysAgo(6.7));

  add({
    id: 'r_nawala_1',
    roadId: 'nawala-road',
    type: 'pothole',
    severity: 'medium',
    description:
      'Broken patch near the Rajagiriya end of Nawala Road. Two-wheelers swing into the oncoming lane to avoid it.',
    reporterId: 'u_priya',
    status: 'verified',
    createdAt: daysAgo(3),
    verifiedAt: daysAgo(2.7),
    lat: 6.8911,
    lng: 79.8884,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_nawala_1', ['u_tharindu', 'u_kavishka', 'u_amara', 'u_farhan'], 'verify', daysAgo(2.8));

  add({
    id: 'r_nawala_2',
    roadId: 'nawala-road',
    type: 'collapse',
    severity: 'critical',
    description:
      'Road has given way around a utility trench near the Nugegoda junction. One lane is currently blocked with a plank and a chair.',
    reporterId: 'u_nuwani',
    status: 'pending',
    createdAt: hoursAgo(2),
    lat: 6.8751,
    lng: 79.8912,
    media: { url: '/demo/collapse-havelock.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_nawala_2', ['u_priya'], 'verify', hoursAgo(1));

  add({
    id: 'r_negombo_1',
    roadId: 'negombo-road',
    type: 'pothole',
    severity: 'critical',
    description:
      'Very deep pothole in the fast lane by the Peliyagoda turn. Lorries hit it at speed and the whole cab jumps. This one is going to cause a serious accident.',
    reporterId: 'u_janith',
    status: 'verified',
    createdAt: daysAgo(26),
    verifiedAt: daysAgo(25.8),
    lat: 6.9688,
    lng: 79.8829,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes(
    'r_negombo_1',
    ['u_nadia', 'u_ruwan', 'u_amara', 'u_dilan', 'u_ishara', 'u_tharindu', 'u_farhan', 'u_sahan', 'u_priya'],
    'verify',
    daysAgo(25.5),
  );

  add({
    id: 'r_negombo_2',
    roadId: 'negombo-road',
    type: 'debris',
    severity: 'medium',
    description:
      'Heap of broken concrete and gravel left in the shoulder lane after some roadworks. Spills onto the lane when vehicles pass.',
    reporterId: 'u_ishara',
    status: 'pending',
    createdAt: hoursAgo(20),
    lat: 6.9742,
    lng: 79.8801,
    media: { url: '/demo/collapse-havelock.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });

  add({
    id: 'r_highlevel_1',
    roadId: 'high-level-road',
    type: 'pothole',
    severity: 'medium',
    description:
      'Cluster of potholes outside the Maharagama shopping strip. Buses were bottoming out on them.',
    reporterId: 'u_kavishka',
    status: 'resolved',
    createdAt: daysAgo(18),
    verifiedAt: daysAgo(17.6),
    resolvedAt: daysAgo(4),
    lat: 6.8587,
    lng: 79.9011,
    media: { url: '/demo/pothole-galle.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_highlevel_1', ['u_nadia', 'u_amara', 'u_priya'], 'verify', daysAgo(17.5));

  add({
    id: 'r_highlevel_2',
    roadId: 'high-level-road',
    type: 'manhole',
    severity: 'low',
    description: 'Loose manhole cover that clanks every time a bus runs over it. Sitting slightly proud of the road.',
    reporterId: 'u_ruwan',
    status: 'resolved',
    createdAt: daysAgo(30),
    verifiedAt: daysAgo(29.5),
    resolvedAt: daysAgo(10),
    lat: 6.8629,
    lng: 79.8964,
    media: { url: '/demo/manhole-baseline.jpg', width: 1184, height: 880 },
    evidence: ['live_capture', 'gps_match', 'file_fresh'],
    demo: true,
  });
  addVotes('r_highlevel_2', ['u_shalini', 'u_tharindu', 'u_sahan'], 'verify', daysAgo(29.4));

  const comments = [
    {
      id: 'c_1',
      reportId: 'r_galle_1',
      userId: 'u_dilan',
      body: 'Hit this last night in the rain. Front tyre is gone and the alignment is off. Please do not swerve blindly here, there is a bus lane right next to it.',
      createdAt: daysAgo(8.5),
    },
    {
      id: 'c_2',
      reportId: 'r_galle_1',
      userId: 'u_nadia',
      body: 'Called the CMC roads line this morning with the report number. They said a patching crew is scheduled for this stretch.',
      createdAt: daysAgo(7.2),
    },
    {
      id: 'c_3',
      reportId: 'r_base_1',
      userId: 'u_priya',
      body: 'Still open. Second week now. Someone has put a tyre in the hole but at night you cannot see it at all.',
      createdAt: daysAgo(6),
    },
    {
      id: 'c_4',
      reportId: 'r_havelock_1',
      userId: 'u_malsha',
      body: 'Walked past this morning — the school has moved its crossing guard further up the road. This is directly on the van route.',
      createdAt: daysAgo(4.2),
    },
    {
      id: 'c_5',
      reportId: 'r_galle_3',
      userId: 'u_tharindu',
      body: 'Drove past at 7am and the crate was gone. Cover is still sitting at an angle, so please approach slowly.',
      createdAt: hoursAgo(3),
    },
  ];

  return {
    version: 1,
    secret: crypto.randomBytes(32).toString('hex'),
    users,
    roads,
    reports,
    votes,
    comments,
  };
}

function ensureLoaded() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(seed(), null, 2));
  }
}

ensureLoaded();

export const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

let saveTimer = null;
export function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = `${DB_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, DB_FILE);
  }, 40);
}

export function findUser(id) {
  return db.users.find((u) => u.id === id) || null;
}

export function findRoad(id) {
  return db.roads.find((r) => r.id === id) || null;
}

export function findReport(id) {
  return db.reports.find((r) => r.id === id) || null;
}

export function votesFor(reportId) {
  return db.votes.filter((v) => v.reportId === reportId);
}

export function voteCount(reportId, kind) {
  return votesFor(reportId).filter((v) => v.kind === kind).length;
}

export function commentsFor(reportId) {
  return db.comments
    .filter((c) => c.reportId === reportId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

/**
 * Hazard Risk Score =
 *   verified reports × severity weight
 * + community verify votes × 2
 * + unresolved days × 1.5
 * Only verified, unresolved hazards count.
 */
export function scoreReport(report, now = Date.now()) {
  if (report.status !== 'verified') {
    return { total: 0, severity: 0, votes: 0, days: 0, daysOpen: 0 };
  }
  const weight = SEVERITY_WEIGHT[report.severity];
  const votePts = voteCount(report.id, 'verify') * 2;
  const open = daysSince(report.createdAt, now);
  const dayPts = open * 1.5;
  return {
    total: Math.round((weight + votePts + dayPts) * 10) / 10,
    severity: weight,
    votes: votePts,
    days: Math.round(dayPts * 10) / 10,
    daysOpen: Math.round(open * 10) / 10,
  };
}

export function scoreRoad(road, now = Date.now()) {
  const reports = db.reports.filter((r) => r.roadId === road.id);
  const live = reports.filter((r) => r.status === 'verified');
  let total = 0;
  let severity = 0;
  let votes = 0;
  let dayPts = 0;
  for (const r of live) {
    const s = scoreReport(r, now);
    total += s.total;
    severity += s.severity;
    votes += s.votes;
    dayPts += s.days;
  }
  return {
    total: Math.round(total * 10) / 10,
    severity: Math.round(severity * 10) / 10,
    votes: Math.round(votes * 10) / 10,
    days: Math.round(dayPts * 10) / 10,
    verifiedCount: live.length,
    criticalCount: live.filter((r) => r.severity === 'critical').length,
    pendingCount: reports.filter((r) => r.status === 'pending').length,
    resolvedCount: reports.filter((r) => r.status === 'resolved').length,
    flaggedCount: reports.filter((r) => r.status === 'flagged').length,
    reportCount: reports.length,
    oldestOpenDays: live.length
      ? Math.max(...live.map((r) => daysSince(r.createdAt, now)))
      : 0,
  };
}
