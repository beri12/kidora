import { createHash, createHmac } from 'crypto';

/**
 * The bit of AWS Signature V4 that S3-compatible storage needs.
 *
 * Written against `crypto` rather than pulling in the AWS SDK: the only
 * operations Kidora performs are PUT, DELETE and presigned PUT/GET on single
 * objects, which is a few dozen lines of hashing. The previous S3 driver
 * `require()`d @aws-sdk/client-s3, which is not a dependency of this project —
 * so switching STORAGE_DRIVER to s3 threw MODULE_NOT_FOUND at the first
 * upload.
 */

export interface S3Config {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** Path-style (http://host/bucket/key) suits MinIO and most S3 clones. */
  forcePathStyle: boolean;
}

const sha256Hex = (v: string | Buffer) => createHash('sha256').update(v).digest('hex');
const hmac = (key: string | Buffer, v: string) => createHmac('sha256', key).update(v).digest();

/** RFC 3986 escaping. encodeURIComponent leaves !'()* alone; S3 does not. */
export function uriEncode(value: string, encodeSlash = true): string {
  let out = '';
  for (const ch of Buffer.from(value, 'utf8').toString('binary').split('')) {
    if (/[A-Za-z0-9\-._~]/.test(ch)) out += ch;
    else if (ch === '/') out += encodeSlash ? '%2F' : '/';
    else out += '%' + Buffer.from(ch, 'binary').toString('hex').toUpperCase().replace(/(..)/g, '$1').padStart(2, '0');
  }
  return out;
}

function amzDate(now: Date) {
  const iso = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  return { long: iso, short: iso.slice(0, 8) };
}

function signingKey(cfg: S3Config, shortDate: string) {
  const kDate = hmac('AWS4' + cfg.secretKey, shortDate);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  return hmac(kService, 'aws4_request');
}

/** Host and the path prefix the bucket occupies, for both addressing styles. */
function endpointFor(cfg: S3Config) {
  const base = cfg.endpoint
    ? cfg.endpoint.replace(/\/$/, '')
    : `https://s3.${cfg.region}.amazonaws.com`;
  const url = new URL(base);
  if (cfg.forcePathStyle) return { origin: url.origin, host: url.host, prefix: `/${cfg.bucket}` };
  return { origin: `${url.protocol}//${cfg.bucket}.${url.host}`, host: `${cfg.bucket}.${url.host}`, prefix: '' };
}

/**
 * A URL the browser can PUT one object to, with no credentials of ours in it.
 *
 * Only `host` is signed, so the browser may add Content-Type and friends
 * without breaking the signature — S3 validates signed headers only.
 */
export function presignPut(cfg: S3Config, key: string, expiresInSec: number, now = new Date()): string {
  return presign(cfg, 'PUT', key, expiresInSec, now);
}

/** The same, for reading a private object (a video a student may stream). */
export function presignGet(cfg: S3Config, key: string, expiresInSec: number, now = new Date()): string {
  return presign(cfg, 'GET', key, expiresInSec, now);
}

function presign(cfg: S3Config, method: 'PUT' | 'GET', key: string, expiresInSec: number, now: Date): string {
  const { origin, host, prefix } = endpointFor(cfg);
  const { long, short } = amzDate(now);
  const scope = `${short}/${cfg.region}/s3/aws4_request`;
  const canonicalUri = prefix + '/' + uriEncode(key, false);

  const params: Record<string, string> = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${cfg.accessKey}/${scope}`,
    'X-Amz-Date': long,
    'X-Amz-Expires': String(Math.min(Math.max(expiresInSec, 1), 604800)),
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.keys(params).sort()
    .map((k) => `${uriEncode(k)}=${uriEncode(params[k])}`).join('&');

  const canonicalRequest = [
    method, canonicalUri, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', long, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = createHmac('sha256', signingKey(cfg, short)).update(stringToSign).digest('hex');

  return `${origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/** Signed headers for a server-side request that carries a body. */
export function signedHeaders(
  cfg: S3Config, method: string, key: string, body: Buffer | null, contentType?: string, now = new Date(),
): { url: string; headers: Record<string, string> } {
  const { origin, host, prefix } = endpointFor(cfg);
  const { long, short } = amzDate(now);
  const scope = `${short}/${cfg.region}/s3/aws4_request`;
  const canonicalUri = prefix + '/' + uriEncode(key, false);
  const payloadHash = sha256Hex(body ?? '');

  const headers: Record<string, string> = {
    host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': long,
    ...(contentType ? { 'content-type': contentType } : {}),
  };
  const names = Object.keys(headers).sort();
  const canonicalHeaders = names.map((n) => `${n}:${headers[n].trim()}\n`).join('');
  const signedHeaderList = names.join(';');

  const canonicalRequest = [method, canonicalUri, '', canonicalHeaders, signedHeaderList, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', long, scope, sha256Hex(canonicalRequest)].join('\n');
  const signature = createHmac('sha256', signingKey(cfg, short)).update(stringToSign).digest('hex');

  return {
    url: `${origin}${canonicalUri}`,
    headers: {
      ...headers,
      Authorization: `AWS4-HMAC-SHA256 Credential=${cfg.accessKey}/${scope}, SignedHeaders=${signedHeaderList}, Signature=${signature}`,
    },
  };
}
