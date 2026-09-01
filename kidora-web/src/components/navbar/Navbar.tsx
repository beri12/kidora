'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { initials } from '@/lib/utils';
import { ROLE_HOME, SIGNUP_ROLES } from '@/constants';
import { SignupModal } from '@/components/shared/SignupModal';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useI18n } from '@/lib/i18n';

const PRODUCTS = [
  { name: 'Kidora',         emoji: '🐵', descKey: 'prod.kidora',  href: '/' },
  { name: 'Kidora Plus',    emoji: '⭐', descKey: 'prod.plus',    href: '/pricing' },
  { name: 'Kidora Islands', emoji: '🏝️', descKey: 'prod.islands', href: '/games' },
  { name: 'Kidora Tutor',   emoji: '🦉', descKey: 'prod.tutor',   href: '/ai-tutor' },
  { name: 'Kidora Sparks',  emoji: '✨', descKey: 'prod.sparks',  href: '/games' },
];

const AUDIENCES = [
  // These two landing pages live under /dashboard (that is where the route
  // files are); the links previously pointed at top-level paths that 404.
  { key: 'nav.teachers',  href: '/dashboard/for-teachers' },
  { key: 'nav.schools',   href: '/dashboard/school' },
  { key: 'nav.districts', href: '/dashboard/school' },
  { key: 'nav.families',  href: '/for-families' },
];

// Fallback look for roles with no SIGNUP_ROLES entry (e.g. ADMIN). Mirrors profile page.
const DEFAULT_ROLE_META = { name: 'Kidora', emoji: '🐵' };

