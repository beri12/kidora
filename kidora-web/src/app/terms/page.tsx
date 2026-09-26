import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/LegalPage';

export const metadata: Metadata = { title: 'Terms of Service · Kidora' };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 2026">
      <p>These terms cover your use of Kidora, a learning platform for children, their families, teachers and schools. By creating an account you agree to them.</p>
      <h2>Accounts</h2>
      <ul>
        <li>Keep your password private. You are responsible for activity on your account.</li>
        <li>Children under 13 should use Kidora with a parent, guardian or school that agrees to these terms on their behalf.</li>
        <li>School and district leader accounts are verified before they can manage students.</li>
      </ul>
      <h2>Using Kidora</h2>
      <ul>
        <li>Be kind. Don&apos;t upload anything harmful, hateful, or that you don&apos;t have the right to share.</li>
        <li>Teachers own the courses they create and are responsible for their content. Course access codes should only be shared with the students they are meant for.</li>
        <li>Don&apos;t try to break, overload or get around the platform&apos;s security or access rules.</li>
      </ul>
      <h2>Plans and payments</h2>
      <p>Paid plans renew as described on the pricing page. Payments are handled by our payment partners; Kidora never stores card numbers.</p>
      <h2>Ending your account</h2>
      <p>You can stop using Kidora at any time. We may suspend accounts that break these terms or put children at risk.</p>
      <h2>Contact</h2>
      <p>Questions about these terms? Write to us through the Support page in your account.</p>
    </LegalPage>
  );
}
