import { BadRequestException } from '@nestjs/common';
import { POLICIES, assertAllowed, safeName } from './upload-policy';

const f = (originalname: string, mimetype: string) => ({ originalname, mimetype });

describe('assertAllowed', () => {
  it('accepts the ordinary cases for each kind', () => {
    expect(() => assertAllowed('image', f('photo.png', 'image/png'))).not.toThrow();
    expect(() => assertAllowed('video', f('lesson.mp4', 'video/mp4'))).not.toThrow();
    expect(() => assertAllowed('file', f('worksheet.pdf', 'application/pdf'))).not.toThrow();
    expect(() => assertAllowed('subtitle', f('captions.vtt', 'text/vtt'))).not.toThrow();
  });

  it('is case-insensitive about the extension', () => {
    expect(() => assertAllowed('image', f('PHOTO.PNG', 'image/png'))).not.toThrow();
  });

  it('ignores charset parameters on the MIME type', () => {
    expect(() => assertAllowed('subtitle', f('c.vtt', 'text/vtt; charset=utf-8'))).not.toThrow();
  });

  it('rejects a scriptable file dressed up as an image', () => {
    // The stored file keeps its extension and is served from our own origin,
    // so trusting the browser's MIME type alone would be stored XSS.
    expect(() => assertAllowed('image', f('evil.html', 'image/png'))).toThrow(BadRequestException);
    expect(() => assertAllowed('image', f('evil.svg', 'image/svg+xml'))).toThrow(BadRequestException);
  });

  it('rejects a real extension carrying the wrong MIME type', () => {
    expect(() => assertAllowed('image', f('evil.png', 'text/html'))).toThrow(BadRequestException);
  });

  it('rejects a file with no extension at all', () => {
    expect(() => assertAllowed('file', f('README', 'text/plain'))).toThrow(BadRequestException);
  });

  it('keeps the kinds apart', () => {
    expect(() => assertAllowed('image', f('lesson.mp4', 'video/mp4'))).toThrow(BadRequestException);
    expect(() => assertAllowed('video', f('photo.png', 'image/png'))).toThrow(BadRequestException);
  });

  it('accepts .srt whatever MIME the browser invents for it', () => {
    // Browsers send octet-stream, text/plain or nothing at all for .srt.
    expect(() => assertAllowed('subtitle', f('c.srt', 'application/octet-stream'))).not.toThrow();
    expect(() => assertAllowed('subtitle', f('c.srt', ''))).not.toThrow();
    expect(() => assertAllowed('subtitle', f('c.srt', 'text/plain'))).not.toThrow();
  });

  it('does not let the generic-MIME allowance widen the extension list', () => {
    expect(() => assertAllowed('subtitle', f('evil.exe', 'application/octet-stream'))).toThrow(BadRequestException);
  });

  it('says what was expected', () => {
    expect(() => assertAllowed('image', f('x.txt', 'text/plain'))).toThrow(/image/);
  });
});

describe('safeName', () => {
  it('strips directories from the name the browser sent', () => {
    expect(safeName('../../etc/passwd')).toBe('passwd');
    expect(safeName('C:\\Users\\me\\photo.png')).toBe('photo.png');
  });

  it('strips control characters', () => {
    expect(safeName('re\nport.pdf')).toBe('report.pdf');
  });

  it('never returns an empty name', () => {
    expect(safeName('')).toBe('file');
    expect(safeName('/')).toBe('file');
  });

  it('caps absurdly long names', () => {
    expect(safeName('a'.repeat(500) + '.png').length).toBeLessThanOrEqual(200);
  });
});

describe('POLICIES', () => {
  it('never allows a scriptable extension anywhere', () => {
    const dangerous = ['.html', '.htm', '.svg', '.xml', '.js', '.exe', '.sh'];
    for (const policy of Object.values(POLICIES)) {
      for (const ext of policy.extensions) expect(dangerous).not.toContain(ext);
    }
  });
});
