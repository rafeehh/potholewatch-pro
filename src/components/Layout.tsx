import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { Avatar } from './ui';
import { useSession } from '../lib/session';

const NAV = [
  { to: '/', label: 'Overview', end: true },
  { to: '/leaderboard', label: 'Risk leaderboard' },
  { to: '/queue', label: 'Verify queue' },
  { to: '/municipal', label: 'Municipal desk' },
];

function BrandMark() {
  return (
    <svg width="36" height="36" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#0d1526" />
      <path d="M9 42h46" stroke="#f4b740" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M15 35c4-6 10-8 17-8s13 2 17 8c-3 5-8 8-17 8s-15-3-17-8z"
        fill="#0d1526"
        stroke="#ff5a3c"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="32" r="4" fill="#ff5a3c" />
    </svg>
  );
}

export default function Layout() {
  const { session, rename } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [nameOpen, setNameOpen] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [location.pathname]);

  useEffect(() => {
    if (!nameOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNameOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nameOpen]);

  const openName = () => {
    setName(session?.user.name || '');
    setNameError('');
    setNameOpen(true);
  };

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setNameError('');
    try {
      await rename(name);
      setNameOpen(false);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not save that name.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app">
      <header className="site-head">
        <div className="shell head-inner">
          <Link to="/" className="brand" aria-label="PotholeWatch Pro home">
            <BrandMark />
            <span className="brand-text">
              PotholeWatch<span className="brand-pro">PRO</span>
            </span>
          </Link>

          <nav className={`main-nav${menuOpen ? ' open' : ''}`} aria-label="Main">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="nav-mobile-extra">
              <Link to="/report" className="btn btn-primary btn-block">
                Report a hazard
              </Link>
            </div>
          </nav>

          <div className="head-actions">
            <Link to="/report" className="btn btn-primary head-cta">
              <Icon name="plus" size={16} strokeWidth={2.2} />
              Report a hazard
            </Link>
            <button type="button" className="identity" onClick={openName} title="Edit your display name">
              <Avatar name={session?.user.name || 'Guest'} size={32} />
              <span className="identity-text">
                <span className="identity-name">{session?.user.displayName || 'New witness'}</span>
                <span className="identity-sub">device verified</span>
              </span>
            </button>
            <button
              type="button"
              className="menu-btn"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={22} />
            </button>
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-foot">
        <div className="shell foot-grid">
          <div className="foot-brand">
            <div className="foot-logo">
              <BrandMark />
              <span className="brand-text">
                PotholeWatch<span className="brand-pro">PRO</span>
              </span>
            </div>
            <p>
              A crowdsourced road hazard register for Colombo, built around one rule: a hazard only counts when
              neighbours agree it is real.
            </p>
            <p className="foot-fine">
              Demonstration project. Seeded reports and photographs are illustrative; anything you file is stored on
              this server.
            </p>
          </div>
          <div className="foot-col">
            <h4>Platform</h4>
            <Link to="/leaderboard">Risk leaderboard</Link>
            <Link to="/queue">Verification queue</Link>
            <Link to="/report">File a report</Link>
            <Link to="/municipal">Municipal desk</Link>
          </div>
          <div className="foot-col">
            <h4>The rules</h4>
            <span>Live photo evidence required</span>
            <span>3 neighbour verifications to count</span>
            <span>3 flags pulls a report from public view</span>
            <span>One identity, one vote per hazard</span>
          </div>
          <div className="foot-col">
            <h4>Risk score</h4>
            <span className="mono foot-formula">(verified × weight) + (votes × 2) + (days × 1.5)</span>
            <span>Critical 50 · Medium 25 · Low 10</span>
            <span>Repaired hazards leave the score</span>
          </div>
        </div>
        <div className="shell foot-bottom">
          <span>© {new Date().getFullYear()} PotholeWatch Pro — civic demo</span>
          <span className="mono">Colombo · 7 stretches watched</span>
        </div>
      </footer>

      {nameOpen && (
        <div className="modal-wrap" role="presentation" onMouseDown={() => setNameOpen(false)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="name-title"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <button type="button" className="modal-close" onClick={() => setNameOpen(false)} aria-label="Close">
              <Icon name="close" size={18} />
            </button>
            <h3 id="name-title">Who is verifying?</h3>
            <p className="modal-copy">
              Neighbours see a shortened name next to your votes and comments, like “Nadia P.”. Your session is tied to
              this browser so the same person cannot verify a hazard twice.
            </p>
            <form onSubmit={saveName}>
              <label className="field">
                <span>Display name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Nadia Perera"
                  maxLength={40}
                  autoFocus
                />
              </label>
              {nameError && <p className="form-error">{nameError}</p>}
              <div className="modal-actions">
                <button type="button" className="btn btn-ghost" onClick={() => setNameOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving || name.trim().length < 2}>
                  {saving ? 'Saving…' : 'Save name'}
                </button>
              </div>
            </form>
            <p className="modal-note">
              <Icon name="lock" size={13} /> Demo identity: no phone number or password is collected.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
