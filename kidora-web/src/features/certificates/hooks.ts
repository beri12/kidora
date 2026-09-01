import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import type { CertificateEligibility, LmsCertificate } from '@/types';

export function useMyCertificates() {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: async () => (await api.get<LmsCertificate[]>('/certificates/me')).data,
  });
}

/** Explains what is still outstanding before a certificate can be issued. */
export function useCertificateEligibility(courseId?: string) {
  return useQuery({
    queryKey: ['certificate-eligibility', courseId],
    enabled: !!courseId,
    queryFn: async () =>
      (await api.get<CertificateEligibility>(`/certificates/eligibility/${courseId}`)).data,
  });
}
