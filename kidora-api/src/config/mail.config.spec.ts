import mailConfig from './mail.config';
import { EmailService } from '../infrastructure/email/email.service';

describe('mail config', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });
  const load = (vars: Record<string, string>) => {
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'MAIL_FROM']) delete process.env[k];
    Object.assign(process.env, vars);
    return mailConfig();
  };

  it('defaults to MailHog on localhost:1025 without TLS', () => {
    expect(load({})).toMatchObject({ host: 'localhost', port: 1025, secure: false });
  });

  it('uses TLS on port 465 (it was hard-coded off, so 465 servers never connected)', () => {
    expect(load({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '465' }).secure).toBe(true);
    expect(load({ SMTP_HOST: 'smtp.gmail.com', SMTP_PORT: '587' }).secure).toBe(false);
    expect(load({ SMTP_PORT: '587', SMTP_SECURE: 'true' }).secure).toBe(true);
  });

  it('cleans pasted values and strips the spaces Google shows in app passwords', () => {
    const c = load({ SMTP_HOST: ' "smtp.gmail.com" ', SMTP_PORT: '465', SMTP_USER: 'kidora@gmail.com', SMTP_PASS: '"abcd efgh ijkl mnop"' });
    expect(c).toMatchObject({ host: 'smtp.gmail.com', user: 'kidora@gmail.com', pass: 'abcdefghijklmnop' });
  });

  it('sends from the SMTP account when MAIL_FROM is not set', () => {
    expect(load({ SMTP_USER: 'kidora@gmail.com' }).from).toBe('Kidora <kidora@gmail.com>');
    expect(load({ SMTP_USER: 'kidora@gmail.com', MAIL_FROM: 'Kidora <hi@justkidora.com>' }).from).toBe('Kidora <hi@justkidora.com>');
  });

  it('explains SMTP failures in actionable words', () => {
    expect(EmailService.explain({ code: 'EAUTH', message: '535 bad credentials' })).toMatch(/App Password/);
    expect(EmailService.explain({ code: 'ECONNREFUSED', message: 'x' })).toMatch(/SMTP_HOST \/ SMTP_PORT/);
    expect(EmailService.explain({ code: 'ETIMEDOUT', message: 'x' })).toMatch(/465 \(SSL\) or 587/);
  });

  describe('startup warnings (never print values)', () => {
    const gmail = { host: 'smtp.gmail.com', user: 'kidora@gmail.com', from: 'Kidora <kidora@gmail.com>' };

    it('a 16-letter App Password with matching sender is fine', () => {
      expect(EmailService.configWarnings({ ...gmail, pass: 'abcdefghijklmnop' })).toEqual([]);
    });

    it('flags a normal Gmail password — the cause of 535-5.7.8 — without echoing it', () => {
      const w = EmailService.configWarnings({ ...gmail, pass: 'MyGmail#Pass2026' });
      expect(w.join(' ')).toMatch(/535-5\.7\.8/);
      expect(w.join(' ')).not.toContain('MyGmail#Pass2026');
    });

    it('flags a sender Gmail will rewrite, and missing credentials', () => {
      expect(EmailService.configWarnings({ ...gmail, pass: 'abcdefghijklmnop', from: 'Kidora <no-reply@kidora.app>' }).join(' ')).toMatch(/MAIL_FROM/);
      expect(EmailService.configWarnings({ host: 'smtp.example.com', user: '', pass: '', from: 'x' })).toHaveLength(2);
    });

    it('says MailHog does not reach real inboxes', () => {
      expect(EmailService.configWarnings({ host: 'localhost', user: '', pass: '', from: 'x' })[0]).toMatch(/MailHog/);
    });
  });

  describe('development code fallback', () => {
    it('is allowed only in development on a localhost WEB_URL', () => {
      process.env.NODE_ENV = 'development'; delete process.env.WEB_URL;
      expect(EmailService.devFallbackAllowed()).toBe(true);
      process.env.WEB_URL = 'http://localhost:3000';
      expect(EmailService.devFallbackAllowed()).toBe(true);
      process.env.WEB_URL = 'https://justkidora.com';
      expect(EmailService.devFallbackAllowed()).toBe(false); // live site without NODE_ENV
      process.env.NODE_ENV = 'production'; process.env.WEB_URL = 'http://localhost:3000';
      expect(EmailService.devFallbackAllowed()).toBe(false);
    });

    it('never logs the code when the fallback is not allowed', async () => {
      process.env.NODE_ENV = 'production';
      const svc = new EmailService({ get: (k: string) => ({ 'mail.host': 'localhost', 'mail.port': 1, 'mail.secure': false } as Record<string, unknown>)[k] } as never);
      (svc as unknown as { transporter: { sendMail: () => Promise<never> } }).transporter = { sendMail: () => Promise.reject(Object.assign(new Error('535'), { code: 'EAUTH' })) };
      const logs: string[] = [];
      const l = (svc as unknown as { logger: Record<string, (m: string) => void> }).logger;
      l.error = (m) => logs.push(m); l.warn = (m) => logs.push(m); l.log = (m) => logs.push(m);
      await expect(svc.sendVerificationCode('a@b.c', 'A', '482913', 10)).rejects.toThrow("couldn't send");
      expect(logs.join(' ')).not.toContain('482913');
    });
  });
});
