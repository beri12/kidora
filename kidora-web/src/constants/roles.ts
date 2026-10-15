export interface RoleField {
  key: string;                 // form field name — must match a field on the API's RegisterDto
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'number' | 'select' | 'tel';
  options?: string[];         // for select
  optional?: boolean;         // rendered, but not required to submit
  hint?: string;              // small helper line under the input
}

export interface SignupRole {
  key: string;
  name: string;
  emoji: string;
  desc: string;
  bg: string;      // tailwind gradient stops
  shadow: string;  // rgba for the icon shadow
  headline: string;   // heading on the role's signup form
  tagline: string;    // sub-line on the role's signup form
  cta: string;        // submit button label
  fields: RoleField[];// role-specific extra fields (beyond name/email/password)
}

// Order matches the signup modal grid: Teacher · Parent · Student · School Leader · District Leader.
// `key` is posted to POST /auth/register as `role`, so it must be spelled
// exactly as the backend's Prisma Role enum. Each entry in `fields` must
// likewise name a real property of the API's RegisterDto — the register page
// posts them through verbatim.
export const SIGNUP_ROLES: SignupRole[] = [
  {
    key: 'TEACHER', name: 'Teacher', emoji: '🍎',
    desc: 'Manage classes & lessons',
    bg: 'from-brand-400 to-brand-700', shadow: 'rgba(109,40,217,.5)',
    headline: 'Welcome, teacher! 🍎',
    tagline: 'Set up your classroom in minutes.',
    cta: 'Create teacher account 🍎',
    fields: [
      { key: 'subject', label: 'Main subject', placeholder: 'Mathematics', type: 'select', options: ['Mathematics', 'Reading & English', 'Science', 'Programming', 'Art', 'General'] },
      { key: 'gradeLevel', label: 'Grade you teach', placeholder: 'Grade 3', type: 'select', optional: true, options: ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] },
      { key: 'schoolCode', label: 'School code', placeholder: 'K7M2QP', optional: true, hint: 'Ask your school admin — you can join a school later.' },
    ],
  },
  {
    key: 'PARENT', name: 'Parent', emoji: '👪',
    desc: "Follow your child's journey",
    bg: 'from-grass-400 to-grass-700', shadow: 'rgba(21,128,61,.5)',
    headline: 'Join as a parent 👪',
    tagline: 'Track progress and manage your family plan.',
    cta: 'Create free account 🎉',
    // Children are added during onboarding, so nothing extra is needed to
    // create the account itself.
    fields: [],
  },
  {
    key: 'CHILD', name: 'Student', emoji: '🎒',
    desc: 'Learn, play & earn badges',
    bg: 'from-sky-400 to-sky-600', shadow: 'rgba(2,132,199,.5)',
    headline: 'Start your adventure! 🚀',
    tagline: "Let's set up your explorer profile.",
    cta: 'Start learning 🎈',
    fields: [
      { key: 'gradeLevel', label: 'Grade', placeholder: 'Grade 2', type: 'select', options: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8'] },
      { key: 'schoolCode', label: 'School code', placeholder: 'K7M2QP', optional: true, hint: 'From your teacher — leave blank if you learn at home.' },
    ],
  },
  {
    key: 'SCHOOL_ADMIN', name: 'School Leader', emoji: '🏫',
    desc: 'Oversee your whole school',
    bg: 'from-amber-400 to-amber-700', shadow: 'rgba(180,83,9,.5)',
    headline: 'Set up your school 🏫',
    tagline: 'Give your whole school superpowers.',
    cta: 'Create school account 🏫',
    fields: [
      { key: 'schoolName', label: 'School name', placeholder: 'Sunnyvale Elementary' },
      { key: 'country', label: 'Country', placeholder: 'Ethiopia' },
    ],
  },
  {
    key: 'DISTRICT_ADMIN', name: 'District Leader', emoji: '🏛️',
    desc: 'Manage schools district-wide',
    bg: 'from-rose-400 to-rose-600', shadow: 'rgba(225,29,72,.5)',
    headline: 'District partnership 🏛️',
    tagline: "Let's bring Kidora to every school.",
    cta: 'Create district account 🏛️',
    fields: [
      { key: 'districtName', label: 'District name', placeholder: 'Bay Area USD' },
      { key: 'region', label: 'Region / state', placeholder: 'Addis Ababa' },
    ],
  },
];

// ---- Role-based onboarding wizard steps ----
export interface OnboardStep {
  id: string;
  title: string;
  subtitle: string;
  kind: 'fields' | 'avatar' | 'goals' | 'invite' | 'done';
  fields?: RoleField[];
}

const DONE: OnboardStep = { id: 'done', title: "You're all set! 🎉", subtitle: 'Your Kidora adventure starts now.', kind: 'done' };

