// app/profile/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { initials } from '@/lib/utils';
import { SIGNUP_ROLES } from '@/constants';
import { useI18n } from '@/lib/i18n';
import type { RoleField } from '@/constants';

const AVATAR_COLORS = [
  '#7C3AED', // brand
  '#16A34A', // grass
  '#0284C7', // sky
  '#E11D48', // rose
  '#D97706', // amber
  '#0D9488', // teal
];

// Fallback look for roles that have no SIGNUP_ROLES entry (e.g. ADMIN).
const DEFAULT_ROLE_META = {
  name: 'Kidora',
  emoji: '🐵',
  bg: 'from-brand-500 to-brand-800',
  shadow: 'rgba(109,40,217,.5)',
  fields: [] as RoleField[],
};

function roleLabel(name: string) {
  return name;
}

export default function ProfilePage() {
  const router = useRouter();
  const { t } = useI18n();
  const { user, logout, updateUser } = useAuthStore() as any; // updateUser optional, wire to your store

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarColor, setAvatarColor] = useState('');
  const [meta, setMeta] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user === null) router.replace('/login');
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setAvatarColor(user.avatarColor ?? AVATAR_COLORS[0]);
    setMeta(user.meta ?? {});
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-[1240px] mx-auto px-4 py-20 text-center text-brand-400 font-body-x">
        {t('profile.loading') ?? 'Loading your profile…'}
      </div>
    );
  }

  const roleMeta = SIGNUP_ROLES.find((r) => r.key === user.role) ?? DEFAULT_ROLE_META;
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;

  function handleFieldChange(key: string, value: string) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      // TODO: replace with a real API call, e.g. await api.patch('/me', payload)
      await updateUser?.({ name, email, avatarColor, meta });
      setSaved(true);
      setEditing(false);
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  function handleCancel() {
    setName(user.name ?? '');
    setEmail(user.email ?? '');
    setAvatarColor(user.avatarColor ?? AVATAR_COLORS[0]);
    setMeta(user.meta ?? {});
    setEditing(false);
  }

  return (
    <div className="max-w-[1240px] mx-auto px-4 sm:px-5 py-10">
      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* ---------- Passport card ---------- */}
        <aside className="lg:sticky lg:top-24 self-start">
          <div className={`rounded-2xl border-2 border-brand-100 shadow-2xl overflow-hidden bg-white`}>
            <div className={`h-24 bg-gradient-to-br ${roleMeta.bg} relative`}>
              {/* passport "stamp" */}
              {memberSince && (
                <div className="absolute -bottom-2 right-4 rotate-[-8deg] rounded-full border-2 border-dashed border-white/70 px-3 py-1 text-[10px] font-display font-extrabold tracking-wide text-white/90 bg-white/10 backdrop-blur-sm">
                  SINCE {memberSince.toUpperCase()}
                </div>
              )}
            </div>

            <div className="px-5 pb-5 -mt-10 flex flex-col items-start">
              <div className="relative">
                <div
                  className="w-20 h-20 rounded-2xl grid place-items-center text-white font-display font-extrabold text-2xl border-4 border-white shadow-lg"
                  style={{ background: avatarColor }}
                >
                  {initials(name || user.name)}
                </div>
                <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white border-2 border-brand-100 grid place-items-center text-base">
                  {roleMeta.emoji}
                </span>
              </div>

              <h1 className="mt-3 font-display font-extrabold text-xl text-brand-900 truncate w-full">
                {name || user.name}
              </h1>
              <p className="text-sm font-body-x text-brand-500 truncate w-full">{email || user.email}</p>

              <span className="mt-3 inline-block px-3 py-1 rounded-full bg-brand-50 border border-brand-100 text-xs font-display font-extrabold text-brand-700">
                {roleLabel(roleMeta.name)}
              </span>

              {editing && (
                <div className="mt-4 w-full">
                  <p className="text-xs font-display font-extrabold text-brand-500 mb-2">
                    {t('profile.avatarColor') ?? 'Avatar color'}
                  </p>
                  <div className="flex gap-2">
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-label={`Use color ${c}`}
                        onClick={() => setAvatarColor(c)}
                        className={`w-7 h-7 rounded-full border-2 ${avatarColor === c ? 'border-brand-900' : 'border-white'} shadow`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setPwOpen((o) => !o)}
                className="mt-5 w-full text-left px-3 py-2.5 rounded-xl font-body-x text-sm text-brand-700 hover:bg-brand-50"
              >
                {t('profile.changePassword') ?? 'Change password'}
              </button>

              {pwOpen && <PasswordFields t={t} />}

              <button
                onClick={logout}
                className="mt-2 w-full text-left px-3 py-2.5 rounded-xl font-body-x text-sm text-rose-600 hover:bg-rose-50"
              >
                {t('nav.logout') ?? 'Log out'}
              </button>
            </div>
          </div>
        </aside>

        {/* ---------- Main content ---------- */}
        <main className="flex flex-col gap-6">
          {/* Stats strip, tailored per role */}
          <RoleStats role={user.role} user={user} t={t} />

          {/* Editable details */}
          <section className="rounded-2xl border-2 border-brand-100 bg-white shadow-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-lg text-brand-900">
                {t('profile.details') ?? 'Your details'}
              </h2>
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="px-4 py-2 rounded-xl font-display font-extrabold text-sm text-white bg-gradient-to-br from-brand-600 to-brand-800"
                >
                  {t('profile.edit') ?? 'Edit'}
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-xl font-display font-extrabold text-sm text-brand-700 bg-brand-100"
                  >
                    {t('profile.cancel') ?? 'Cancel'}
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl font-display font-extrabold text-sm text-white bg-gradient-to-br from-grass-600 to-grass-800 disabled:opacity-60"
                  >
                    {saving ? (t('profile.saving') ?? 'Saving…') : (t('profile.save') ?? 'Save changes')}
                  </button>
                </div>
              )}
            </div>

            {saved && (
              <p className="mb-4 text-sm font-body-x text-grass-700 bg-grass-50 border border-grass-100 rounded-xl px-3 py-2">
                {t('profile.saved') ?? 'Profile updated.'}
              </p>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              <TextField
                label={t('profile.name') ?? 'Name'}
                value={name}
                editable={editing}
                onChange={setName}
              />
              <TextField
                label={t('profile.email') ?? 'Email'}
                value={email}
                editable={editing}
                onChange={setEmail}
                type="email"
              />
            </div>

            {roleMeta.fields.length > 0 && (
              <>
                <div className="h-px bg-brand-100 my-5" />
                <p className="text-xs font-display font-extrabold text-brand-400 mb-3 uppercase tracking-wide">
                  {roleLabel(roleMeta.name)} {t('profile.info') ?? 'info'}
                </p>
                <div className="grid sm:grid-cols-2 gap-4">
                  {roleMeta.fields.map((f: RoleField) => (
                    <RoleFieldInput
                      key={f.key}
                      field={f}
                      value={meta[f.key] ?? ''}
                      editable={editing}
                      onChange={(v) => handleFieldChange(f.key, v)}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  editable,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-display font-extrabold text-brand-500 mb-1.5">{label}</span>
      {editable ? (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 font-body-x text-sm text-brand-900 focus:outline-none focus:border-brand-400"
        />
      ) : (
        <p className="px-3 py-2.5 rounded-xl bg-brand-50 font-body-x text-sm text-brand-900">{value || '—'}</p>
      )}
    </label>
  );
}

function RoleFieldInput({
  field,
  value,
  editable,
  onChange,
}: {
  field: RoleField;
  value: string;
  editable: boolean;
  onChange: (v: string) => void;
}) {
  if (editable && field.type === 'select' && field.options) {
    return (
      <label className="block">
        <span className="block text-xs font-display font-extrabold text-brand-500 mb-1.5">{field.label}</span>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border-2 border-brand-100 px-3 py-2.5 font-body-x text-sm text-brand-900 focus:outline-none focus:border-brand-400"
        >
          <option value="" disabled>
            {field.placeholder}
          </option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <TextField
      label={field.label}
      value={value}
      editable={editable}
      onChange={onChange}
      type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : 'text'}
    />
  );
}

function PasswordFields({ t }: { t: (k: string) => string | undefined }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const mismatch = next.length > 0 && confirm.length > 0 && next !== confirm;

  return (
    <div className="mt-2 w-full flex flex-col gap-2 animate-fade-in">
      <input
        type="password"
        placeholder={t('profile.currentPassword') ?? 'Current password'}
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        className="rounded-xl border-2 border-brand-100 px-3 py-2 font-body-x text-sm focus:outline-none focus:border-brand-400"
      />
      <input
        type="password"
        placeholder={t('profile.newPassword') ?? 'New password'}
        value={next}
        onChange={(e) => setNext(e.target.value)}
        className="rounded-xl border-2 border-brand-100 px-3 py-2 font-body-x text-sm focus:outline-none focus:border-brand-400"
      />
      <input
        type="password"
        placeholder={t('profile.confirmPassword') ?? 'Confirm new password'}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="rounded-xl border-2 border-brand-100 px-3 py-2 font-body-x text-sm focus:outline-none focus:border-brand-400"
      />
      {mismatch && <p className="text-xs text-rose-600 font-body-x">Passwords do not match.</p>}
      <button
        type="button"
        disabled={!current || !next || mismatch}
        // TODO: wire to your real change-password endpoint
        className="mt-1 px-3 py-2 rounded-xl font-display font-extrabold text-sm text-white bg-gradient-to-br from-brand-600 to-brand-800 disabled:opacity-50"
      >
        {t('profile.updatePassword') ?? 'Update password'}
      </button>
    </div>
  );
}

function RoleStats({ role, user, t }: { role: string; user: any; t: (k: string) => string | undefined }) {
  const stats = user.stats ?? {};

  const byRole: Record<string, { label: string; value: string | number; emoji: string }[]> = {
    CHILD: [
      { label: t('profile.badges') ?? 'Badges earned', value: stats.badges ?? 0, emoji: '🏅' },
      { label: t('profile.lessons') ?? 'Lessons done', value: stats.lessonsDone ?? 0, emoji: '📖' },
      { label: t('profile.streak') ?? 'Day streak', value: stats.streak ?? 0, emoji: '🔥' },
    ],
    PARENT: [
      { label: t('profile.children') ?? 'Children', value: stats.childrenCount ?? '—', emoji: '👪' },
      { label: t('profile.plan') ?? 'Plan', value: stats.planName ?? 'Free', emoji: '⭐' },
    ],
    TEACHER: [
      { label: t('profile.classes') ?? 'Classes', value: stats.classCount ?? 0, emoji: '🏫' },
      { label: t('profile.students') ?? 'Students', value: stats.studentCount ?? 0, emoji: '🎒' },
    ],
    SCHOOL_ADMIN: [
      { label: t('profile.teachers') ?? 'Teachers', value: stats.teacherCount ?? 0, emoji: '🍎' },
      { label: t('profile.students') ?? 'Students', value: stats.studentCount ?? 0, emoji: '🎒' },
    ],
    DISTRICT_ADMIN: [
      { label: t('profile.schools') ?? 'Schools', value: stats.schoolCount ?? 0, emoji: '🏛️' },
      { label: t('profile.students') ?? 'Students', value: stats.studentCount ?? 0, emoji: '🎒' },
    ],
  };

  const items = byRole[role];
  if (!items) return null;

  return (
    <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {items.map((s) => (
        <div key={s.label} className="rounded-2xl border-2 border-brand-100 bg-white shadow-sm p-4 flex items-center gap-3">
          <span className="text-2xl">{s.emoji}</span>
          <div>
            <p className="font-display font-extrabold text-lg text-brand-900 leading-none">{s.value}</p>
            <p className="text-xs font-body-x text-brand-500">{s.label}</p>
          </div>
        </div>
      ))}
    </section>
  );
}