import { registerAs } from '@nestjs/config';
import { cleanEnv } from './oauth-callback';

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/**
 * SMTP settings. Unset, mail goes to localhost:1025 (MailHog in
 * docker-compose), which is fine for development but reaches no real inbox.
 */
export default registerAs('mail', () => {
  const host = cleanEnv(process.env.SMTP_HOST) || 'localhost';
  const port = Number(cleanEnv(process.env.SMTP_PORT) || 1025);
  const user = cleanEnv(process.env.SMTP_USER);
  let pass = cleanEnv(process.env.SMTP_PASS);
  // Google shows app passwords as "abcd efgh ijkl mnop"; the spaces are not part of it.
  if (/(^|\.)gmail\.com$|googlemail\.com$/i.test(host)) pass = pass.replace(/\s+/g, '');

  // Port 465 is TLS from the first byte ("SMTPS"); 587 and 25 start plain and
  // upgrade with STARTTLS. `secure` was hard-coded to false, so every 465
  // server (Gmail, Zoho, cPanel hosts) failed to connect. SMTP_SECURE overrides.
  const secureEnv = cleanEnv(process.env.SMTP_SECURE).toLowerCase();
  const secure = secureEnv ? secureEnv === 'true' : port === 465;

  // Most providers refuse a From address the account does not own. With no
  // MAIL_FROM, send as the account itself.
  const from = cleanEnv(process.env.MAIL_FROM) || (isEmail(user) ? `Kidora <${user}>` : 'Kidora <hello@kidora.com>');

  return { host, port, secure, user, pass, from };
});