// Keys must match the Role type in role.ts exactly. Every role that can sign up needs an entry here,
// otherwise the onboarding wizard has nothing to render after signup.
export const ONBOARDING: Record<string, OnboardStep[]> = {
  CHILD: [
    { id: 'profile', title: 'About you ✏️', subtitle: 'Tell us a little about yourself.', kind: 'fields', fields: [
      { key: 'nickname', label: 'Nickname', placeholder: 'e.g. Leo' },
      { key: 'age', label: 'Age', placeholder: '7', type: 'number' },
      { key: 'grade', label: 'Grade', placeholder: 'Grade 2' },
    ]},
    { id: 'avatar', title: 'Create your avatar 🎨', subtitle: 'Pick your look and a companion pet.', kind: 'avatar' },
    { id: 'goals', title: 'Pick your goals 🎯', subtitle: 'What do you want to explore?', kind: 'goals' },
    DONE,
  ],
  PARENT: [
    { id: 'profile', title: 'Your family 👪', subtitle: 'Set up your parent account.', kind: 'fields', fields: [
      { key: 'childName', label: "Child's name", placeholder: 'e.g. Leo' },
      { key: 'childAge', label: "Child's age", placeholder: '7', type: 'number' },
    ]},
    { id: 'goals', title: 'Focus areas 🎯', subtitle: 'What should we help your child with?', kind: 'goals' },
    DONE,
  ],
  TEACHER: [
    { id: 'class', title: 'Your classroom 🏫', subtitle: 'Set up your first class.', kind: 'fields', fields: [
      { key: 'className', label: 'Class name', placeholder: 'Room 3B' },
      { key: 'studentCount', label: 'Number of students', placeholder: '24', type: 'number' },
    ]},
    { id: 'invite', title: 'Invite students 📨', subtitle: 'Share your class code (you can do this later).', kind: 'invite' },
    DONE,
  ],
  SCHOOL_ADMIN: [
    { id: 'school', title: 'Set up your school 🏫', subtitle: 'A few basics to get started.', kind: 'fields', fields: [
      { key: 'schoolName', label: 'School name', placeholder: 'Sunnyvale Elementary' },
      { key: 'studentCount', label: 'Approx. number of students', placeholder: '500', type: 'number' },
    ]},
    { id: 'invite', title: 'Invite your teachers 📨', subtitle: 'Share your school code (you can do this later).', kind: 'invite' },
    DONE,
  ],
  DISTRICT_ADMIN: [
    { id: 'district', title: 'Set up your district 🏛️', subtitle: 'A few basics to get started.', kind: 'fields', fields: [
      { key: 'districtName', label: 'District name', placeholder: 'Bay Area USD' },
      { key: 'schoolCount', label: 'Number of schools', placeholder: '12', type: 'number' },
    ]},
    { id: 'invite', title: 'Invite your schools 📨', subtitle: 'Share your district code (you can do this later).', kind: 'invite' },
    DONE,
  ],
  ADMIN: [DONE],
  SUPER_ADMIN: [DONE],
};

// SCHOOL_LEADER onboards exactly like SCHOOL_ADMIN; aliased rather than
// duplicated so the two can't drift apart.
ONBOARDING.SCHOOL_LEADER = ONBOARDING.SCHOOL_ADMIN;

// ---- "How will you use Kidora?" ----
//
// Shown once, right after a phone, email or social sign-up, for accounts the
// API flags with `needsRole`. `role` is the backend Role enum value sent to
// POST /auth/role. ADMIN is deliberately absent: admins are created by an
// admin. Students (CHILD) sign up here too, optionally with the school code
// their teacher gave them.
export interface UseCase {
  key: 'PARENT' | 'TEACHER' | 'SCHOOL_LEADER' | 'DISTRICT_LEADER' | 'STUDENT';
  /** The Role value sent to POST /auth/role. */
  role: 'CHILD' | 'PARENT' | 'TEACHER' | 'SCHOOL_LEADER' | 'DISTRICT_ADMIN';
  label: string;
  emoji: string;
  blurb: string;
  /** Tailwind gradient stops for the card's icon tile. */
  bg: string;
  shadow: string;
  /**
   * True when the role is administrative and has to be verified before it is
   * granted. Picking one records a request; it does not change the account.
   */
  needsVerification?: boolean;
}

export const USE_CASES: UseCase[] = [
  {
    key: 'STUDENT', role: 'CHILD', label: 'Student', emoji: '🧒',
    blurb: 'Learn through games, courses and activities.',
    bg: 'from-sky-300 to-sky-500', shadow: 'rgba(2,132,199,.45)',
  },
  {
    key: 'PARENT', role: 'PARENT', label: 'Parent', emoji: '👩',
    blurb: "Support your child's learning journey.",
    bg: 'from-emerald-300 to-emerald-500', shadow: 'rgba(21,128,61,.45)',
  },
  {
    key: 'TEACHER', role: 'TEACHER', label: 'Teacher', emoji: '👩‍🏫',
    blurb: 'Create and sell courses.',
    bg: 'from-violet-300 to-violet-600', shadow: 'rgba(109,40,217,.45)',
  },
  {
    key: 'SCHOOL_LEADER', role: 'SCHOOL_LEADER', label: 'School Leader', emoji: '🏫',
    blurb: 'Manage your school and students.',
    bg: 'from-orange-300 to-orange-500', shadow: 'rgba(180,83,9,.45)', needsVerification: true,
  },
  {
    key: 'DISTRICT_LEADER', role: 'DISTRICT_ADMIN', label: 'District Leader', emoji: '🏢',
    blurb: 'Manage schools across your district.',
    bg: 'from-teal-300 to-teal-600', shadow: 'rgba(13,148,136,.45)', needsVerification: true,
  },
];
