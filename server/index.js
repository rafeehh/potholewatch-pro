import express from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CAPTURE_WINDOW_MINUTES,
  DATA_DIR,
  FLAG_THRESHOLD,
  FLAG_THRESHOLD_VERIFIED,
  HAZARD_TYPES,
  MAX_REPORTS_PER_HOUR,
  SEVERITY_WEIGHT,
  VERIFY_THRESHOLD,
  commentsFor,
  db,
  findReport,
  findRoad,
  findUser,
  haversineKm,
  publicName,
  saveDb,
  scoreReport,
  scoreRoad,
  uid,
  voteCount,
  votesFor,
} from './store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 5173;
const HOST = process.env.HOST || '127.0.0.1';
const PROD = process.env.NODE_ENV === 'production';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));

/* ------------------------------------------------------------------ *
 * Sessions — a signed, device-bound identity. No password: this demo
 * installs a cookie on first visit and one identity = one vote.
 * ------------------------------------------------------------------ */

const COOKIE = 'pw_session';

function sign(value) {
  return crypto.createHmac('sha256', db.secret).update(value).digest('hex').slice(0, 40);
}

function parseCookies(header = '') {
  return header.split(';').reduce((acc, part) => {
    const i = part.indexOf('=');
    if (i > -1) acc[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    return acc;
  }, {});
}

function issueSession(res) {
  const id = uid('w');
  const createdAt = new Date().toISOString();
  const user = { id, name: `Witness-${id.slice(-3).toUpperCase()}`, createdAt, demo: false };
  db.users.push(user);
  saveDb();
  const value = `${id}.${sign(id)}`;
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 365 * 24 * 3600 * 1000,
    path: '/',
  });
  return user;
}

app.use('/api', (req, res, next) => {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (raw) {
    const [id, signature] = raw.split('.');
    if (id && signature && sign(id) === signature) {
      const user = findUser(id);
      if (user) {
        req.user = user;
        return next();
      }
    }
  }
  req.user = issueSession(res);
  next();
});

/* ------------------------------------------------------------------ *
 * Serializers
 * ------------------------------------------------------------------ */

function reportView(report, viewerId, now = Date.now()) {
  const road = findRoad(report.roadId);
  const reporter = findUser(report.reporterId);
  const votes = votesFor(report.id);
  const mine = votes.find((v) => v.userId === viewerId);
  const score = scoreReport(report, now);
  return {
    id: report.id,
    roadId: report.roadId,
    roadName: road ? road.name : 'Unknown road',
    roadStretch: road ? road.stretch : '',
    district: road ? road.district : '',
    type: report.type,
    typeLabel: HAZARD_TYPES[report.type]?.label || report.type,
    severity: report.severity,
    description: report.description,
    status: report.status,
    createdAt: report.createdAt,
    verifiedAt: report.verifiedAt || null,
    resolvedAt: report.resolvedAt || null,
    lat: report.lat,
    lng: report.lng,
    media: report.media,
    evidence: report.evidence,
    evidenceDetail: report.evidenceDetail || null,
    reporter: reporter
      ? { id: reporter.id, name: publicName(reporter.name) }
      : { id: 'unknown', name: 'Unknown witness' },
    isOwner: report.reporterId === viewerId,
    verifyVotes: votes.filter((v) => v.kind === 'verify').length,
    flagVotes: votes.filter((v) => v.kind === 'flag').length,
    myVote: mine ? mine.kind : null,
    commentCount: commentsFor(report.id).length,
    score,
    demo: Boolean(report.demo),
  };
}

