import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../../infrastructure/cache/cache.service';

export interface OtpRecord {
  codeHash: string;
  attempts: number;
  /** Epoch ms the code was texted, used to rate-limit resends. */
  issuedAt: number;
  /** Epoch ms. Only consulted by the in-memory fallback; Redis expires its own keys. */
  expiresAt: number;
}

/**
 * Short-lived storage for SMS one-time codes.
 *
 * Redis is the real backing store so codes survive a restart and work across
 * API instances. When Redis is unreachable the store degrades to an in-process
 * Map instead of failing the request: a developer running the API alone can
 * still complete an SMS login, and in production the fallback simply means a
 * code is only valid on the instance that issued it.
 */
@Injectable()
export class OtpStore {
  private logger = new Logger('OtpStore');
  private memory = new Map<string, OtpRecord>();
  private warned = false;

  constructor(private cache: CacheService) {}

  private key(scope: string, id: string) {
    return `otp:${scope}:${id}`;
  }

  private fallback(err: unknown) {
    if (!this.warned) {
      this.warned = true;
      this.logger.warn(`Redis unavailable for OTP storage, using in-memory fallback: ${(err as Error).message}`);
    }
  }

  /** Drops expired entries so the fallback Map can't grow without bound. */
  private sweep() {
    const now = Date.now();
    for (const [k, v] of this.memory) if (v.expiresAt <= now) this.memory.delete(k);
  }

  async set(scope: string, id: string, record: OtpRecord, ttlSeconds: number) {
    try {
      await this.cache.set(this.key(scope, id), record, ttlSeconds);
    } catch (err) {
      this.fallback(err);
    }
    // Always mirrored locally, so a Redis outage mid-flow can't strand a code
    // that was already texted to the user.
    this.sweep();
    this.memory.set(this.key(scope, id), record);
  }

  async get(scope: string, id: string): Promise<OtpRecord | null> {
    try {
      const hit = await this.cache.get<OtpRecord>(this.key(scope, id));
      if (hit) return hit;
    } catch (err) {
      this.fallback(err);
    }
    const local = this.memory.get(this.key(scope, id));
    if (!local) return null;
    if (local.expiresAt <= Date.now()) {
      this.memory.delete(this.key(scope, id));
      return null;
    }
    return local;
  }

  async del(scope: string, id: string) {
    try {
      await this.cache.del(this.key(scope, id));
    } catch (err) {
      this.fallback(err);
    }
    this.memory.delete(this.key(scope, id));
  }
}
