import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { LegalPage, type LegalSection } from '@/components/shared/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service · Kidora',
  description: 'The terms that govern use of Kidora, the AI-powered gamified learning platform for children, families, teachers and schools.',
};

// Contact details are set per deployment so the page never shows a
// placeholder: an unset email falls back to the in-app Support page, and an
// unset address is left out until the business address is registered.
const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim();
const BUSINESS_ADDRESS = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS?.trim();

const SECTIONS: LegalSection[] = [
  { id: 'about', title: '1. About Kidora' },
  { id: 'eligibility', title: "2. Eligibility and Children's Use" },
  { id: 'accounts', title: '3. Accounts' },
  { id: 'educational-purpose', title: '4. Educational Purpose' },
  { id: 'ai', title: '5. AI Tutor and Artificial Intelligence' },
  { id: 'user-content', title: '6. User Content' },
  { id: 'educational-content', title: '7. Educational Content' },
  { id: 'virtual-items', title: '8. Student Avatars, Rewards, and Virtual Items' },
  { id: 'parents', title: '9. Parents and Guardians' },
  { id: 'schools', title: '10. Teachers and Schools' },
  { id: 'payments', title: '11. Payments and Subscriptions' },
  { id: 'third-party', title: '12. Third-Party Services' },
  { id: 'acceptable-use', title: '13. Acceptable Use' },
  { id: 'child-safety', title: '14. Child Safety' },
  { id: 'privacy', title: '15. Privacy and Personal Data' },
  { id: 'ip', title: '16. Intellectual Property' },
  { id: 'feedback', title: '17. Feedback' },
  { id: 'availability', title: '18. Service Availability' },
  { id: 'suspension', title: '19. Account Suspension and Termination' },
  { id: 'termination', title: '20. Consequences of Termination' },
  { id: 'disclaimers', title: '21. Disclaimers' },
  { id: 'liability', title: '22. Limitation of Liability' },
  { id: 'indemnification', title: '23. Indemnification' },
  { id: 'changes', title: '24. Changes to These Terms' },
  { id: 'governing-law', title: '25. Governing Law' },
  { id: 'international', title: '26. International Users' },
  { id: 'institutions', title: '27. Educational Institutions and Enterprise Use' },
  { id: 'force-majeure', title: '28. Force Majeure' },
  { id: 'severability', title: '29. Severability' },
  { id: 'no-waiver', title: '30. No Waiver' },
  { id: 'entire-agreement', title: '31. Entire Agreement' },
  { id: 'contact', title: '32. Contact Kidora' },
];