function roadView(road, now = Date.now()) {
  const score = scoreRoad(road, now);
  const reports = db.reports
    .filter((r) => r.roadId === road.id && ['pending', 'verified'].includes(r.status))
    .sort((a, b) => {
      const order = { critical: 0, medium: 1, low: 2 };
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  return {
    id: road.id,
    name: road.name,
    stretch: road.stretch,
    district: road.district,
    lat: road.lat,
    lng: road.lng,
    lengthKm: road.lengthKm,
    authority: road.authority,
    notes: road.notes,
    ...score,
    openReports: reports.map((r) => ({
      id: r.id,
      type: r.type,
      typeLabel: HAZARD_TYPES[r.type]?.label || r.type,
      severity: r.severity,
      status: r.status,
      createdAt: r.createdAt,
      lat: r.lat,
      lng: r.lng,
    })),
  };
}

function rankedRoads(now = Date.now()) {
  const rows = db.roads.map((r) => roadView(r, now));
  rows.sort((a, b) => b.total - a.total || b.verifiedCount - a.verifiedCount);
  return rows.map((r, i) => ({
    ...r,
    rank: r.total > 0 ? i + 1 : null,
    zone: r.total > 0 ? (i === 0 ? 'alert' : 'watch') : 'clear',
  }));
}

function stats(now = Date.now()) {
  const live = db.reports.filter((r) => r.status === 'verified');
  const resolved = db.reports.filter((r) => r.status === 'resolved');
  const resolutionDays = resolved
    .filter((r) => r.resolvedAt)
    .map((r) => (new Date(r.resolvedAt) - new Date(r.createdAt)) / 86_400_000);
  return {
    verifiedOpen: live.length,
    pending: db.reports.filter((r) => r.status === 'pending').length,
    flagged: db.reports.filter((r) => r.status === 'flagged').length,
    resolved: resolved.length,
    totalReports: db.reports.filter((r) => r.status !== 'rejected').length,
    contributors: new Set(db.reports.map((r) => r.reporterId)).size,
    verifyVotes: db.votes.filter((v) => v.kind === 'verify').length,
    kmWatched: Math.round(db.roads.reduce((sum, r) => sum + r.lengthKm, 0) * 10) / 10,
    roadsWatched: db.roads.length,
    avgOpenDays: live.length
      ? Math.round(
          (live.reduce((s, r) => s + (now - new Date(r.createdAt)) / 86_400_000, 0) / live.length) * 10,
        ) / 10
      : 0,
    avgResolutionDays: resolutionDays.length
      ? Math.round((resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length) * 10) / 10
      : 0,
  };
}

function serializeComments(reportId, viewerId) {
  return commentsFor(reportId).map((c) => {
    const author = findUser(c.userId);
    return {
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      author: author ? publicName(author.name) : 'Unknown witness',
      isMine: Boolean(author && author.id === viewerId),
    };
  });
}

/* ------------------------------------------------------------------ *
 * Upload handling — in-memory so invalid files never hit the disk.
 * ------------------------------------------------------------------ */

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      const err = new Error('Evidence must be a JPEG, PNG or WebP image.');
      err.status = 415;
      return cb(err);
    }
    cb(null, true);
  },
});

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

/**
 * Keep a report's status consistent with its live vote counts. Promotion
 * needs 3 confirmations; withdrawing support drops it back to pending.
 */
function recomputeStatus(report) {
  if (report.status === 'resolved' || report.status === 'rejected') return null;
  const verify = voteCount(report.id, 'verify');
  const flags = voteCount(report.id, 'flag');
  const freezeAt = verify >= VERIFY_THRESHOLD ? FLAG_THRESHOLD_VERIFIED : FLAG_THRESHOLD;

  if (report.status === 'flagged') {
    if (flags >= freezeAt) return null;
    report.status = verify >= VERIFY_THRESHOLD ? 'verified' : 'pending';
    report.verifiedAt = verify >= VERIFY_THRESHOLD ? report.verifiedAt || new Date().toISOString() : null;
    return 'restored';
  }

  if (verify >= VERIFY_THRESHOLD) {
    if (flags >= FLAG_THRESHOLD_VERIFIED) {
      report.status = 'flagged';
      return 'flagged';
    }
    if (report.status !== 'verified') {
      report.status = 'verified';
      report.verifiedAt = new Date().toISOString();
      return 'verified';
    }
    return null;
  }

  if (flags >= FLAG_THRESHOLD) {
    report.status = 'flagged';
    return 'flagged';
  }

  if (report.status === 'verified') {
    report.status = 'pending';
    report.verifiedAt = null;
    return 'unverified';
  }
  return null;
}

