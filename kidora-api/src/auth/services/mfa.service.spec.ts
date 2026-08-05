import { MfaService } from './mfa.service';
import { authenticator } from 'otplib';

describe('MfaService.verify', () => {
  const service = new MfaService({} as any, { get: () => 'Kidora' } as any);
  it('accepts a valid TOTP code', () => {
    const secret = authenticator.generateSecret();
    const code = authenticator.generate(secret);
    expect(service.verify(secret, code)).toBe(true);
  });
  it('rejects a wrong code', () => {
    const secret = authenticator.generateSecret();
    expect(service.verify(secret, '000000')).toBe(false);
  });
});
