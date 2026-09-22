import { SmsService } from './sms.service';

describe('SmsService.normalize', () => {
  const service = new SmsService();
  const original = process.env.SMS_DEFAULT_COUNTRY_CODE;

  afterEach(() => {
    if (original === undefined) delete process.env.SMS_DEFAULT_COUNTRY_CODE;
    else process.env.SMS_DEFAULT_COUNTRY_CODE = original;
  });

  describe('numbers already in international form', () => {
    beforeEach(() => { delete process.env.SMS_DEFAULT_COUNTRY_CODE; });

    it('keeps a well-formed E.164 number', () => {
      expect(service.normalize('+251912345678')).toBe('+251912345678');
    });

    it('strips the separators people type', () => {
      expect(service.normalize('+1 (500) 555-0001')).toBe('+15005550001');
    });

    it('treats a 00 prefix as +', () => {
      expect(service.normalize('00251912345678')).toBe('+251912345678');
    });

    it('rejects a number that is too short to be E.164', () => {
      expect(service.normalize('+1234')).toBeNull();
    });

    it('rejects a number that is too long to be E.164', () => {
      expect(service.normalize('+1234567890123456')).toBeNull();
    });

    it('rejects a country code starting with 0', () => {
      expect(service.normalize('+0912345678')).toBeNull();
    });

    it('rejects a local number when no default country code is configured', () => {
      expect(service.normalize('0912345678')).toBeNull();
    });
  });

  describe('local numbers with a default country code', () => {
    beforeEach(() => { process.env.SMS_DEFAULT_COUNTRY_CODE = '+251'; });

    it('prefixes the country code and drops the trunk zero', () => {
      expect(service.normalize('0912345678')).toBe('+251912345678');
    });

    it('accepts a country code written without the +', () => {
      process.env.SMS_DEFAULT_COUNTRY_CODE = '251';
      expect(service.normalize('0912345678')).toBe('+251912345678');
    });

    // Regression: "12345" used to become the well-formed but nonexistent
    // +25112345, so the mistake only surfaced when Twilio refused it.
    it('rejects a local number too short to be real', () => {
      expect(service.normalize('12345')).toBeNull();
    });

    it('rejects a non-numeric string', () => {
      expect(service.normalize('not-a-number')).toBeNull();
    });

    it('rejects an empty string', () => {
      expect(service.normalize('')).toBeNull();
    });
  });

  describe('enabled', () => {
    const keys = [
      'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER',
      'TWILIO_SID', 'TWILIO_TOKEN', 'TWILIO_FROM', 'TWILIO_MESSAGING_SERVICE_SID',
    ];
    const saved: Record<string, string | undefined> = {};

    beforeEach(() => { keys.forEach((k) => { saved[k] = process.env[k]; delete process.env[k]; }); });
    afterEach(() => { keys.forEach((k) => { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]!; }); });

    it('is false with no credentials', () => {
      expect(service.enabled).toBe(false);
    });

    it('accepts the console spelling of the Twilio env vars', () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC123';
      process.env.TWILIO_AUTH_TOKEN = 'token';
      process.env.TWILIO_PHONE_NUMBER = '+15005550006';
      expect(service.enabled).toBe(true);
    });

    it('accepts the short spelling of the Twilio env vars', () => {
      process.env.TWILIO_SID = 'AC123';
      process.env.TWILIO_TOKEN = 'token';
      process.env.TWILIO_FROM = '+15005550006';
      expect(service.enabled).toBe(true);
    });

    it('accepts a messaging service instead of a from-number', () => {
      process.env.TWILIO_ACCOUNT_SID = 'AC123';
      process.env.TWILIO_AUTH_TOKEN = 'token';
      process.env.TWILIO_MESSAGING_SERVICE_SID = 'MG123';
      expect(service.enabled).toBe(true);
    });

    it('is false when a from-number is set but credentials are missing', () => {
      process.env.TWILIO_FROM = '+15005550006';
      expect(service.enabled).toBe(false);
    });
  });
});
