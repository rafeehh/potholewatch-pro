import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HazardType, Report, RoadSummary, Severity } from '../lib/api';
import { api, ApiError } from '../lib/api';
import { useApi } from '../lib/useApi';
import { HAZARD_LABEL, SEVERITY_WEIGHT, timeAgo } from '../lib/format';
import Icon from '../components/Icon';
import { ErrorBox, SeverityTag } from '../components/ui';
import { useSession } from '../lib/session';

type Step = 1 | 2 | 3;

interface GeoReading {
  lat: number;
  lng: number;
  accuracy: number | null;
  source: 'gps' | 'anchor';
}

const TYPES: HazardType[] = ['pothole', 'manhole', 'collapse', 'debris'];
const SEVERITIES: Severity[] = ['critical', 'medium', 'low'];
const SEVERITY_COPY: Record<Severity, string> = {
  critical: 'Life-threatening. Deep, hidden or in a fast lane.',
  medium: 'Damaging. Forces vehicles to swerve or slow hard.',
  low: 'Annoying. Shallow, visible and slow-speed.',
};
const SAMPLES = [
  { url: '/demo/pothole-galle.jpg', label: 'Pothole' },
  { url: '/demo/manhole-baseline.jpg', label: 'Open manhole' },
  { url: '/demo/collapse-havelock.jpg', label: 'Road collapse' },
];

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

async function prepareImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 3_000_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.86));
    bitmap.close();
    if (!blob) return file;
    // Re-encoding strips camera EXIF (including the location of the photographer's home).
    return new File([blob], 'hazard-evidence.jpg', { type: 'image/jpeg', lastModified: Date.now() });
  } catch {
    return file;
  }
}

