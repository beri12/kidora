import type { LmsCertificate } from '@/types';

/** Printable-looking certificate tile with its verification serial. */
export function CertificateCard({ certificate }: { certificate: LmsCertificate }) {
  const issued = new Date(certificate.issuedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article className="rounded-3xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white p-6 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="text-4xl" aria-hidden>🎓</div>
        {typeof certificate.score === 'number' && (
          <span className="rounded-full bg-amber-100 px-3 py-1 font-display text-sm font-extrabold text-amber-700">
            {certificate.score}%
          </span>
        )}
      </div>

      <h3 className="mt-3 font-display text-xl font-extrabold text-brand-900">{certificate.courseName}</h3>
      {certificate.studentName && (
        <p className="mt-1 font-body font-bold text-brand-600">Awarded to {certificate.studentName}</p>
      )}
      <dl className="mt-3 space-y-0.5 font-body-x text-[12px] text-brand-500">
        {certificate.schoolName && (
          <div>
            <dt className="inline">School: </dt>
            <dd className="inline">{certificate.schoolName}</dd>
          </div>
        )}
        {certificate.gradeName && (
          <div>
            <dt className="inline">Grade: </dt>
            <dd className="inline">{certificate.gradeName}</dd>
          </div>
        )}
        <div>
          <dt className="inline">Issued: </dt>
          <dd className="inline">{issued}</dd>
        </div>
        {certificate.serial && (
          <div>
            <dt className="inline">Certificate ID: </dt>
            <dd className="inline font-mono">{certificate.serial}</dd>
          </div>
        )}
      </dl>
    </article>
  );
}
