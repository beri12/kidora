import axios, { AxiosError, AxiosHeaders, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { http } from '@/services/api';

export interface Call {
  method: string;
  url: string;
  auth: string | undefined;
  data: unknown;
}

type Handler = (call: Call) => { status: number; data: unknown } | 'network';

/**
 * Fake backend: routes every request (our client AND the bare refresh call)
 * through one handler so tests read like an API transcript.
 */
export function mockBackend(handler: Handler) {
  const calls: Call[] = [];
  const adapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
    const url = `${config.url ?? ''}`.replace(/^https?:\/\/[^/]+\/api/, '');
    const call: Call = {
      method: (config.method ?? 'get').toUpperCase(),
      url,
      auth: config.headers?.get?.('Authorization') as string | undefined,
      data: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
    };
    calls.push(call);
    const out = handler(call);
    if (out === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
    const response: AxiosResponse = { data: out.data, status: out.status, statusText: '', headers: {}, config: { ...config, headers: new AxiosHeaders() } };
    if (out.status >= 400) throw new AxiosError(`HTTP ${out.status}`, 'ERR_BAD_RESPONSE', config, undefined, response);
    return response;
  };
  http.defaults.adapter = adapter;
  axios.defaults.adapter = adapter;
  return calls;
}
