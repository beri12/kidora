import { codePrefix, normalizeCode, randomPart } from './course-access.service';

describe('course access codes', () => {
  it('normalises case, spaces and a missing dash', () => {
    expect(normalizeCode('cpp-7k4m9x')).toBe('CPP-7K4M9X');
    expect(normalizeCode(' CPP 7K4M9X ')).toBe('CPP-7K4M9X');
    expect(normalizeCode('cpp7k4m9x')).toBe('CPP-7K4M9X');
    expect(normalizeCode('CPP-7K4M9X;DROP')).toBe('CPP-7K4M9XDROP');
  });

  it('derives a short readable prefix from the title', () => {
    expect(codePrefix('C++ Programming for Beginners')).toBe('CPP');
    expect(codePrefix('Mathematics Grade 3')).toBe('MAT');
    expect(codePrefix('AI')).toBe('AI');
    expect(codePrefix('!!!')).toBe('KID');
  });

  it('makes random parts from an unambiguous alphabet', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const p = randomPart();
      expect(p).toMatch(/^[2-9A-HJKMNP-Z]{6}$/);
      seen.add(p);
    }
    expect(seen.size).toBeGreaterThan(1990);
  });
});