/** A numbered section heading, linked from the table of contents. */
function Section({ id, children }: { id: string; children: ReactNode }) {
  const title = SECTIONS.find((s) => s.id === id)!.title;
  return (
    <section aria-labelledby={id} className="space-y-4">
      <h2 id={id}>{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>;
}

export default function TermsPage() {
  return (
    <LegalPage title="Kidora Terms of Service" effective="October 4, 2026" updated="October 4, 2026" contents={SECTIONS}>
      <p>
        Welcome to Kidora. These Terms of Service (&quot;Terms&quot;) govern your access to and use of the Kidora website, mobile
        applications, educational services, games, AI-powered learning tools, school services, and related products and features
        (collectively, the &quot;Service&quot;).
      </p>
      <p>
        Kidora is an AI-powered gamified learning platform designed to help children develop foundational and academic skills through
        interactive lessons, educational games, personalized learning experiences, rewards, and AI-assisted tutoring.
      </p>
      <p>
        By accessing or using Kidora, you agree to these Terms. If you are using Kidora on behalf of a child, you confirm that you are
        the child&apos;s parent, legal guardian, teacher, school representative, or another authorized adult with the appropriate
        authority to do so.
      </p>
      <p>If you do not agree to these Terms, you must not use the Service.</p>

      <Section id="about">
        <p>Kidora provides digital educational experiences that may include:</p>
        <List items={[
          'Interactive educational lessons',
          'Gamified learning activities',
          'Educational games and challenges',
          'AI-assisted tutoring and learning support',
          'Personalized learning recommendations',
          'Student avatars and learning worlds',
          'Rewards, achievements, badges, and progress tracking',
          'Parent dashboards',
          'Teacher tools',
          'School and institutional learning management features',
          'Courses, assignments, quizzes, assessments, and certificates',
          'Educational content across subjects such as Mathematics, English, Science, Coding, History, Art, and other subjects',
          'Automatic translation and multilingual learning features',
          'Other educational tools and features that Kidora may introduce in the future',
        ]} />
        <p>Kidora may modify, improve, add, or remove features from the Service from time to time.</p>
      </Section>

      <Section id="eligibility">
        <p>Kidora is designed to support children&apos;s education. Because children may use the Service, additional requirements apply.</p>
        <h3>2.1 Parent or Guardian Responsibility</h3>
        <p>A parent or legal guardian is responsible for:</p>
        <List items={[
          "Creating or approving a child's account where required",
          "Providing appropriate consent for the child's use of Kidora",
          "Supervising the child's use of the Service where appropriate",
          'Ensuring that information provided to Kidora is accurate',
          "Reviewing the child's educational activity when appropriate",
          "Contacting Kidora if they have concerns regarding their child's account or use of the Service",
        ]} />
        <h3>2.2 School and Teacher Accounts</h3>
        <p>Schools, teachers, and educational institutions may create or manage student accounts where Kidora provides such functionality.</p>
        <p>
          A school or authorized educator represents that it has the appropriate authority and permissions to provide student access to
          Kidora and to use the applicable school features.
        </p>
        <p>
          Schools and educators are responsible for using Kidora in accordance with applicable laws, school policies, and their
          responsibilities toward students.
        </p>
        <h3>2.3 Age Requirements</h3>
        <p>Certain Kidora features may have age restrictions or may require parental, guardian, or institutional authorization.</p>
        <p>
          Kidora may request age, parental, guardian, school, or other authorization information where reasonably necessary to provide
          the Service safely and lawfully.
        </p>
        <p>If you believe a child has created or is using an account without appropriate authorization, please contact Kidora.</p>
      </Section>

      <Section id="accounts">
        <p>Some Kidora features require an account.</p>
        <p>You agree to:</p>
        <List items={[
          'Provide accurate and current information',
          'Keep your login credentials secure',
          'Not share your password with unauthorized individuals',
          'Notify Kidora if you believe your account has been compromised',
          'Use only accounts that you are authorized to access',
          'Not impersonate another person or organization',
        ]} />
        <p>Parents, guardians, teachers, and school administrators may be responsible for accounts they create or manage.</p>
        <p>
          Kidora reserves the right to suspend or terminate accounts that violate these Terms or create security, safety, legal, or
          operational risks.
        </p>
      </Section>

      <Section id="educational-purpose">
        <p>Kidora is an educational technology platform.</p>
        <p>
          The information, lessons, explanations, activities, recommendations, assessments, and AI-generated responses provided through
          Kidora are intended for educational and informational purposes.
        </p>
        <p>Kidora does not guarantee that:</p>
        <List items={[
          'A student will achieve a particular academic result',
          'A student will pass an examination',
          'A student will achieve a specific grade',
          'Educational content will be suitable for every learner',
          'AI-generated explanations will always be accurate',
          'Learning recommendations will always be appropriate',
        ]} />
        <p>
          Parents, guardians, teachers, and educational institutions should use appropriate judgment when evaluating educational content
          and student progress.
        </p>
      </Section>

      <Section id="ai">
        <p>Kidora may provide an AI-powered tutor or other artificial intelligence features (&quot;AI Features&quot;).</p>
        <p>AI Features may:</p>
        <List items={[
          'Answer educational questions',
          'Explain concepts',
          'Provide hints',
          'Generate practice activities',
          'Recommend learning activities',
          'Adapt educational experiences',
          'Assist students with learning',
          'Provide feedback',
          'Support teachers or parents',
        ]} />
        <h3>5.1 AI Limitations</h3>
        <p>AI-generated content may occasionally be inaccurate, incomplete, outdated, inappropriate, or misleading.</p>
        <p>
          Users should not treat AI-generated information as guaranteed factual, professional, medical, legal, financial, or safety
          advice.
        </p>
        <p>Parents, guardians, teachers, and schools should provide appropriate supervision when children use AI Features.</p>
        <h3>5.2 AI Safety</h3>
        <p>
          Kidora may use automated systems, filters, moderation, monitoring, or human review to help detect and prevent inappropriate,
          harmful, unsafe, or abusive content.
        </p>
        <p>
          Kidora may restrict, modify, or disable AI responses when necessary to protect users or comply with applicable laws and
          policies.
        </p>
        <h3>5.3 No Guarantee of AI Availability</h3>
        <p>
          AI Features may depend on third-party technologies and infrastructure. Kidora does not guarantee that AI Features will always be
          available, uninterrupted, or error-free.
        </p>
      </Section>

      <Section id="user-content">
        <p>
          Users may be able to submit information, questions, answers, assignments, feedback, profile information, or other content
          through Kidora (&quot;User Content&quot;).
        </p>
        <p>You retain ownership of User Content that you lawfully own.</p>
        <p>
          By submitting User Content, you grant Kidora the permissions reasonably necessary to operate, maintain, improve, secure, and
          provide the Service.
        </p>
        <p>Kidora will handle personal information in accordance with its <Link href="/privacy">Privacy Policy</Link>.</p>
        <p>You agree not to submit content that:</p>
        <List items={[
          "Violates another person's rights",
          'Contains unlawful material',
          'Contains malicious software',
          "Attempts to obtain another person's private information",
          'Is abusive, threatening, or discriminatory',
          'Is sexually explicit or inappropriate for children',
          'Promotes violence or dangerous activities',
          'Infringes intellectual property rights',
          "Attempts to manipulate or misuse Kidora's systems",
        ]} />
      </Section>

      <Section id="educational-content">
        <p>
          Kidora and its licensors may own or control educational materials, lessons, graphics, animations, games, characters, software,
          videos, audio, text, designs, interfaces, and other content provided through the Service (&quot;Kidora Content&quot;).
        </p>
        <p>Kidora Content is protected by applicable intellectual property laws.</p>
        <p>You may use Kidora Content only for your personal, educational, or authorized institutional use through the Service.</p>
        <p>You may not, without written permission:</p>
        <List items={[
          'Copy or reproduce Kidora Content for commercial purposes',
          'Sell or redistribute Kidora Content',
          'Reverse engineer Kidora educational games or systems',
          'Remove copyright or ownership notices',
          'Create competing products using Kidora Content',
          'Scrape or systematically extract Kidora Content',
          'Repackage Kidora Content for another service',
        ]} />
      </Section>

      <Section id="virtual-items">
        <p>Kidora may allow students to create avatars, earn badges, achievements, points, rewards, or other virtual elements.</p>
        <p>Unless expressly stated otherwise:</p>
        <List items={[
          'Virtual items have no monetary value',
          'Virtual items cannot be exchanged for cash',
          'Virtual items cannot be sold or transferred',
          'Kidora may modify virtual rewards and game mechanics',
          'Kidora may remove virtual items associated with fraudulent or abusive activity',
        ]} />
        <p>Kidora does not guarantee that any particular reward, badge, ranking, or achievement will always remain available.</p>
      </Section>

      <Section id="parents">
        <p>Parents and guardians may receive access to features designed to help them understand a child&apos;s learning activity.</p>
        <p>These features may include:</p>
        <List items={[
          'Learning progress',
          'Course completion',
          'Quiz and assessment results',
          'Activity information',
          'Learning recommendations',
          'Achievement information',
        ]} />
        <p>Parent and guardian accounts should be used responsibly and only for authorized children.</p>
        <p>
          Parents and guardians should contact Kidora if they believe information associated with a child&apos;s account is inaccurate,
          inappropriate, or unauthorized.
        </p>
      </Section>

      <Section id="schools">
        <p>Kidora may provide tools for teachers and educational institutions.</p>
        <p>School features may allow authorized users to:</p>
        <List items={[
          'Create or manage classes',
          'Assign courses',
          'Assign activities',
          'Monitor student progress',
          'Review assessments',
          'Manage educational content',
          'Manage student access',
          'Generate educational reports',
        ]} />
        <p>
          Schools and teachers are responsible for ensuring that their use of Kidora complies with applicable education, privacy,
          child-protection, and data-protection requirements.
        </p>
        <p>Schools should not provide Kidora with information that they are not legally authorized to share.</p>
      </Section>

      <Section id="payments">
        <p>Kidora may offer free and paid services.</p>
        <p>Paid plans may include family, school, institutional, district, or other subscription options.</p>
        <p>Pricing, billing periods, features, and payment terms will be presented before purchase.</p>
        <p>Payments may be processed through third-party payment providers.</p>
        <p>
          By purchasing a paid service, you authorize the applicable payment provider to process the payment according to the selected
          payment method and plan.
        </p>
        <h3>11.1 Free or Pilot Access</h3>
        <p>Kidora may provide free access, promotional access, pilot access, or testing programs.</p>
        <p>Pilot or promotional access may be changed, limited, suspended, or discontinued at any time.</p>
        <p>
          During pilot programs, Kidora may provide selected features at no charge for testing, validation, research, or feedback
          purposes.
        </p>
        <h3>11.2 Future Pricing</h3>
        <p>Kidora may introduce or change pricing for paid features in the future.</p>
        <p>Where required by applicable law, users will receive notice of material pricing changes before they take effect.</p>
        <h3>11.3 Refunds</h3>
        <p>Refund eligibility will depend on the applicable purchase terms, payment provider rules, and applicable law.</p>
        <p>If you believe you were charged incorrectly, contact Kidora with the relevant transaction information.</p>
      </Section>

      <Section id="third-party">
        <p>Kidora may integrate with third-party services, including:</p>
        <List items={[
          'Authentication providers',
          'Payment providers',
          'Cloud infrastructure providers',
          'Analytics services',
          'AI technology providers',
          'Communication services',
          'Social login providers',
          'Translation services',
          'Other technology providers',
        ]} />
        <p>Third-party services may have their own terms and privacy policies.</p>
        <p>
          Kidora is not responsible for the independent actions, availability, policies, or security practices of third-party services.
        </p>
      </Section>

      <Section id="acceptable-use">
        <p>You agree not to use Kidora to:</p>
        <ol>
          <li>Violate applicable laws or regulations.</li>
          <li>Harm, threaten, exploit, or abuse children or other users.</li>
          <li>Access another user&apos;s account without authorization.</li>
          <li>Attempt to bypass security or authentication systems.</li>
          <li>Introduce malware, viruses, or malicious code.</li>
          <li>Interfere with the operation of the Service.</li>
          <li>Scrape or automatically collect data without authorization.</li>
          <li>Reverse engineer or attempt to extract source code where prohibited by law.</li>
          <li>Use Kidora to develop a competing service by systematically copying its content or functionality.</li>
          <li>Upload inappropriate or harmful content.</li>
          <li>Misrepresent your identity or authority.</li>
          <li>Abuse rewards, assessments, rankings, or other gamification features.</li>
          <li>Use the Service to generate or distribute harmful content.</li>
          <li>Use AI Features to produce content that violates applicable law or the safety requirements of Kidora.</li>
          <li>Attempt to exploit or manipulate Kidora&apos;s AI systems.</li>
        </ol>
        <p>Kidora may suspend or terminate access where it reasonably believes these Terms have been violated.</p>
      </Section>

      <Section id="child-safety">
        <p>Kidora is committed to providing an age-appropriate educational environment.</p>
        <p>
          We may use technical safeguards, content moderation, reporting mechanisms, account controls, and other reasonable measures to
          reduce exposure to inappropriate content.
        </p>
        <p>However, no online service can guarantee complete protection from every risk.</p>
        <p>Parents, guardians, teachers, and schools should maintain appropriate supervision of children&apos;s online activity.</p>
        <p>If you become aware of content or behavior that may threaten a child&apos;s safety, please report it to Kidora immediately.</p>
      </Section>

      <Section id="privacy">
        <p>Your privacy is important to us.</p>
        <p>
          Kidora&apos;s collection, use, storage, disclosure, and protection of personal information are described in our{' '}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
        <p>Our Privacy Policy forms part of these Terms.</p>
        <p>
          For children&apos;s accounts, Kidora may apply additional safeguards and requirements relating to children&apos;s personal
          information and parental, guardian, or institutional authorization.
        </p>
      </Section>

      <Section id="ip">
        <p>All rights, title, and interest in and to Kidora, including its:</p>
        <List items={[
          'Software', 'Website', 'Mobile applications', 'Branding', 'Logos', 'Characters', 'Games', 'Learning worlds', 'Animations',
          'User interfaces', 'Designs', 'Educational materials', 'AI systems', 'Technology', 'Documentation',
        ]} />
        <p>belong to Kidora or its licensors, except for third-party materials and User Content.</p>
        <p>Nothing in these Terms transfers ownership of Kidora&apos;s intellectual property to you.</p>
      </Section>

      <Section id="feedback">
        <p>
          If you provide suggestions, ideas, comments, or feedback regarding Kidora, you agree that Kidora may use that feedback to improve
          its products and services without compensation or obligation to you, subject to applicable law.
        </p>
        <p>You should not submit confidential information as feedback unless Kidora specifically requests it.</p>
      </Section>

      <Section id="availability">
        <p>Kidora aims to provide a reliable service but does not guarantee that the Service will always be:</p>
        <List items={['Available', 'Uninterrupted', 'Secure', 'Error-free', 'Free from delays', 'Free from bugs', 'Compatible with every device or browser']} />
        <p>Kidora may temporarily suspend access for:</p>
        <List items={['Maintenance', 'Security updates', 'Infrastructure changes', 'Technical problems', 'Emergency situations', 'Legal or regulatory requirements']} />
      </Section>

      <Section id="suspension">
        <p>Kidora may suspend or terminate an account if:</p>
        <List items={[
          'These Terms are violated',
          'The account is used fraudulently',
          'The account presents a security or safety risk',
          'The user provides false information',
          'The Service is being abused',
          'Suspension is required by law',
          'The account has been inactive for an extended period where permitted by law',
        ]} />
        <p>You may stop using Kidora at any time.</p>
        <p>
          Where appropriate and legally required, Kidora may provide notice and an opportunity to resolve a violation before terminating
          an account.
        </p>
      </Section>

      <Section id="termination">
        <p>When an account is terminated:</p>
        <List items={[
          'Access to the Service may stop',
          'Access to associated features may be removed',
          'Virtual rewards may become unavailable',
          'Subscription access may end subject to applicable refund rights',
          'Certain information may be retained where legally required or reasonably necessary for legitimate business purposes',
        ]} />
        <p>Data deletion is subject to Kidora&apos;s Privacy Policy and applicable legal requirements.</p>
      </Section>

      <Section id="disclaimers">
        <p>To the maximum extent permitted by applicable law, Kidora is provided on an &quot;as available&quot; and &quot;as is&quot; basis.</p>
        <p>Kidora does not guarantee that the Service will meet every user&apos;s specific educational needs or expectations.</p>
        <p>Kidora does not guarantee any particular academic, professional, financial, or educational outcome.</p>
        <p>AI-generated information may contain errors.</p>
        <p>Parents, guardians, teachers, and schools remain responsible for appropriate supervision and educational decision-making.</p>
        <p>
          Nothing in Kidora should be interpreted as replacing qualified teachers, educators, counselors, healthcare professionals, or
          other professional services where such services are necessary.
        </p>
      </Section>

      <Section id="liability">
        <p>
          To the maximum extent permitted by applicable law, Kidora and its founders, employees, contractors, partners, licensors, and
          service providers will not be liable for indirect, incidental, special, consequential, or punitive damages arising from or
          related to your use of the Service.
        </p>
        <p>This may include loss of:</p>
        <List items={['Data', 'Profits', 'Revenue', 'Business opportunities', 'Educational opportunities', 'Goodwill']} />
        <p>Nothing in these Terms excludes or limits liability that cannot legally be excluded or limited under applicable law.</p>
      </Section>

      <Section id="indemnification">
        <p>
          To the extent permitted by applicable law, you agree to defend and hold harmless Kidora and its affiliates, founders, employees,
          contractors, and service providers from claims, damages, liabilities, costs, and expenses arising from:
        </p>
        <List items={[
          'Your violation of these Terms',
          'Your misuse of the Service',
          'Your User Content',
          "Your violation of another person's rights",
          'Your unauthorized use of the Service',
        ]} />
        <p>This section does not apply where prohibited by applicable law.</p>
      </Section>

      <Section id="changes">
        <p>Kidora may update these Terms from time to time.</p>
        <p>When changes are made, Kidora may update the &quot;Last Updated&quot; date and provide additional notice where required by applicable law.</p>
        <p>
          Your continued use of the Service after the updated Terms become effective constitutes acceptance of the revised Terms, to the
          extent permitted by law.
        </p>
        <p>If you do not agree with updated Terms, you should stop using the Service.</p>
      </Section>

      <Section id="governing-law">
        <p>
          These Terms shall be governed by the applicable laws of the Federal Democratic Republic of Ethiopia, unless applicable law
          requires otherwise.
        </p>
        <p>
          Any dispute arising from or relating to these Terms or the Service shall be handled in accordance with applicable Ethiopian law
          and the jurisdiction of the competent courts or dispute-resolution mechanisms.
        </p>
        <p>
          Where Kidora operates in another country, mandatory consumer, child-protection, privacy, or other laws of that jurisdiction may
          also apply.
        </p>
      </Section>

      <Section id="international">
        <p>Kidora may be accessed by users in different countries.</p>
        <p>If you access Kidora from outside Ethiopia, you are responsible for complying with applicable laws in your jurisdiction.</p>
        <p>Kidora may not be available in every country or jurisdiction.</p>
      </Section>

      <Section id="institutions">
        <p>
          If a school, district, nonprofit organization, government organization, or other institution enters into a separate written
          agreement with Kidora, that agreement may establish additional terms governing the institution&apos;s use of the Service.
        </p>
        <p>
          Where there is a conflict between these Terms and a separate written institutional agreement, the institutional agreement will
          control to the extent of the conflict.
        </p>
      </Section>

      <Section id="force-majeure">
        <p>Kidora will not be responsible for delays or failures caused by circumstances beyond its reasonable control, including:</p>
        <List items={[
          'Natural disasters',
          'Internet or telecommunications failures',
          'Power outages',
          'Cybersecurity incidents',
          'Government actions',
          'War',
          'Civil unrest',
          'Epidemics or pandemics',
          'Failures of third-party infrastructure',
          "Other events beyond Kidora's reasonable control",
        ]} />
      </Section>

      <Section id="severability">
        <p>
          If any provision of these Terms is determined to be invalid or unenforceable, the remaining provisions will continue to apply to
          the extent permitted by law.
        </p>
      </Section>

      <Section id="no-waiver">
        <p>Kidora&apos;s failure to enforce any provision of these Terms does not constitute a waiver of its right to enforce that provision in the future.</p>
      </Section>

      <Section id="entire-agreement">
        <p>
          These Terms, together with the Kidora Privacy Policy and any additional terms applicable to specific services, constitute the
          agreement between you and Kidora regarding your use of the Service.
        </p>
      </Section>

      <Section id="contact">
        <p>If you have questions about these Terms, your account, child safety, payments, or the Kidora Service, please contact us.</p>
        <address className="not-italic">
          <strong className="text-ink">Kidora</strong>
          <br />
          Website: <a href="https://justkidora.com">https://justkidora.com</a>
          <br />
          {SUPPORT_EMAIL
            ? <>Email: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></>
            : <>Signed-in users can write to us from the Support page in their account.</>}
          {BUSINESS_ADDRESS && <><br />Address: {BUSINESS_ADDRESS}</>}
        </address>
      </Section>

      <section aria-labelledby="notice" className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <h2 id="notice" className="!mt-0">Parent, Guardian, Teacher, and School Notice</h2>
        <p>
          If you are a parent, guardian, teacher, school administrator, or educational institution using Kidora with children, please
          review these Terms and the Kidora <Link href="/privacy">Privacy Policy</Link> carefully before providing children with access.
        </p>
        <p>
          By authorizing a child to use Kidora, you acknowledge that Kidora is an educational technology service and that appropriate
          adult supervision and authorization remain important.
        </p>
      </section>

      <p className="text-sm text-slate-500">Last Updated: October 4, 2026</p>
    </LegalPage>
  );
}