function hasValidSignature(buffer) {
  if (buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  return buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP';
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */

const submissions = new Map();

function fail(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

app.get('/api/session', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({
    user: { id: req.user.id, name: req.user.name, displayName: publicName(req.user.name) },
    verification: {
      verifyThreshold: VERIFY_THRESHOLD,
      flagThreshold: FLAG_THRESHOLD,
      captureWindowMinutes: CAPTURE_WINDOW_MINUTES,
    },
  });
});

app.post('/api/session', (req, res) => {
  const name = String(req.body?.name || '').replace(/[<>]/g, '').trim();
  if (name.length < 2 || name.length > 40) {
    return fail(res, 400, 'INVALID_NAME', 'Use a display name between 2 and 40 characters.');
  }
  req.user.name = name;
  saveDb();
  res.json({ user: { id: req.user.id, name: req.user.name, displayName: publicName(req.user.name) } });
});

app.get('/api/dashboard', (req, res) => {
  const now = Date.now();
  const roads = rankedRoads(now);
  const recentVerified = db.reports
    .filter((r) => ['verified', 'resolved'].includes(r.status))
    .sort((a, b) => new Date(b.verifiedAt || b.createdAt) - new Date(a.verifiedAt || a.createdAt))
    .slice(0, 4)
    .map((r) => reportView(r, req.user.id, now));
  res.set('Cache-Control', 'no-store');
  res.json({
    stats: stats(now),
    roads,
    recentVerified,
    thresholds: { verify: VERIFY_THRESHOLD, flag: FLAG_THRESHOLD },
    formula: SEVERITY_WEIGHT,
    hazardTypes: HAZARD_TYPES,
  });
});

app.get('/api/roads', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ roads: rankedRoads() });
});

app.get('/api/roads/:id', (req, res) => {
  const road = findRoad(req.params.id);
  if (!road) return fail(res, 404, 'ROAD_NOT_FOUND', 'That road is not on the watch list.');
  const now = Date.now();
  const ranked = rankedRoads(now).find((r) => r.id === road.id);
  const reports = db.reports
    .filter((r) => r.roadId === road.id && r.status !== 'rejected')
    .sort((a, b) => {
      const rankStatus = { verified: 0, pending: 1, flagged: 1, resolved: 2 };
      if (rankStatus[a.status] !== rankStatus[b.status]) return rankStatus[a.status] - rankStatus[b.status];
      return scoreReport(b, now).total - scoreReport(a, now).total || new Date(b.createdAt) - new Date(a.createdAt);
    })
    .map((r) => reportView(r, req.user.id, now));
  res.set('Cache-Control', 'no-store');
  res.json({ road: ranked, reports });
});

app.get('/api/queue', (req, res) => {
  const now = Date.now();
  const queue = db.reports
    .filter((r) => r.status === 'pending')
    .sort((a, b) => {
      const order = { critical: 0, medium: 1, low: 2 };
      if (order[a.severity] !== order[b.severity]) return order[a.severity] - order[b.severity];
      return new Date(a.createdAt) - new Date(b.createdAt);
    })
    .map((r) => reportView(r, req.user.id, now));
  res.set('Cache-Control', 'no-store');
  res.json({
    queue,
    thresholds: { verify: VERIFY_THRESHOLD, flag: FLAG_THRESHOLD },
  });
});

