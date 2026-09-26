import type { Metadata } from 'next';
import { LegalPage } from '@/components/shared/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy · Kidora' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 2026">
      <p>Kidora is built for children, so we collect as little as we can and never sell personal data.</p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: name, email address and a password (stored only as a secure hash), or the basic profile a sign-in provider (Google, Facebook, TikTok) shares with us.</li>
        <li>For students: date of birth and grade, used to suggest age-appropriate content, and an optional school.</li>
        <li>Learning activity: courses, lessons, quiz and game results, badges and streaks.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run your account and show progress to you — and, for students, to their linked parents, teachers and school.</li>
        <li>To keep Kidora safe: sign-in protection, fraud prevention and abuse reports.</li>
        <li>We do not show advertising to children and do not sell or rent personal data.</li>
      </ul>
      <h2>Who can see a student&apos;s information</h2>
      <p>Only the student, their linked parents or guardians, the teachers of their classes, their school&apos;s verified leaders, and Kidora staff who need it to help.</p>
      <h2>Your choices</h2>
      <p>You can view and update your details in Settings, and ask us to delete an account through the Support page. Parents can ask us to review or delete their child&apos;s data.</p>
      <h2>Contact</h2>
      <p>Questions about privacy? Write to us through the Support page in your account.</p>
    </LegalPage>
  );
}
