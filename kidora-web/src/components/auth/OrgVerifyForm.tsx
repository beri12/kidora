'use client';

import { useRef, useState } from 'react';
import { api } from '@/lib/axios';
import { apiErrorMessage } from '@/lib/api-error';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { FieldError, Input, Label } from '@/components/ui/input';
import type { SubmitOrgRequestResponse } from '@/types';

type VerifiedRole = 'SCHOOL_ADMIN' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN';

interface Props {
  role: VerifiedRole;
  /** Fired once the claim is recorded — pending, or approved by a code. */
  onSubmitted: (res: SubmitOrgRequestResponse) => void;
  onBack: () => void;
}

/**
 * The verification step. Two ways through it:
 *
 *  - an organisation code, which approves on the spot because the school or
 *    district handed it over themselves;
 *  - the details of the organisation, which a reviewer checks by hand.
 *
 * The code path is offered first: it is instant, and most people arriving here
 * were invited by a colleague.
 */
export function OrgVerifyForm({ role, onSubmitted, onBack }: Props) {
  const submitOrgRequest = useAuthStore((s) => s.submitOrgRequest);
  const isDistrict = role === 'DISTRICT_ADMIN';
  const noun = isDistrict ? 'district' : 'school';

  const [mode, setMode] = useState<'code' | 'apply'>('code');
  const [form, setForm] = useState<Record<string, string>>({
    joinCode: '',
    organizationName: '',
    jobTitle: '',
    country: '',
    region: '',
    website: '',
    workEmail: '',
    studentCount: '',
    note: '',
  });
  const [evidence, setEvidence] = useState<{ url: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const set = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: '', form: '' }));
  };

  async function uploadEvidence(file: File) {
    setUploading(true);
    setErrors((e) => ({ ...e, evidence: '' }));
    try {
      const body = new FormData();
      body.append('file', file);
      const { data } = await api.post<{ url: string; fileName: string }>('/media/upload/file', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setEvidence({ url: data.url, name: data.fileName });
    } catch (e) {
      setErrors((err) => ({ ...err, evidence: apiErrorMessage(e, "That file couldn't be uploaded.") }));
    } finally {
      setUploading(false);
    }
  }

  function validate() {
    const next: Record<string, string> = {};
    if (mode === 'code') {
      if (form.joinCode.trim().length < 4) next.joinCode = 'Enter the code your colleague shared';
    } else {
      if (form.organizationName.trim().length < 2) next.organizationName = `Enter your ${noun}'s name`;
      if (form.jobTitle.trim().length < 2) next.jobTitle = 'Enter your role there';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || busy) return;
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        requestedRole: role,
        // The API needs a name either way; with a code it is only a label,
        // since the organisation itself is found by the code.
        organizationName: form.organizationName.trim() || `My ${noun}`,
        jobTitle: form.jobTitle.trim() || 'Staff',
      };

      if (mode === 'code') {
        payload.joinCode = form.joinCode.trim();
      } else {
        Object.assign(payload, {
          country: form.country.trim() || undefined,
          region: form.region.trim() || undefined,
          website: form.website.trim() || undefined,
          workEmail: form.workEmail.trim() || undefined,
          studentCount: form.studentCount ? Number(form.studentCount) : undefined,
          note: form.note.trim() || undefined,
          evidenceUrl: evidence?.url,
        });
      }

      onSubmitted(await submitOrgRequest(payload));
    } catch (err) {
      setErrors({ form: apiErrorMessage(err, "We couldn't send that. Please try again.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="animate-slide-in-right">
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1 font-body font-extrabold text-brand-500 transition hover:-translate-x-0.5 hover:text-brand-700"
      >
        ← Choose a different role
      </button>

      <h1 className="font-display text-3xl font-extrabold text-brand-900">
        Verify your {noun}
      </h1>
      <p className="mt-1 font-body font-bold text-brand-500">
        Administrative access is checked before it is switched on.
      </p>

      {/* Code first: it is the instant path, and most people were invited. */}
      <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-brand-50 p-1">
        {([
          ['code', 'I have a code'],
          ['apply', `Register a ${noun}`],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => { setMode(key); setErrors({}); }}
            className={
              'rounded-xl py-2.5 font-display font-extrabold transition-all duration-200 ' +
              (mode === key ? 'bg-white text-brand-800 shadow-card' : 'text-brand-500 hover:text-brand-700')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'code' ? (
        <div className="mt-5 animate-slide-down">
          <Label>{isDistrict ? 'District' : 'School'} code</Label>
          <Input
            value={form.joinCode}
            onChange={(e) => set('joinCode', e.target.value.toUpperCase())}
            placeholder="K7M2QP"
            autoCapitalize="characters"
            className="font-display text-xl tracking-[0.2em]"
          />
          <FieldError>{errors.joinCode}</FieldError>
          <p className="mt-2 font-body-x text-[12px] leading-relaxed text-brand-500">
            Someone who already administers your {noun} can find this in their dashboard. With a
            valid code you are approved immediately.
          </p>
        </div>
      ) : (
        <div className="mt-5 animate-slide-down">
          <Label>{isDistrict ? 'District' : 'School'} name</Label>
          <Input
            value={form.organizationName}
            onChange={(e) => set('organizationName', e.target.value)}
            placeholder={isDistrict ? 'Addis Ababa District' : 'Sunrise Academy'}
          />
          <FieldError>{errors.organizationName}</FieldError>

          <div className="h-3" />
          <Label>Your role there</Label>
          <Input
            value={form.jobTitle}
            onChange={(e) => set('jobTitle', e.target.value)}
            placeholder={isDistrict ? 'Superintendent' : 'Principal'}
          />
          <FieldError>{errors.jobTitle}</FieldError>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="h-3" />
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => set('country', e.target.value)} placeholder="Ethiopia" />
            </div>
            <div>
              <div className="h-3" />
              <Label>{isDistrict ? 'Region' : 'City / region'}</Label>
              <Input value={form.region} onChange={(e) => set('region', e.target.value)} placeholder="Addis Ababa" />
            </div>
          </div>

          <div className="h-3" />
          <Label>Work email</Label>
          <Input
            type="email"
            value={form.workEmail}
            onChange={(e) => set('workEmail', e.target.value)}
            placeholder={`principal@${noun}.edu`}
          />
          <p className="mt-1 font-body-x text-[12px] text-brand-400">
            An address on your {noun}&apos;s own domain is the quickest thing for us to check.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="h-3" />
              <Label>Website</Label>
              <Input value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="sunrise.edu.et" />
            </div>
            <div>
              <div className="h-3" />
              <Label>{isDistrict ? 'Schools' : 'Students'}</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={form.studentCount}
                onChange={(e) => set('studentCount', e.target.value)}
                placeholder={isDistrict ? '12' : '500'}
              />
            </div>
          </div>

          <div className="h-4" />
          <Label>Proof (optional)</Label>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadEvidence(file);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50 px-4 py-3.5 text-left transition hover:border-brand-400 hover:bg-white disabled:opacity-60"
          >
            <span className="text-xl">{evidence ? '✅' : '📎'}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-body font-extrabold text-brand-800">
                {uploading ? 'Uploading…' : evidence ? evidence.name : 'Attach a letter or staff card'}
              </span>
              <span className="block font-body-x text-[12px] text-brand-400">
                {evidence ? 'Tap to replace' : 'PDF or image — speeds up the check'}
              </span>
            </span>
          </button>
          <FieldError>{errors.evidence}</FieldError>

          <div className="h-3" />
          <Label>Anything else? (optional)</Label>
          <textarea
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            rows={3}
            placeholder="How we can confirm your role"
            className="w-full resize-none rounded-2xl border-2 border-brand-200 bg-brand-50 px-4 py-3 font-body font-bold text-brand-900 outline-none transition-colors placeholder:text-brand-400 focus:border-brand-600"
          />
        </div>
      )}

      <FieldError>{errors.form}</FieldError>

      <Button type="submit" variant="grass" size="lg" className="mt-5 w-full" disabled={busy || uploading}>
        {busy ? 'Sending…' : mode === 'code' ? 'Join with code →' : 'Submit for review →'}
      </Button>
    </form>
  );
}