app.get('/api/hazards/:id', (req, res) => {
  const report = findReport(req.params.id);
  if (!report || report.status === 'rejected') {
    return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  }
  const now = Date.now();
  const comments = serializeComments(report.id, req.user.id);
  res.set('Cache-Control', 'no-store');
  res.json({
    hazard: reportView(report, req.user.id, now),
    comments,
    thresholds: { verify: VERIFY_THRESHOLD, flag: FLAG_THRESHOLD, flagVerified: FLAG_THRESHOLD_VERIFIED },
  });
});

app.post('/api/hazards/:id/vote', (req, res) => {
  const report = findReport(req.params.id);
  if (!report || report.status === 'rejected') {
    return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  }
  if (report.status === 'resolved') {
    return fail(res, 409, 'ALREADY_RESOLVED', 'This hazard has already been marked repaired.');
  }
  if (report.reporterId === req.user.id) {
    return fail(res, 403, 'OWN_REPORT', 'You cannot verify or flag your own report. Another resident has to back it up.');
  }
  const kind = req.body?.kind;
  if (kind !== 'verify' && kind !== 'flag') {
    return fail(res, 400, 'INVALID_VOTE', 'Vote must be either "verify" or "flag".');
  }

  const existing = db.votes.find((v) => v.reportId === report.id && v.userId === req.user.id);
  let action;
  if (!existing) {
    db.votes.push({ reportId: report.id, userId: req.user.id, kind, at: new Date().toISOString() });
    action = 'added';
  } else if (existing.kind === kind) {
    db.votes = db.votes.filter((v) => v !== existing);
    action = 'removed';
  } else {
    existing.kind = kind;
    existing.at = new Date().toISOString();
    action = 'changed';
  }

  const transition = recomputeStatus(report);
  const verifyVotes = voteCount(report.id, 'verify');
  const flagVotes = voteCount(report.id, 'flag');

  saveDb();
  res.json({
    action,
    transition,
    hazard: reportView(report, req.user.id),
    verifyVotes,
    flagVotes,
  });
});

app.post('/api/hazards/:id/comments', (req, res) => {
  const report = findReport(req.params.id);
  if (!report || report.status === 'rejected') {
    return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  }
  const body = String(req.body?.body || '').replace(/[<>]/g, '').trim();
  if (body.length < 2 || body.length > 700) {
    return fail(res, 400, 'INVALID_COMMENT', 'Comments must be between 2 and 700 characters.');
  }
  const recent = db.comments.filter(
    (c) => c.userId === req.user.id && Date.now() - new Date(c.createdAt).getTime() < 60_000,
  );
  if (recent.length >= 3) {
    return fail(res, 429, 'TOO_FAST', 'Give it a minute before posting again.');
  }
  db.comments.push({
    id: uid('c'),
    reportId: report.id,
    userId: req.user.id,
    body,
    createdAt: new Date().toISOString(),
  });
  saveDb();
  res.status(201).json({ comments: serializeComments(report.id, req.user.id) });
});

