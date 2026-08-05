export interface RoleField {
  key: string;                 // form field name
  label: string;
  placeholder: string;
  type?: 'text' | 'email' | 'number' | 'select';
  options?: string[];         // for select
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
// Keys must match the Role type in role.ts exactly (ADMIN, TEACHER, PARENT, CHILD, SCHOOL_ADMIN, DISTRICT_ADMIN).
export const SIGNUP_ROLES: SignupRole[] = [
  {
    key: 'TEACHER', name: 'Teacher', emoji: '🍎',
    desc: 'Manage classes & lessons',
    bg: 'from-brand-400 to-brand-700', shadow: 'rgba(109,40,217,.5)',
    headline: 'Welcome, teacher! 🍎',
    tagline: 'Set up your classroom in minutes.',
    cta: 'Create teacher account 🍎',
    fields: [
      { key: 'schoolName', label: 'School name', placeholder: 'Sunnyvale Elementary' },
      { key: 'gradeLevel', label: 'Grade you teach', placeholder: 'Grade 3', type: 'select', options: ['Pre-K', 'Kindergarten', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'] },
      { key: 'subject', label: 'Main subject', placeholder: 'Mathematics', type: 'select', options: ['Mathematics', 'Reading & English', 'Science', 'Programming', 'Art', 'General'] },
    ],
  },
  {
    key: 'PARENT', name: 'Parent', emoji: '👪',
    desc: "Follow your child's journey",
    bg: 'from-grass-400 to-grass-700', shadow: 'rgba(21,128,61,.5)',
    headline: 'Join as a parent 👪',
    tagline: 'Track progress and manage your family plan.',
    cta: 'Create free account 🎉',
    fields: [
      { key: 'childrenCount', label: 'How many children?', placeholder: '2', type: 'number' },
    ],
  },
  {
    key: 'CHILD', name: 'Student', emoji: '🎒',
    desc: 'Learn, play & earn badges',
    bg: 'from-sky-400 to-sky-600', shadow: 'rgba(2,132,199,.5)',
    headline: 'Start your adventure! 🚀',
    tagline: "Let's set up your explorer profile.",
    cta: 'Start learning 🎈',
    fields: [
      { key: 'age', label: 'Age', placeholder: '7', type: 'number' },
      { key: 'grade', label: 'Grade', placeholder: 'Grade 2' },
      { key: 'parentEmail', label: "Parent's email (for approval)", placeholder: 'parent@family.com', type: 'email' },
    ],
  },
  {
    key: 'SCHOOL_ADMIN', name: 'School Leader', emoji: '🏫',
    desc: 'Oversee your whole school',
    bg: 'from-amber-400 to-amber-700', shadow: 'rgba(180,83,9,.5)',
    headline: 'Set up your school 🏫',
    tagline: 'Give your whole school superpowers.',
    cta: 'Request school setup →',
    fields: [
      { key: 'schoolName', label: 'School name', placeholder: 'Sunnyvale Elementary' },
      { key: 'role', label: 'Your role', placeholder: 'Principal', type: 'select', options: ['Principal', 'Vice Principal', 'Coordinator', 'IT Admin', 'Other'] },
      { key: 'studentCount', label: 'Approx. number of students', placeholder: '500', type: 'number' },
    ],
  },
  {
    key: 'DISTRICT_ADMIN', name: 'District Leader', emoji: '🏛️',
    desc: 'Manage schools district-wide',
    bg: 'from-rose-400 to-rose-600', shadow: 'rgba(225,29,72,.5)',
    headline: 'District partnership 🏛️',
    tagline: "Let's bring Kidora to every school.",
    cta: 'Contact our team →',
    fields: [
      { key: 'districtName', label: 'District name', placeholder: 'Bay Area USD' },
      { key: 'role', label: 'Your role', placeholder: 'Superintendent', type: 'select', options: ['Superintendent', 'Director', 'Coordinator', 'IT Admin', 'Other'] },
      { key: 'schoolCount', label: 'Number of schools', placeholder: '12', type: 'number' },
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
};