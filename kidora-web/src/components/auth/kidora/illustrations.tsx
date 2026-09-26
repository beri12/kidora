/**
 * Kidora's auth illustrations, drawn as inline SVG: no image requests, crisp
 * at any size, and small enough to ship with the page. Every drawing is
 * decorative (aria-hidden); the text beside it carries the meaning.
 */

const SKIN = { deep: '#6B3F26', brown: '#8A5234', warm: '#A86B45', light: '#D9A27A' } as const;

/* ---------------------------------------------------------------- the kid */

/** A cheering kid in a yellow hoodie with a backpack — the hero of the sign-up page. */
export function KidHero({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 420" className={className} aria-hidden>
      <defs>
        <linearGradient id="kh-hood" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFD23F" />
          <stop offset="1" stopColor="#F7A928" />
        </linearGradient>
        <linearGradient id="kh-skin" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor={SKIN.warm} />
          <stop offset="1" stopColor={SKIN.brown} />
        </linearGradient>
        <radialGradient id="kh-cheek">
          <stop offset="0" stopColor="#F2745F" stopOpacity=".55" />
          <stop offset="1" stopColor="#F2745F" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* backpack straps behind */}
      <path d="M92 250 q-30 20 -26 110 l40 0 q-6 -70 10 -100z" fill="#2563EB" />
      <path d="M232 250 q30 20 26 110 l-40 0 q6 -70 -10 -100z" fill="#1D4ED8" />

      {/* raised arm (fist up) */}
      <path d="M96 262 q-44 -26 -52 -104" stroke="url(#kh-hood)" strokeWidth="38" strokeLinecap="round" fill="none" />
      <circle cx="44" cy="146" r="25" fill="url(#kh-skin)" />
      <path d="M28 140 q16 -10 32 0" stroke={SKIN.deep} strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M26 152 q18 -6 36 0" stroke={SKIN.deep} strokeWidth="3" fill="none" strokeLinecap="round" opacity=".6" />

      {/* body / hoodie */}
      <path d="M86 262 q76 -46 152 0 q22 60 14 158 l-180 0 q-8 -98 14 -158z" fill="url(#kh-hood)" />
      <path d="M126 250 q36 26 72 0" stroke="#E08E12" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M150 262 l-4 44 M174 262 l4 44" stroke="#FFF7E0" strokeWidth="4" strokeLinecap="round" />
      <circle cx="146" cy="308" r="5" fill="#FFF7E0" />
      <circle cx="178" cy="308" r="5" fill="#FFF7E0" />
      <path d="M120 350 q42 18 84 0 l0 34 q-42 12 -84 0z" fill="#F29A1B" opacity=".75" />

      {/* other arm resting */}
      <path d="M236 270 q30 40 12 92" stroke="#F7B32B" strokeWidth="34" strokeLinecap="round" fill="none" />
      <circle cx="246" cy="364" r="19" fill="url(#kh-skin)" />
      {/* strap across shoulder */}
      <path d="M232 256 q10 50 -2 110" stroke="#1E40AF" strokeWidth="12" fill="none" strokeLinecap="round" />

      {/* neck */}
      <rect x="146" y="222" width="32" height="34" rx="14" fill={SKIN.brown} />

      {/* head */}
      <ellipse cx="96" cy="162" rx="16" ry="20" fill={SKIN.brown} />
      <ellipse cx="228" cy="162" rx="16" ry="20" fill={SKIN.brown} />
      <ellipse cx="162" cy="152" rx="70" ry="76" fill="url(#kh-skin)" />

      {/* curly hair */}
      <g fill="#2A1A12">
        {[
          [104, 104, 22], [124, 84, 24], [150, 72, 26], [178, 72, 26], [204, 84, 24], [222, 106, 21],
          [96, 128, 17], [230, 130, 16], [138, 96, 20], [166, 90, 22], [192, 98, 20],
        ].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      </g>
      <g fill="#3A2519" opacity=".9">
        {[[130, 80, 7], [160, 66, 8], [190, 74, 7], [214, 96, 6], [110, 100, 6]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}
      </g>

      {/* brows */}
      <path d="M118 132 q14 -10 28 -2" stroke="#2A1A12" strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M178 130 q14 -8 28 2" stroke="#2A1A12" strokeWidth="5" fill="none" strokeLinecap="round" />

      {/* eyes */}
      <ellipse cx="134" cy="156" rx="15" ry="18" fill="#fff" />
      <ellipse cx="192" cy="156" rx="15" ry="18" fill="#fff" />
      <circle cx="137" cy="159" r="10" fill="#3B2314" />
      <circle cx="189" cy="159" r="10" fill="#3B2314" />
      <circle cx="137" cy="159" r="5" fill="#140B06" />
      <circle cx="189" cy="159" r="5" fill="#140B06" />
      <circle cx="141" cy="154" r="3.5" fill="#fff" />
      <circle cx="193" cy="154" r="3.5" fill="#fff" />

      {/* nose + cheeks */}
      <path d="M156 176 q6 8 14 0" stroke={SKIN.deep} strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="116" cy="188" r="16" fill="url(#kh-cheek)" />
      <circle cx="208" cy="188" r="16" fill="url(#kh-cheek)" />

      {/* big smile */}
      <path d="M126 192 q36 44 72 0 q-36 10 -72 0z" fill="#5A1E14" />
      <path d="M132 194 q30 7 60 0 l-2 7 q-28 5 -56 0z" fill="#fff" />
      <path d="M146 214 q16 10 32 0 q-16 -8 -32 0z" fill="#F0746A" />
    </svg>
  );
}

/* ---------------------------------------------------------------- the robot */

/** Kai, the friendly tutor robot. */
export function RobotBuddy({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 150" className={className} aria-hidden>
      <line x1="60" y1="8" x2="60" y2="24" stroke="#94A3B8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="60" cy="8" r="6" fill="#38BDF8" />
      <rect x="18" y="22" width="84" height="64" rx="30" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="2" />
      <rect x="28" y="34" width="64" height="40" rx="20" fill="#1E293B" />
      <ellipse cx="46" cy="54" rx="8" ry="9" fill="#38BDF8" />
      <ellipse cx="74" cy="54" rx="8" ry="9" fill="#38BDF8" />
      <circle cx="48" cy="51" r="2.5" fill="#E0F2FE" />
      <circle cx="76" cy="51" r="2.5" fill="#E0F2FE" />
      <path d="M52 66 q8 6 16 0" stroke="#38BDF8" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="10" y="44" width="10" height="20" rx="5" fill="#93C5FD" />
      <rect x="100" y="44" width="10" height="20" rx="5" fill="#93C5FD" />
      <rect x="34" y="88" width="52" height="40" rx="18" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="60" cy="106" r="7" fill="#38BDF8" opacity=".85" />
      <path d="M34 98 q-22 -8 -22 -30" stroke="#E2E8F0" strokeWidth="9" fill="none" strokeLinecap="round" />
      <circle cx="12" cy="66" r="7" fill="#F1F5F9" stroke="#CBD5E1" strokeWidth="2" />
      <path d="M86 100 q16 6 20 22" stroke="#E2E8F0" strokeWidth="9" fill="none" strokeLinecap="round" />
      <ellipse cx="60" cy="140" rx="22" ry="5" fill="#0F172A" opacity=".12" />
    </svg>
  );
}

/* ---------------------------------------------------------------- the world */

/** Savanna at golden hour: sky, a snow-capped mountain, acacias, a winding path. */
export function SavannaScene({ className }: { className?: string }) {
  const acacia = (x: number, y: number, s = 1, dark = '#2F7D32', light = '#4CAF50') => (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 q-2 -22 -10 -34 M0 -12 q6 -14 16 -22" stroke="#5B3A1E" strokeWidth="4" fill="none" strokeLinecap="round" />
      <ellipse cx="-12" cy="-40" rx="30" ry="9" fill={dark} />
      <ellipse cx="14" cy="-38" rx="26" ry="8" fill={dark} />
      <ellipse cx="0" cy="-45" rx="32" ry="8" fill={light} />
    </g>
  );
  return (
    <svg viewBox="0 0 480 640" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden>
      <defs>
        <linearGradient id="sv-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#6CC3F5" />
          <stop offset=".55" stopColor="#A7DDF8" />
          <stop offset="1" stopColor="#FDE9B8" />
        </linearGradient>
        <linearGradient id="sv-grass" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#8BCB4A" />
          <stop offset="1" stopColor="#4F9A2E" />
        </linearGradient>
        <linearGradient id="sv-mtn" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#7D86B8" />
          <stop offset="1" stopColor="#5B6699" />
        </linearGradient>
      </defs>
      <rect width="480" height="640" fill="url(#sv-sky)" />
      {/* clouds */}
      <g fill="#fff" opacity=".9">
        <ellipse cx="370" cy="120" rx="58" ry="20" /><ellipse cx="400" cy="106" rx="34" ry="22" /><ellipse cx="344" cy="112" rx="26" ry="16" />
        <ellipse cx="90" cy="300" rx="44" ry="14" opacity=".7" /><ellipse cx="116" cy="290" rx="26" ry="14" opacity=".7" />
      </g>
      {/* mountain */}
      <path d="M180 470 L300 330 L340 360 L380 320 L500 470z" fill="url(#sv-mtn)" />
      <path d="M284 350 L300 330 L318 352 L306 348 L296 358z" fill="#fff" />
      <path d="M366 336 L380 320 L394 338 L382 334z" fill="#fff" />
      {/* far hills */}
      <path d="M0 470 q120 -50 240 -10 q120 -40 240 0 L480 640 L0 640z" fill="#9AD06A" />
      {/* near ground */}
      <path d="M0 520 q140 -40 260 -6 q120 -30 220 4 L480 640 L0 640z" fill="url(#sv-grass)" />
      {/* river */}
      <path d="M330 640 q10 -60 70 -90 q40 -20 80 -18 L480 640z" fill="#5CC2E8" opacity=".85" />
      {/* path */}
      <path d="M300 640 q-10 -60 40 -100 q30 -24 60 -36" stroke="#E9C98B" strokeWidth="26" fill="none" strokeLinecap="round" opacity=".9" />
      {acacia(60, 476, 1.1)}
      {acacia(420, 470, .9)}
      {acacia(250, 460, .7, '#3E8E41', '#5DBB63')}
      {acacia(20, 560, 1.3)}
      {acacia(460, 560, 1.2)}
      {/* grass tufts */}
      <g stroke="#3F7F22" strokeWidth="3" strokeLinecap="round">
        {[[40, 610], [110, 590], [390, 600], [300, 620]].map(([x, y], i) => (
          <path key={i} d={`M${x} ${y} l-6 -14 M${x} ${y} l0 -18 M${x} ${y} l6 -14`} />
        ))}
      </g>
    </svg>
  );
}

/** A little four-point sparkle. */
export function Sparkle({ className, color = '#FBBF24' }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 0c1 6 5 11 12 12-7 1-11 6-12 12-1-6-5-11-12-12 7-1 11-6 12-12z" fill={color} />
    </svg>
  );
}