app.post('/api/reports', (req, res) => {
  upload.single('photo')(req, res, (uploadErr) => {
    if (uploadErr) {
      if (uploadErr.code === 'LIMIT_FILE_SIZE') {
        return fail(res, 413, 'FILE_TOO_LARGE', 'Evidence photos must be 8 MB or smaller.');
      }
      return fail(res, uploadErr.status || 400, 'UPLOAD_REJECTED', uploadErr.message);
    }

    const cleanup = () => {
      if (req.file?.buffer) req.file.buffer = null;
    };

    try {
      const body = req.body || {};
      const road = findRoad(body.roadId);
      if (!road) return fail(res, 400, 'ROAD_REQUIRED', 'Choose the road this hazard is on.');

      if (!HAZARD_TYPES[body.type]) return fail(res, 400, 'TYPE_REQUIRED', 'Choose a hazard type.');
      if (!SEVERITY_WEIGHT[body.severity]) {
        return fail(res, 400, 'SEVERITY_REQUIRED', 'Choose a severity level.');
      }

      const description = String(body.description || '').replace(/[<>]/g, '').trim();
      if (description.length < 15 || description.length > 600) {
        return fail(res, 400, 'DESCRIPTION_INVALID', 'Describe the hazard in 15–600 characters.');
      }

      const lat = Number(body.lat);
      const lng = Number(body.lng);
      const accuracy = Number(body.accuracy);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        return fail(res, 422, 'LOCATION_REQUIRED', 'A location reading is required before submitting.');
      }

      const capturedAt = Number(body.capturedAt);
      if (!Number.isFinite(capturedAt)) {
        return fail(res, 422, 'CAPTURE_TIME_REQUIRED', 'The evidence capture time is missing.');
      }
      const captureAgeMin = (Date.now() - capturedAt) / 60_000;
      if (captureAgeMin > CAPTURE_WINDOW_MINUTES || captureAgeMin < -2) {
        return fail(
          res,
          422,
          'CAPTURE_STALE',
          `Evidence must be captured live, within the last ${CAPTURE_WINDOW_MINUTES} minutes. This photo is ${Math.round(captureAgeMin)} minutes old.`,
        );
      }

      const fileModified = Number(body.fileLastModified);
      if (Number.isFinite(fileModified)) {
        const fileAgeH = (Date.now() - fileModified) / 3_600_000;
        if (fileAgeH > 12 || fileAgeH < -1) {
          return fail(
            res,
            422,
            'FILE_NOT_FRESH',
            'This image file was last modified hours ago. Capture a new photo for live evidence.',
          );
        }
      }

      if (!req.file) return fail(res, 422, 'PHOTO_REQUIRED', 'Photo evidence is required.');
      if (!hasValidSignature(req.file.buffer)) {
        return fail(res, 415, 'INVALID_IMAGE', 'That file is not a valid JPEG, PNG or WebP image.');
      }

      const distanceKm = haversineKm({ lat, lng }, { lat: road.lat, lng: road.lng });
      if (distanceKm > 2) {
        return fail(
          res,
          422,
          'GEO_MISMATCH',
          `Your reading is ${distanceKm.toFixed(1)} km from ${road.name}. Move closer or pick the correct road.`,
        );
      }

      const windowStart = Date.now() - 48 * 3_600_000;
      const duplicate = db.reports.find(
        (r) =>
          r.roadId === road.id &&
          r.type === body.type &&
          ['pending', 'verified'].includes(r.status) &&
          new Date(r.createdAt).getTime() > windowStart &&
          haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng }) < 0.15,
      );
      if (duplicate) {
        return fail(
          res,
          409,
          'DUPLICATE',
          `This looks like the same hazard already reported on ${road.name}. Open the existing report and add your verification instead of filing a duplicate.`,
        );
      }

      const recent = (submissions.get(req.user.id) || []).filter((t) => Date.now() - t < 3_600_000);
      if (recent.length >= MAX_REPORTS_PER_HOUR) {
        return fail(res, 429, 'RATE_LIMITED', 'You have filed several reports in the last hour. Try again later.');
      }
      recent.push(Date.now());
      submissions.set(req.user.id, recent);

      const filename = `${uid('img')}.${EXT[req.file.mimetype] || 'jpg'}`;
      const uploadsDir = path.join(DATA_DIR, 'uploads');
      fs.mkdirSync(uploadsDir, { recursive: true });
      fs.writeFileSync(path.join(uploadsDir, filename), req.file.buffer);

      const now = new Date().toISOString();
      const report = {
        id: uid('r'),
        roadId: road.id,
        type: body.type,
        severity: body.severity,
        description,
        reporterId: req.user.id,
        status: 'pending',
        createdAt: now,
        lat,
        lng,
        media: { url: `/uploads/${filename}`, width: null, height: null },
        evidence: ['live_capture', 'gps_match', 'file_fresh'],
        evidenceDetail: {
          capturedAt: new Date(capturedAt).toISOString(),
          lat,
          lng,
          accuracy: Number.isFinite(accuracy) ? Math.round(accuracy) : null,
          distanceKm: Math.round(distanceKm * 100) / 100,
          fileModified: Number.isFinite(fileModified) ? new Date(fileModified).toISOString() : null,
        },
      };
      db.reports.push(report);
      saveDb();
      res.status(201).json({
        hazard: reportView(report, req.user.id),
        message: 'Filed. Your report is pending until other residents verify it.',
      });
    } catch (err) {
      console.error('report error', err);
      return fail(res, 500, 'SERVER_ERROR', 'Could not file the report. Please try again.');
    } finally {
      cleanup();
    }
  });
});

