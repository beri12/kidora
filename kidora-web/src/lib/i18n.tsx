'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
] as const;

export type LangCode = (typeof LANGUAGES)[number]['code'];
const RTL: LangCode[] = ['ar'];

// Translation dictionary. `en` is the source of truth; other locales fall back to en for missing keys.
type Dict = Record<string, string>;
export const STRINGS: Record<LangCode, Dict> = {
  en: {
    'nav.products': 'Products', 'nav.schools': 'Schools', 'nav.districts': 'Districts',
    'nav.teachers': 'Teachers',
    'nav.families': 'Families', 'nav.pricing': 'Pricing', 'nav.dashboard': 'Dashboard',
    'nav.login': 'Log in', 'nav.signup': 'Sign up',
    'prod.kidora': 'The core learning adventure', 'prod.plus': 'Unlock every world & the AI tutor',
    'prod.islands': 'Explorable 3D learning worlds', 'prod.tutor': 'AI homework helper',
    'prod.sparks': 'Creativity & mini-games',
    'signup.title': 'Sign up for Kidora as a…', 'signup.subtitle': 'Choose the role that fits you best',
    'signup.haveAccount': 'Already have an account?',
    'role.child': 'Student', 'role.parent': 'Parent', 'role.teacher': 'Teacher',
    'role.school': 'School Leader', 'role.district': 'District Leader',
    'role.child.desc': 'Learn, play & earn badges',
    'role.parent.desc': "Follow your child's journey",
    'role.teacher.desc': 'Manage classes & lessons',
    'role.school.desc': 'Oversee your whole school',
    'role.district.desc': 'Manage schools district-wide',
    'auth.login': 'Log in', 'auth.new': 'New here?', 'auth.createAccount': 'Create an account',
    'auth.email': 'Email', 'auth.password': 'Password', 'auth.welcome': 'Welcome back!',
    'auth.ready': 'Ready for a new adventure?',
  },
  es: {
    'nav.products': 'Productos', 'nav.schools': 'Escuelas', 'nav.districts': 'Distritos',
    'nav.teachers': 'Profesores',
    'nav.families': 'Familias', 'nav.pricing': 'Precios', 'nav.dashboard': 'Panel',
    'nav.login': 'Entrar', 'nav.signup': 'Registrarse',
    'signup.title': 'Regístrate en Kidora como…', 'signup.subtitle': 'Elige el rol que mejor te queda',
    'signup.haveAccount': '¿Ya tienes una cuenta?',
    'role.child': 'Estudiante', 'role.parent': 'Padre', 'role.teacher': 'Profesor',
    'role.school': 'Director escolar', 'role.district': 'Director de distrito',
    'auth.login': 'Entrar', 'auth.new': '¿Nuevo aquí?', 'auth.createAccount': 'Crear una cuenta',
    'auth.email': 'Correo', 'auth.password': 'Contraseña', 'auth.welcome': '¡Bienvenido de nuevo!',
    'auth.ready': '¿Listo para una nueva aventura?',
  },
  fr: {
    'nav.products': 'Produits', 'nav.schools': 'Écoles', 'nav.districts': 'Districts',
    'nav.teachers': 'Enseignants',
    'nav.families': 'Familles', 'nav.pricing': 'Tarifs', 'nav.dashboard': 'Tableau',
    'nav.login': 'Connexion', 'nav.signup': "S'inscrire",
    'signup.title': 'Inscrivez-vous à Kidora en tant que…', 'signup.subtitle': 'Choisissez le rôle qui vous convient',
    'signup.haveAccount': 'Vous avez déjà un compte ?',
    'role.child': 'Élève', 'role.parent': 'Parent', 'role.teacher': 'Enseignant',
    'role.school': "Chef d'établissement", 'role.district': 'Responsable de district',
    'auth.login': 'Connexion', 'auth.new': 'Nouveau ?', 'auth.createAccount': 'Créer un compte',
    'auth.email': 'E-mail', 'auth.password': 'Mot de passe', 'auth.welcome': 'Bon retour !',
    'auth.ready': 'Prêt pour une nouvelle aventure ?',
  },
  ar: {
    'nav.products': 'المنتجات', 'nav.schools': 'المدارس', 'nav.districts': 'المناطق',
    'nav.teachers': 'المعلمون',
    'nav.families': 'العائلات', 'nav.pricing': 'الأسعار', 'nav.dashboard': 'لوحة التحكم',
    'nav.login': 'تسجيل الدخول', 'nav.signup': 'إنشاء حساب',
    'signup.title': 'سجّل في كيدورا بصفتك…', 'signup.subtitle': 'اختر الدور الأنسب لك',
    'signup.haveAccount': 'لديك حساب بالفعل؟',
    'role.child': 'طالب', 'role.parent': 'ولي أمر', 'role.teacher': 'معلم',
    'role.school': 'قائد مدرسة', 'role.district': 'قائد منطقة',
    'auth.login': 'تسجيل الدخول', 'auth.new': 'جديد هنا؟', 'auth.createAccount': 'إنشاء حساب',
    'auth.email': 'البريد الإلكتروني', 'auth.password': 'كلمة المرور', 'auth.welcome': 'مرحبًا بعودتك!',
    'auth.ready': 'مستعد لمغامرة جديدة؟',
  },
  hi: {
    'nav.products': 'उत्पाद', 'nav.schools': 'स्कूल', 'nav.districts': 'ज़िले',
    'nav.teachers': 'शिक्षक',
    'nav.families': 'परिवार', 'nav.pricing': 'मूल्य', 'nav.dashboard': 'डैशबोर्ड',
    'nav.login': 'लॉग इन', 'nav.signup': 'साइन अप',
    'signup.title': 'Kidora में इस रूप में साइन अप करें…', 'signup.subtitle': 'अपने लिए सही भूमिका चुनें',
    'signup.haveAccount': 'पहले से खाता है?',
    'role.child': 'छात्र', 'role.parent': 'अभिभावक', 'role.teacher': 'शिक्षक',
    'role.school': 'स्कूल प्रमुख', 'role.district': 'ज़िला प्रमुख',
    'auth.login': 'लॉग इन', 'auth.new': 'नए हैं?', 'auth.createAccount': 'खाता बनाएं',
    'auth.email': 'ईमेल', 'auth.password': 'पासवर्ड', 'auth.welcome': 'वापसी पर स्वागत है!',
    'auth.ready': 'नई यात्रा के लिए तैयार?',
  },
  zh: {
    'nav.products': '产品', 'nav.schools': '学校', 'nav.districts': '学区',
    'nav.teachers': '教师',
    'nav.families': '家庭', 'nav.pricing': '价格', 'nav.dashboard': '仪表板',
    'nav.login': '登录', 'nav.signup': '注册',
    'signup.title': '注册 Kidora 身份为…', 'signup.subtitle': '选择最适合你的角色',
    'signup.haveAccount': '已有账户？',
    'role.child': '学生', 'role.parent': '家长', 'role.teacher': '教师',
    'role.school': '学校负责人', 'role.district': '学区负责人',
    'auth.login': '登录', 'auth.new': '第一次来？', 'auth.createAccount': '创建账户',
    'auth.email': '邮箱', 'auth.password': '密码', 'auth.welcome': '欢迎回来！',
    'auth.ready': '准备好新的冒险了吗？',
  },
};

interface I18nCtx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>('en');

  // Restore saved language on mount.
  useEffect(() => {
    const saved = (typeof localStorage !== 'undefined' && localStorage.getItem('kidora.lang')) as LangCode | null;
    if (saved && STRINGS[saved]) setLangState(saved);
  }, []);

  // Apply <html lang> + direction whenever language changes.
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = (l: LangCode) => { setLangState(l); try { localStorage.setItem('kidora.lang', l); } catch {} };
  const t = (key: string) => STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key;
  const dir: 'ltr' | 'rtl' = RTL.includes(lang) ? 'rtl' : 'ltr';

  return <Ctx.Provider value={{ lang, setLang, t, dir }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within <I18nProvider>');
  return ctx;
}
// Convenience: just the translate fn.
export const useT = () => useI18n().t;