export function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const [productsOpen, setProductsOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);   // mobile drawer
  const [mobProducts, setMobProducts] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false); // desktop avatar dropdown

  const profileRef = useRef<HTMLDivElement>(null);

  const closeMenu = () => { setMenuOpen(false); setMobProducts(false); };
  const openSignup = () => { closeMenu(); setSignupOpen(true); };

  const roleMeta = user ? SIGNUP_ROLES.find((r) => r.key === user.role) ?? DEFAULT_ROLE_META : null;

  // Close the desktop profile dropdown on an outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleLogout() {
    setProfileOpen(false);
    logout();
  }

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b-2 border-brand-100">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-5 h-16 flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2.5" onClick={closeMenu}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-grass-600 grid place-items-center text-white font-display font-extrabold">K</div>
          <span className="font-display font-extrabold text-xl text-brand-900">Kidora</span>
        </Link>

        {/* ---------- Desktop nav ---------- */}
        <nav className="ml-auto hidden lg:flex items-center gap-1">
          <div className="relative" onMouseEnter={() => setProductsOpen(true)} onMouseLeave={() => setProductsOpen(false)}>
            <button className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100 flex items-center gap-1">
              {t('nav.products')} <span className="text-[10px]">▾</span>
            </button>
            {productsOpen && (
              <div className="absolute right-0 top-full pt-2 w-[340px] animate-fade-in">
                <div className="bg-white rounded-2xl border-2 border-brand-100 shadow-2xl p-2">
                  {PRODUCTS.map((p) => (
                    <Link key={p.name} href={p.href} className="flex items-center gap-3 rounded-xl p-3 hover:bg-brand-50">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-xl">{p.emoji}</span>
                      <span>
                        <span className="block font-display font-extrabold text-sm text-brand-900">{p.name}</span>
                        <span className="block text-xs font-bold text-brand-500">{t(p.descKey)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {AUDIENCES.map((a) => (
            <Link key={a.key} href={a.href} className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100">{t(a.key)}</Link>
          ))}
          <Link href="/pricing" className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100">{t('nav.pricing')}</Link>

          <LanguageSwitcher />

          {user ? (
            <>
              <Link href={ROLE_HOME[user.role]} className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100">{t('nav.dashboard')}</Link>
              <Link href="/messages" className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-100">💬</Link>

              {/* Profile avatar opens a dropdown that mirrors the profile page's passport look */}
              <div className="relative ml-1" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  className="relative w-10 h-10 rounded-xl grid place-items-center text-white font-display font-extrabold"
                  style={{ background: user.avatarColor }}
                >
                  {initials(user.name)}
                  <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border-2 border-brand-100 grid place-items-center text-[11px]">
                    {roleMeta?.emoji}
                  </span>
                </button>

                {profileOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-white border-2 border-brand-100 shadow-2xl overflow-hidden animate-fade-in"
                  >
                    <div className="px-4 py-3 border-b border-brand-100">
                      <p className="font-display font-extrabold text-sm text-brand-900 truncate">{user.name}</p>
                      <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-brand-50 border border-brand-100 text-[11px] font-display font-extrabold text-brand-700">
                        {roleMeta?.emoji} {roleMeta?.name}
                      </span>
                    </div>

                    <Link
                      href="/profile"
                      role="menuitem"
                      onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-body-x text-brand-700 hover:bg-brand-50"
                    >
                      {t('nav.profileSettings')}
                    </Link>

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2.5 text-sm font-body-x text-rose-600 hover:bg-rose-50"
                    >
                      {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link href="/login" className="px-3 py-2 rounded-xl font-body-x text-sm text-brand-700">{t('nav.login')}</Link>
              <button onClick={() => setSignupOpen(true)} className="px-4 py-2 rounded-xl font-display font-extrabold text-sm text-white bg-gradient-to-br from-brand-600 to-brand-800">{t('nav.signup')}</button>
            </>
          )}
        </nav>

        {/* ---------- Mobile controls ---------- */}
        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <LanguageSwitcher />
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            className="w-10 h-10 grid place-items-center rounded-xl bg-brand-100 text-brand-800"
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            )}
          </button>
        </div>
      </div>

      {/* ---------- Mobile drawer ---------- */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 top-16 z-30 bg-brand-950/40 lg:hidden" onClick={closeMenu} />
          <div className="lg:hidden absolute left-0 right-0 top-16 z-40 bg-white border-b-2 border-brand-100 shadow-xl animate-fade-in max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="px-4 py-3 flex flex-col">
              {/* Identity strip, only when logged in */}
              {user && (
                <Link
                  href="/profile"
                  onClick={closeMenu}
                  className="flex items-center gap-3 px-3 py-3 mb-1 rounded-xl bg-brand-50"
                >
                  <span className="relative w-11 h-11 rounded-xl grid place-items-center text-white font-display font-extrabold" style={{ background: user.avatarColor }}>
                    {initials(user.name)}
                    <span className="absolute -bottom-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border-2 border-brand-100 grid place-items-center text-[11px]">
                      {roleMeta?.emoji}
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display font-extrabold text-sm text-brand-900 truncate">{user.name}</span>
                    <span className="block text-xs font-body-x text-brand-500 truncate">{roleMeta?.name}</span>
                  </span>
                </Link>
              )}

              {/* Products accordion */}
              <button onClick={() => setMobProducts((o) => !o)} className="flex items-center justify-between px-3 py-3 rounded-xl font-display font-extrabold text-brand-800 hover:bg-brand-50">
                {t('nav.products')} <span className={'text-xs transition-transform ' + (mobProducts ? 'rotate-180' : '')}>▾</span>
              </button>
              {mobProducts && (
                <div className="pl-3 flex flex-col">
                  {PRODUCTS.map((p) => (
                    <Link key={p.name} href={p.href} onClick={closeMenu} className="flex items-center gap-3 rounded-xl p-2.5 hover:bg-brand-50">
                      <span className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-lg">{p.emoji}</span>
                      <span>
                        <span className="block font-display font-extrabold text-sm text-brand-900">{p.name}</span>
                        <span className="block text-xs font-bold text-brand-500">{t(p.descKey)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )}

              {AUDIENCES.map((a) => (
                <Link key={a.key} href={a.href} onClick={closeMenu} className="px-3 py-3 rounded-xl font-display font-extrabold text-brand-700 hover:bg-brand-50">{t(a.key)}</Link>
              ))}
              <Link href="/pricing" onClick={closeMenu} className="px-3 py-3 rounded-xl font-display font-extrabold text-brand-700 hover:bg-brand-50">{t('nav.pricing')}</Link>

              <div className="h-px bg-brand-100 my-2" />

              {user ? (
                <>
                  <Link href={ROLE_HOME[user.role]} onClick={closeMenu} className="px-3 py-3 rounded-xl font-display font-extrabold text-brand-700 hover:bg-brand-50">{t('nav.dashboard')}</Link>
                  <Link href="/messages" onClick={closeMenu} className="px-3 py-3 rounded-xl font-display font-extrabold text-brand-700 hover:bg-brand-50">💬 Messages</Link>
                  <Link href="/profile" onClick={closeMenu} className="px-3 py-3 rounded-xl font-display font-extrabold text-brand-700 hover:bg-brand-50">{t('nav.profileSettings')}</Link>
                  <button onClick={() => { closeMenu(); logout(); }} className="text-left px-3 py-3 rounded-xl font-display font-extrabold text-rose-600 hover:bg-rose-50">{t('nav.logout')}</button>
                </>
              ) : (
                <div className="flex flex-col gap-2 pt-1">
                  <Link href="/login" onClick={closeMenu} className="w-full text-center px-4 py-3 rounded-xl font-display font-extrabold text-brand-700 bg-brand-100">{t('nav.login')}</Link>
                  <button onClick={openSignup} className="w-full px-4 py-3 rounded-xl font-display font-extrabold text-white bg-gradient-to-br from-brand-600 to-brand-800">{t('nav.signup')}</button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} onPick={(role) => { setSignupOpen(false); router.push(`/register?role=${role}`); }} />
    </header>
  );
}