export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M12 1.5l2.9 6.5 7.1.7-5.4 4.7 1.6 7-6.2-3.7-6.2 3.7 1.6-7L2 8.7l7.1-.7z" fill="#FCD34D" stroke="#F59E0B" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ role people */

interface PersonProps {
  skin: string;
  hair: 'curls' | 'long' | 'short';
  hairColor?: string;
  shirt: string;
  glasses?: boolean;
  prop?: 'backpack' | 'book' | 'none';
  className?: string;
}

/** A friendly half-figure for the role cards. */
export function Person({ skin, hair, hairColor = '#2A1A12', shirt, glasses, prop = 'none', className }: PersonProps) {
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      {prop === 'backpack' && <rect x="20" y="58" width="60" height="36" rx="14" fill="#2563EB" />}
      {hair === 'long' && <path d="M26 44 q-4 34 8 48 l32 0 q12 -14 8 -48z" fill={hairColor} />}
      <path d="M22 100 q0 -34 28 -36 q28 2 28 36z" fill={shirt} />
      <path d="M40 66 q10 8 20 0" stroke="#fff" strokeOpacity=".6" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="44" y="54" width="12" height="12" rx="5" fill={skin} />
      <ellipse cx="50" cy="40" rx="20" ry="22" fill={skin} />
      <ellipse cx="30" cy="42" rx="4" ry="6" fill={skin} />
      <ellipse cx="70" cy="42" rx="4" ry="6" fill={skin} />
      {hair === 'curls' && (
        <g fill={hairColor}>{[[36, 24, 9], [46, 18, 10], [58, 19, 10], [66, 27, 8], [32, 32, 6], [52, 24, 8]].map(([x, y, r], i) => <circle key={i} cx={x} cy={y} r={r} />)}</g>
      )}
      {hair === 'short' && <path d="M29 38 q0 -24 21 -24 q22 0 21 24 q-4 -12 -21 -12 q-17 0 -21 12z" fill={hairColor} />}
      {hair === 'long' && <path d="M28 40 q0 -26 22 -26 q22 0 22 26 q-8 -14 -22 -14 q-14 0 -22 14z" fill={hairColor} />}
      <circle cx="42" cy="42" r="3" fill="#1F130B" />
      <circle cx="58" cy="42" r="3" fill="#1F130B" />
      <circle cx="43" cy="41" r="1" fill="#fff" />
      <circle cx="59" cy="41" r="1" fill="#fff" />
      {glasses && (
        <g stroke="#1F2937" strokeWidth="2" fill="none"><circle cx="42" cy="42" r="6" /><circle cx="58" cy="42" r="6" /><path d="M48 42 h4" /></g>
      )}
      <path d="M43 50 q7 6 14 0" stroke="#7A2E1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="36" cy="48" r="3.5" fill="#F2745F" opacity=".35" />
      <circle cx="64" cy="48" r="3.5" fill="#F2745F" opacity=".35" />
      {prop === 'book' && (
        <g transform="translate(56 70) rotate(-10)"><rect width="30" height="22" rx="3" fill="#0EA5E9" /><rect x="3" y="3" width="24" height="16" rx="2" fill="#E0F2FE" /><path d="M15 3 v16" stroke="#0EA5E9" strokeWidth="2" /></g>
      )}
    </svg>
  );
}

