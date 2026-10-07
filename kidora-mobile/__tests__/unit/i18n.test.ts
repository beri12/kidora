import { interpolate, registerBundle, setLocale, translate } from '@/i18n';
import { am } from '@/i18n/locales/am';
import { en } from '@/i18n/locales/en';

function leafKeys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => (typeof v === 'string' ? [`${prefix}${k}`] : leafKeys(v as object, `${prefix}${k}.`)));
}

describe('i18n', () => {
  afterEach(() => setLocale('en'));

  it('interpolates params', () => {
    expect(interpolate('Hi {{name}}, {{n}} XP', { name: 'Charles', n: 120 })).toBe('Hi Charles, 120 XP');
    expect(interpolate('Keep {{missing}}', {})).toBe('Keep {{missing}}');
  });

  it('translates with params', () => {
    expect(translate('student.dashboard.xpToNext', { xp: 120, level: 8 })).toBe("You're 120 XP away from Level 8.");
  });

  it('uses Amharic when selected and falls back to English for missing keys', () => {
    expect(translate('nav.home', undefined, 'am')).toBe('መነሻ');
    expect(translate('teacher.dashboard.title', undefined, 'am')).toBe('Teacher dashboard');
  });

  it('every Amharic key exists in English (no orphans)', () => {
    const enKeys = new Set(leafKeys(en));
    leafKeys(am).forEach((k) => expect(enKeys.has(k)).toBe(true));
  });

  it('supports backend-delivered bundles for new languages', () => {
    registerBundle('fr', { common: { continue: 'Continuer' } });
    expect(translate('common.continue', undefined, 'fr')).toBe('Continuer');
    expect(translate('common.cancel', undefined, 'fr')).toBe('Cancel');
  });

  it('keeps placeholders consistent between English and Amharic', () => {
    const enMap = new Map<string, string>();
    const collect = (o: object, p = '', into: Map<string, string>) =>
      Object.entries(o).forEach(([k, v]) => (typeof v === 'string' ? into.set(`${p}${k}`, v) : collect(v as object, `${p}${k}.`, into)));
    collect(en, '', enMap);
    const amMap = new Map<string, string>();
    collect(am, '', amMap);
    const vars = (s: string) => (s.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((x) => x.replace(/\s/g, '')).sort();
    amMap.forEach((v, k) => expect(vars(v)).toEqual(vars(enMap.get(k) ?? '')));
  });
});
