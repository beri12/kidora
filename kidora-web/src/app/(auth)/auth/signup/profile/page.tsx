'use client';

import { Suspense, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronDown, KeyRound } from 'lucide-react';

import { CenteredAuthLayout } from '@/components/auth/kidora/layouts';
import { BackLink, Field, FormError, PrimaryButton, Stepper } from '@/components/auth/kidora/ui';
import { OrgVerifyForm } from '@/components/auth/OrgVerifyForm';
import { SchoolSearch, type SchoolHit } from '@/components/auth/SchoolSearch';
import { AUTH, authHref, safeNext } from '@/features/auth/routes';
import { useSignupAccount } from '@/features/auth/useSignupAccount';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';

const GRADES = ['Pre-K', 'Kindergarten', ...Array.from({ length: 12 }, (_, i) => `Grade ${i + 1}`)];

/** yyyy-mm-dd, `years` ago today (for the date picker's bounds). */
function yearsAgo(years: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

type ProfileRole = 'student' | 'teacher' | 'school-leader' | 'district-leader';

function ProfileScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'));
  const role = (params.get('role') ?? 'student') as ProfileRole;
  const user = useSignupAccount(authHref(AUTH.profile, { role }));
  const selectRole = useAuthStore((s) => s.selectRole);

  const [dob, setDob] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState<SchoolHit | null>(null);
  const [schoolCode, setSchoolCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const bounds = useMemo(() => ({ min: yearsAgo(18), max: yearsAgo(3) }), []);

  const back = authHref(AUTH.role, { next });
  const complete = authHref(AUTH.complete, { next });

  async function save(skip = false) {
    const errs: Record<string, string> = {};
    if (role === 'student') {
      if (!dob) errs.dob = 'Please enter your date of birth';
      else if (dob < bounds.min || dob > bounds.max) errs.dob = 'Students on Kidora are between 3 and 18 years old';
      if (!grade) errs.grade = 'Please choose your grade';
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setBusy(true);
    setErrors({});
    try {
      const extra: Record<string, string> = {};
      if (role === 'student') { extra.dateOfBirth = dob; extra.gradeLevel = grade; }
      if (!skip) {
        if (schoolCode.trim()) extra.schoolCode = schoolCode.trim().toUpperCase();
        else if (school) extra.schoolId = school.id;
      }
      await selectRole(role === 'student' ? 'CHILD' : 'TEACHER', extra);
      router.push(complete);
    } catch (e) {
      setErrors({ form: apiErrorMessage(e, "We couldn't save that. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  if (role === 'school-leader' || role === 'district-leader') {
    return (
      <CenteredAuthLayout logo={false}>
        <Stepper current={1} />
        <div className="mt-8">
          <OrgVerifyForm
            role={role === 'district-leader' ? 'DISTRICT_ADMIN' : 'SCHOOL_LEADER'}
            onBack={() => router.push(back)}
            onSubmitted={(res) => router.push(res.roleGranted ? complete : AUTH.pending)}
          />
        </div>
      </CenteredAuthLayout>
    );
  }

  const isStudent = role === 'student';
  return (
    <CenteredAuthLayout logo={false}>
      <div className="-mt-2 mb-4"><BackLink href={back}>Back</BackLink></div>
      <Stepper current={1} />

      <h1 data-anim="row" className="mt-8 font-display text-3xl font-extrabold text-ink">{isStudent ? 'Student Information' : 'Your school'}</h1>
      <p data-anim="row" className="mt-1 font-body font-semibold text-slate-600">
        {isStudent ? 'Tell us a little more about yourself.' : 'Teaching at a school on Kidora? Find it here — or skip and add it later.'}
      </p>

      <form onSubmit={(e) => { e.preventDefault(); void save(); }} noValidate className="mt-7 space-y-5">
        {isStudent && (
          <>
            <div data-anim="row">
              <Field label="Date of birth" icon={<CalendarDays className="h-[18px] w-[18px]" />} type="date" min={bounds.min} max={bounds.max}
                value={dob} onChange={(e) => { setDob(e.target.value); setErrors({}); }} error={errors.dob} autoComplete="bday" />
            </div>
            <div data-anim="row">
              <label htmlFor="grade" className="mb-1.5 block font-body text-sm font-extrabold text-ink">Grade</label>
              <div className={`relative rounded-xl border bg-white focus-within:border-iris-500 focus-within:ring-4 focus-within:ring-iris-100 ${errors.grade ? 'border-coral-500' : 'border-slate-200'}`}>
                <select id="grade" value={grade} onChange={(e) => { setGrade(e.target.value); setErrors({}); }} aria-invalid={Boolean(errors.grade)}
                  className="h-12 w-full appearance-none rounded-xl bg-transparent px-3.5 pr-10 font-body text-[15px] font-semibold text-ink outline-none">
                  <option value="">Select your grade</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3.5 top-3.5 h-5 w-5 text-slate-400" aria-hidden />
              </div>
              {errors.grade && <p role="alert" className="mt-1 font-body text-xs font-bold text-coral-600">{errors.grade}</p>}
            </div>
          </>
        )}

        <div data-anim="row"><SchoolSearch value={school} onChange={setSchool} label={isStudent ? 'School (optional)' : 'School'} /></div>

        <div data-anim="row">
          <Field
            label={school ? `${school.name} code (optional)` : 'School code (optional)'}
            icon={<KeyRound className="h-[18px] w-[18px]" />}
            value={schoolCode}
            onChange={(e) => { setSchoolCode(e.target.value.toUpperCase()); setErrors({}); }}
            placeholder="K7M2QP"
            maxLength={24}
            autoCapitalize="characters"
            className="[&_input]:uppercase [&_input]:tracking-widest"
            hint={school
              ? 'With the code you join straight away. Without it, the school approves your request.'
              : isStudent ? 'From your teacher. Learning at home? Leave it blank.' : 'From your school admin.'}
          />
        </div>

        <FormError>{errors.form}</FormError>
        <PrimaryButton type="submit" busy={busy}>Continue</PrimaryButton>
      </form>

      {!isStudent && (
        <button type="button" onClick={() => void save(true)} disabled={busy} className="mx-auto mt-4 block min-h-11 font-body text-sm font-extrabold text-iris-700 hover:underline">
          Skip for now
        </button>
      )}
    </CenteredAuthLayout>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={null}><ProfileScreen /></Suspense>;
}
