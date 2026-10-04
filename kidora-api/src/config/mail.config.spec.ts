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
});