function municipalQueue(req, res) {
  const now = Date.now();
  const verified = db.reports
    .filter((r) => r.status === 'verified')
    .sort((a, b) => scoreReport(b, now).total - scoreReport(a, now).total)
    .map((r) => reportView(r, req.user.id, now));
  const flagged = db.reports
    .filter((r) => r.status === 'flagged')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((r) => reportView(r, req.user.id, now));
  res.json({
    verified,
    flagged,
    stats: stats(now),
    thresholds: { verify: VERIFY_THRESHOLD, flag: FLAG_THRESHOLD, flagVerified: FLAG_THRESHOLD_VERIFIED },
  });
}

app.get('/api/municipal', municipalQueue);

app.post('/api/hazards/:id/resolve', (req, res) => {
  const report = findReport(req.params.id);
  if (!report) return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  if (report.status !== 'verified') {
    return fail(res, 409, 'NOT_VERIFIED', 'Only verified hazards can be marked as repaired.');
  }
  report.status = 'resolved';
  report.resolvedAt = new Date().toISOString();
  report.resolvedBy = req.user.id;
  saveDb();
  return municipalQueue(req, res);
});

app.post('/api/hazards/:id/reinstate', (req, res) => {
  const report = findReport(req.params.id);
  if (!report) return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  if (report.status !== 'flagged') {
    return fail(res, 409, 'NOT_FLAGGED', 'Only flagged reports can be reinstated.');
  }
  // A moderator has reviewed the evidence: clear the flags that froze it.
  db.votes = db.votes.filter((v) => !(v.reportId === report.id && v.kind === 'flag'));
  const back = voteCount(report.id, 'verify') >= VERIFY_THRESHOLD ? 'verified' : 'pending';
  report.status = back;
  report.verifiedAt = back === 'verified' ? report.verifiedAt || new Date().toISOString() : null;
  saveDb();
  return municipalQueue(req, res);
});

app.post('/api/hazards/:id/reject', (req, res) => {
  const report = findReport(req.params.id);
  if (!report) return fail(res, 404, 'HAZARD_NOT_FOUND', 'That hazard report does not exist.');
  if (report.status !== 'flagged') {
    return fail(res, 409, 'NOT_FLAGGED', 'Only flagged reports can be rejected.');
  }
  report.status = 'rejected';
  report.rejectedAt = new Date().toISOString();
  saveDb();
  return municipalQueue(req, res);
});

app.use('/api', (_req, res) => fail(res, 404, 'NOT_FOUND', 'Unknown API route.'));

/* ------------------------------------------------------------------ *
 * Static media + client
 * ------------------------------------------------------------------ */

app.use('/uploads', express.static(path.join(DATA_DIR, 'uploads'), { maxAge: '7d', index: false }));

if (PROD) {
  const dist = path.join(__dirname, '..', 'dist');
  app.use(express.static(dist, { index: false, maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  const server = http.createServer(app);
  server.listen(PORT, HOST, () => {
    console.log(`PotholeWatch Pro running at http://${HOST}:${PORT}`);
  });
} else {
  const { createServer: createVite } = await import('vite');
  const server = http.createServer(app);
  const vite = await createVite({
    server: { middlewareMode: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
  server.listen(PORT, HOST, () => {
    console.log(`PotholeWatch Pro (dev) running at http://${HOST}:${PORT}`);
  });
}
