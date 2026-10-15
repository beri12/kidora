/**
 * Registers an email + password account and finishes email verification, so
 * the suites get a signed-in account the way they did before registration
 * started requiring the emailed code.
 *
 * The API only returns the code (as `devCode`) when it runs with
 * AUTH_TEST_EXPOSE_OTP=true outside production and no mail server is
 * reachable — the browser never sees it. Start the API for the suites with:
 *
 *   AUTH_TEST_EXPOSE_OTP=true npm run start:dev
 */
const API = process.env.API_URL || 'http://localhost:4000/api';

async function postJson(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

/** Returns the same `{ user, accessToken, refreshToken }` /auth/register used to. */
async function register(payload) {
  const reg = await postJson('/auth/register', payload);
  if (!reg.body?.needsEmailVerification) return reg.body; // an error body, passed through for the suite to report
  if (!reg.body.devCode) {
    console.error(
      '\nRegistration now emails a verification code, and this API did not return one.\n' +
      'Restart it with AUTH_TEST_EXPOSE_OTP=true (and no reachable SMTP server) for the e2e suites.\n',
    );
    process.exit(1);
  }
  const verified = await postJson('/auth/email/verify', { email: reg.body.email, code: reg.body.devCode });
  return verified.body;
}

module.exports = { register };