export default function ReportPage() {
  const { session } = useSession();
  const roadsQuery = useApi<{ roads: RoadSummary[] }>('/api/roads');
  const [step, setStep] = useState<Step>(1);
  const [type, setType] = useState<HazardType | null>(null);
  const [severity, setSeverity] = useState<Severity | null>(null);
  const [description, setDescription] = useState('');
  const [roadId, setRoadId] = useState('');
  const [geo, setGeo] = useState<GeoReading | null>(null);
  const [geoState, setGeoState] = useState<'idle' | 'locating' | 'ok' | 'error'>('idle');
  const [geoError, setGeoError] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [originalModified, setOriginalModified] = useState<number | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [fromSample, setFromSample] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<Report | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const roads = roadsQuery.data?.roads ?? [];
  const road = roads.find((r) => r.id === roadId) || null;
  const distanceKm = geo && road ? haversineKm(geo, road) : null;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const descriptionOk = description.trim().length >= 15;
  const step1Ok = Boolean(type && severity && descriptionOk);
  const step2Ok = Boolean(roadId && geo);
  const step3Ok = Boolean(photo && capturedAt);

  const canSubmit = useMemo(
    () => step1Ok && step2Ok && step3Ok && distanceKm !== null && distanceKm <= 2 && !submitting,
    [step1Ok, step2Ok, step3Ok, distanceKm, submitting],
  );

  const takePhoto = async (file: File | null) => {
    if (!file) return;
    setSubmitError('');
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
      setSubmitError('Use a JPEG, PNG or WebP photo.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setSubmitError('That photo is over 12 MB. Try again with a normal camera photo.');
      return;
    }
    setPreparing(true);
    setFromSample(false);
    const modified = file.lastModified;
    const prepared = await prepareImage(file);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(prepared));
    setPhoto(prepared);
    setCapturedAt(Date.now());
    setOriginalModified(modified);
    setPreparing(false);
  };

  const useSample = async (url: string) => {
    setSubmitError('');
    setPreparing(true);
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const file = new File([blob], 'sample-evidence.jpg', { type: blob.type || 'image/jpeg', lastModified: Date.now() });
      const prepared = await prepareImage(file);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(prepared));
      setPhoto(prepared);
      setCapturedAt(Date.now());
      setOriginalModified(Date.now());
      setFromSample(true);
    } catch {
      setSubmitError('Could not load the sample photo.');
    } finally {
      setPreparing(false);
    }
  };

  const clearPhoto = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview('');
    setPhoto(null);
    setCapturedAt(null);
    setOriginalModified(null);
    setFromSample(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const detectLocation = () => {
    setGeoError('');
    if (!navigator.geolocation) {
      setGeoState('error');
      setGeoError('This browser has no location API. Use the road anchor instead.');
      return;
    }
    setGeoState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : null,
          source: 'gps',
        });
        setGeoState('ok');
      },
      (err) => {
        setGeoState('error');
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was blocked. Allow it, or use the road anchor below.'
            : 'Could not get a GPS fix. Step outside or use the road anchor below.',
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  };

  const useRoadAnchor = () => {
    if (!road) return;
    setGeo({ lat: road.lat, lng: road.lng, accuracy: null, source: 'anchor' });
    setGeoState('ok');
    setGeoError('');
  };

  const submit = async () => {
    if (!photo || !capturedAt || !geo || !road || !type || !severity) return;
    setSubmitting(true);
    setSubmitError('');
    const form = new FormData();
    form.append('roadId', road.id);
    form.append('type', type);
    form.append('severity', severity);
    form.append('description', description.trim());
    form.append('lat', String(geo.lat));
    form.append('lng', String(geo.lng));
    form.append('accuracy', String(geo.accuracy ?? ''));
    form.append('capturedAt', String(capturedAt));
    form.append('fileLastModified', String(originalModified ?? Date.now()));
    form.append('photo', photo);
    try {
      const result = await api<{ hazard: Report }>('/api/reports', { method: 'POST', body: form });
      setCreated(result.hazard);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setSubmitError(err instanceof ApiError ? err.message : 'Could not file that report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="shell page-pad">
        <div className="submit-success">
          <span className="success-mark">
            <Icon name="check" size={34} strokeWidth={2.4} />
          </span>
          <p className="eyebrow">Report filed · {created.id.slice(-6).toUpperCase()}</p>
          <h1>Pending verification</h1>
          <p className="success-lead">
            Your evidence is in the queue. It will not affect the risk score until{' '}
            {session?.verification.verifyThreshold ?? 3} independent neighbours confirm it. If it collects{' '}
            {session?.verification.flagThreshold ?? 3} flags, it goes to the municipal review desk instead.
          </p>

          <div className="success-card">
            <img src={created.media.url} alt="Your submitted evidence" />
            <div>
              <div className="success-card-top">
                <SeverityTag severity={created.severity} />
                <span className="hc-time">{timeAgo(created.createdAt)}</span>
              </div>
              <h2>
                {created.typeLabel} on {created.roadName}
              </h2>
              <p>{created.description}</p>
              <div className="success-progress">
                <div className="success-progress-label">
                  <span>Neighbour confirmations</span>
                  <span className="mono">
                    {created.verifyVotes}/{session?.verification.verifyThreshold ?? 3}
                  </span>
                </div>
                <div className="meter-track">
                  <span className="meter-fill meter-verify" style={{ width: '0%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="success-actions">
            <Link to={`/hazards/${created.id}`} className="btn btn-primary">
              Open my report <Icon name="arrow" size={16} />
            </Link>
            <Link to="/queue" className="btn btn-ghost">
              Verify other reports
            </Link>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setCreated(null);
                setStep(1);
                setType(null);
                setSeverity(null);
                setDescription('');
                setRoadId('');
                setGeo(null);
                setGeoState('idle');
                clearPhoto();
              }}
            >
              File another
            </button>
          </div>
          <p className="success-note">
            <Icon name="shield" size={14} /> Your coordinates and capture time are locked to this report for audit. The
            uploaded image was re-encoded to strip camera metadata.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="shell page-pad report-page">
      <header className="page-head">
        <p className="eyebrow">File a hazard</p>
        <h1>Report a road hazard</h1>
        <p className="page-sub">
          Three steps, under a minute. Live evidence and a location reading are required — this is what keeps the
          leaderboard clean.
        </p>
      </header>

      <ol className="steps">
        {[
          { n: 1, label: 'The hazard' },
          { n: 2, label: 'The location' },
          { n: 3, label: 'The evidence' },
        ].map((s) => (
          <li
            key={s.n}
            className={`step${step === s.n ? ' current' : ''}${step > s.n ? ' done' : ''}`}
            onClick={() => {
              if (s.n < step) setStep(s.n as Step);
            }}
          >
            <span className="step-num">{step > s.n ? <Icon name="check" size={14} strokeWidth={2.4} /> : s.n}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="report-layout">
        <div className="report-panel">
          {step === 1 && (
            <section className="panel-step">
              <h2 className="step-title">What is wrong with the road?</h2>
              <p className="step-sub">Pick the closest match. Severity drives how much the hazard weighs on the board.</p>

              <div className="field-block">
                <span className="field-label">Hazard type</span>
                <div className="type-grid">
                  {TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`type-option${type === t ? ' selected' : ''}`}
                      onClick={() => setType(t)}
                    >
                      <span className="type-ico">
                        <Icon
                          name={t === 'pothole' ? 'alert' : t === 'manhole' ? 'pin' : t === 'collapse' ? 'shield' : 'flag'}
                          size={19}
                        />
                      </span>
                      {HAZARD_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field-block">
                <span className="field-label">Severity</span>
                <div className="sev-grid">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={`sev-option sev-option-${s}${severity === s ? ' selected' : ''}`}
                      onClick={() => setSeverity(s)}
                    >
                      <span className="sev-option-top">
                        <SeverityTag severity={s} />
                        <span className="mono sev-weight">+{SEVERITY_WEIGHT[s]} pts</span>
                      </span>
                      <span className="sev-copy">{SEVERITY_COPY[s]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>
                  What should other road users know? <em className="req">required</em>
                </span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={600}
                  placeholder="Example: deep pothole in the left lane just past the junction, filled with water and hard to see at night."
                />
                <span className={`field-hint${description && !descriptionOk ? ' is-error' : ''}`}>
                  {description.trim().length}/600 · at least 15 characters
                </span>
              </label>

              <div className="step-actions">
                <span className="step-note">
                  <Icon name="shield" size={14} /> Reports stay private until verified
                </span>
                <button type="button" className="btn btn-primary" disabled={!step1Ok} onClick={() => setStep(2)}>
                  Continue to location <Icon name="arrow" size={16} />
                </button>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="panel-step">
              <h2 className="step-title">Pin it to the right stretch</h2>
              <p className="step-sub">
                Pick the road, then capture your GPS position. The server rejects readings more than 2 km from the road
                anchor.
              </p>

              <div className="field-block">
                <span className="field-label">Road stretch</span>
                <div className="road-picker">
                  {roads.map((r) => {
                    const dist = geo ? haversineKm(geo, r) : null;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        className={`road-option${roadId === r.id ? ' selected' : ''}`}
                        onClick={() => setRoadId(r.id)}
                      >
                        <span className="road-option-main">
                          <strong>{r.name}</strong>
                          <span>{r.stretch}</span>
                        </span>
                        <span className="road-option-side">
                          {dist !== null && <span className="mono">{dist.toFixed(1)} km</span>}
                          {r.rank && <span className="mono road-rank">#{r.rank}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="geo-panel">
                <div className="geo-head">
                  <span className="field-label">Location reading</span>
                  {geo && (
                    <span className={`geo-status ${geo.source === 'anchor' ? 'anchor' : ''}`}>
                      <Icon name={geo.source === 'gps' ? 'locate' : 'pin'} size={13} />
                      {geo.source === 'gps' ? 'GPS captured' : 'Road anchor used'}
                    </span>
                  )}
                </div>
                {geo ? (
                  <div className="geo-readout">
                    <div>
                      <span>Latitude</span>
                      <strong className="mono">{geo.lat.toFixed(6)}</strong>
                    </div>
                    <div>
                      <span>Longitude</span>
                      <strong className="mono">{geo.lng.toFixed(6)}</strong>
                    </div>
                    <div>
                      <span>Accuracy</span>
                      <strong className="mono">{geo.accuracy ? `±${geo.accuracy} m` : 'anchor'}</strong>
                    </div>
                    <div>
                      <span>Distance to road</span>
                      <strong className={`mono${distanceKm !== null && distanceKm > 2 ? ' is-error' : ''}`}>
                        {distanceKm !== null ? `${distanceKm.toFixed(2)} km` : 'choose road'}
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p className="geo-empty">No reading yet. Stand at the hazard and capture your position.</p>
                )}
                {geoError && <p className="form-error">{geoError}</p>}
                <div className="geo-actions">
                  <button type="button" className="btn btn-secondary" onClick={detectLocation} disabled={geoState === 'locating'}>
                    <Icon name="locate" size={16} />
                    {geoState === 'locating' ? 'Getting a fix…' : geo ? 'Recapture GPS' : 'Capture my GPS'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={useRoadAnchor} disabled={!road}>
                    Use road anchor instead
                  </button>
                </div>
                <p className="geo-hint">
                  <Icon name="lock" size={13} /> GPS matching proves the hazard was photographed where it is reported.
                  Use the road anchor only when GPS is unavailable in this demo.
                </p>
              </div>

              <div className="step-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!step2Ok || (distanceKm !== null && distanceKm > 2)}
                  onClick={() => setStep(3)}
                >
                  Continue to evidence <Icon name="arrow" size={16} />
                </button>
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="panel-step">
              <h2 className="step-title">Attach live photo evidence</h2>
              <p className="step-sub">
                Take the photo on the spot. We re-encode it on your device to strip identifying metadata, then the
                server checks the file is fresh and genuinely an image.
              </p>

              {photo && preview ? (
                <div className="photo-preview">
                  <img src={preview} alt="Hazard evidence preview" />
                  <div className="photo-preview-bar">
                    <span>
                      <Icon name="check" size={14} /> {fromSample ? 'Sample evidence loaded' : 'Photo captured just now'}
                    </span>
                    <div className="photo-preview-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                        Retake
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={clearPhoto}>
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button type="button" className="upload-zone" onClick={() => fileRef.current?.click()} disabled={preparing}>
                  <span className="upload-icon">
                    <Icon name="camera" size={26} />
                  </span>
                  <strong>{preparing ? 'Preparing photo…' : 'Take a photo of the hazard'}</strong>
                  <span>Opens your camera on mobile · JPEG, PNG or WebP · up to 12 MB</span>
                </button>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={(e) => void takePhoto(e.target.files?.[0] ?? null)}
              />

              {!photo && (
                <div className="sample-row">
                  <span>No pothole nearby? Load demo evidence:</span>
                  {SAMPLES.map((s) => (
                    <button key={s.url} type="button" className="sample-chip" onClick={() => void useSample(s.url)}>
                      {s.label}
                    </button>
                  ))}
                </div>
              )}

              <div className="evidence-checks">
                <h3>Server-side evidence checks</h3>
                <ul>
                  <li className={photo && capturedAt ? 'ok' : ''}>
                    <Icon name="check" size={14} /> Live capture within 45 minutes
                  </li>
                  <li className={geo ? 'ok' : ''}>
                    <Icon name="check" size={14} /> GPS reading inside the road zone
                  </li>
                  <li className={photo && originalModified && Date.now() - originalModified < 12 * 3600_000 ? 'ok' : ''}>
                    <Icon name="check" size={14} /> New image file, not an archived download
                  </li>
                  <li className={photo ? 'ok' : ''}>
                    <Icon name="check" size={14} /> Real image signature, personal metadata stripped
                  </li>
                </ul>
              </div>

              <div className="submit-summary">
                <div>
                  <span>Hazard</span>
                  <strong>{type ? HAZARD_LABEL[type] : '—'}</strong>
                </div>
                <div>
                  <span>Severity</span>
                  <strong>{severity ? <SeverityTag severity={severity} /> : '—'}</strong>
                </div>
                <div>
                  <span>Road</span>
                  <strong>{road ? road.name : '—'}</strong>
                </div>
              </div>

              {distanceKm !== null && distanceKm > 2 && (
                <p className="form-error">
                  Your reading is {distanceKm.toFixed(1)} km from {road?.name}. Go back and choose the correct road.
                </p>
              )}
              {submitError && <p className="form-error">{submitError}</p>}

              <div className="step-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                  Back
                </button>
                <button type="button" className="btn btn-primary btn-lg" disabled={!canSubmit} onClick={() => void submit()}>
                  {submitting ? 'Filing…' : 'Submit for verification'}
                  {!submitting && <Icon name="arrow" size={17} />}
                </button>
              </div>
              <p className="submit-fine">
                Filing as <strong>{session?.user.displayName ?? 'New witness'}</strong>. One identity gets one vote.
                Submitting does not add points to the leaderboard — verification does.
              </p>
            </section>
          )}
        </div>

        <aside className="report-aside">
          <div className="aside-card">
            <h3>
              <Icon name="shield" size={17} /> What happens next
            </h3>
            <ol className="next-list">
              <li>
                <span>1</span>
                <div>
                  <strong>Pending queue</strong>
                  <p>Your report is visible to commuters on this stretch, but scores zero.</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>3 neighbour confirmations</strong>
                  <p>Different identities, one vote each. Then it becomes a verified hazard.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Risk score + municipal desk</strong>
                  <p>It starts compounding 1.5 points per day until the desk marks it repaired.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="aside-card aside-soft">
            <h3>
              <Icon name="alert" size={17} /> Before you file
            </h3>
            <ul className="check-list">
              <li>Is there already a report on this stretch?</li>
              <li>Is the photo taken right at the hazard?</li>
              <li>Could you describe how to find it precisely?</li>
            </ul>
            <Link to="/queue" className="aside-link">
              Check the pending queue first <Icon name="arrow" size={14} />
            </Link>
          </div>
          {roadsQuery.error && <ErrorBox message={roadsQuery.error} onRetry={roadsQuery.reload} />}
        </aside>
      </div>
    </div>
  );
}