/** A school building for the School Leader card. */
export function SchoolBuilding({ className, tone = 'violet' }: { className?: string; tone?: 'violet' | 'orange' }) {
  const main = tone === 'violet' ? '#8B5CF6' : '#F59E0B';
  const roof = tone === 'violet' ? '#6D28D9' : '#EA580C';
  const wing = tone === 'violet' ? '#A78BFA' : '#FBBF24';
  return (
    <svg viewBox="0 0 120 100" className={className} aria-hidden>
      <ellipse cx="60" cy="94" rx="54" ry="5" fill="#0F172A" opacity=".1" />
      <rect x="8" y="50" width="32" height="42" rx="3" fill={wing} />
      <rect x="80" y="50" width="32" height="42" rx="3" fill={wing} />
      {tone === 'orange' && <rect x="0" y="60" width="16" height="32" rx="2" fill="#FDBA74" />}
      {tone === 'orange' && <rect x="104" y="60" width="16" height="32" rx="2" fill="#FDBA74" />}
      <rect x="34" y="36" width="52" height="56" rx="3" fill={main} />
      <path d="M28 38 L60 14 L92 38z" fill={roof} />
      <circle cx="60" cy="30" r="6" fill="#FEF3C7" /><path d="M60 26 v4 h3" stroke={roof} strokeWidth="1.6" fill="none" />
      <line x1="60" y1="14" x2="60" y2="2" stroke="#475569" strokeWidth="2" />
      <path d="M60 2 h12 l-3 4 l3 4 h-12z" fill="#EF4444" />
      {[[14, 58], [26, 58], [86, 58], [98, 58], [14, 74], [26, 74], [86, 74], [98, 74], [40, 46], [72, 46]].map(([x, y], i) => (
        <rect key={i} x={x} y={y} width="8" height="9" rx="1.5" fill="#E0F2FE" />
      ))}
      <rect x="52" y="68" width="16" height="24" rx="6" fill="#FDE68A" />
    </svg>
  );
}

export const ROLE_ART = {
  STUDENT: (c: string) => <Person className={c} skin={SKIN.brown} hair="curls" shirt="#F59E0B" prop="backpack" />,
  PARENT: (c: string) => <Person className={c} skin={SKIN.warm} hair="long" hairColor="#3B2314" shirt="#EC4899" />,
  TEACHER: (c: string) => <Person className={c} skin={SKIN.warm} hair="short" hairColor="#1F2937" shirt="#FFFFFF" glasses prop="book" />,
  SCHOOL_LEADER: (c: string) => <SchoolBuilding className={c} tone="violet" />,
  DISTRICT_LEADER: (c: string) => <SchoolBuilding className={c} tone="orange" />,
} as const;
