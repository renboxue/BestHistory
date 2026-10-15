import { corsHeaders, jsonResponse } from '../_shared/cors.ts';

type ClientMeta = {
  app?: string;
  version?: string;
};

type ClientConfigBody = {
  _client?: ClientMeta;
};

function normalizeVersion(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(trimmed) ? trimmed : fallback;
}

function compareVersions(left: string, right: string): number {
  const a = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const b = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const av = a[index] || 0;
    const bv = b[index] || 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function parseBoolean(value: string | undefined, fallback = false): boolean {
  if (value == null) return fallback;
  return value.trim().toLocaleLowerCase() === 'true';
}

function parseFeatureFlags(value: string | undefined): Record<string, boolean> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const flags: Record<string, boolean> = {};
    for (const [key, raw] of Object.entries(parsed)) {
      if (typeof raw === 'boolean') flags[key] = raw;
    }
    return flags;
  } catch {
    return {};
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const body = await req.json().catch(() => null) as ClientConfigBody | null;
  const clientVersionRaw = body?._client?.version;
  const clientVersion = typeof clientVersionRaw === 'string' && clientVersionRaw.trim()
    ? clientVersionRaw.trim().slice(0, 32)
    : null;

  const latestVersion = normalizeVersion(Deno.env.get('APP_LATEST_VERSION'), '1.0.0');
  const minSupportedVersion = normalizeVersion(Deno.env.get('APP_MIN_SUPPORTED_VERSION'), '1.0.0');
  const maintenance = parseBoolean(Deno.env.get('APP_MAINTENANCE'), false);
  const featureFlags = parseFeatureFlags(Deno.env.get('APP_FEATURE_FLAGS'));
  const comparableClientVersion = clientVersion && /^\d+\.\d+\.\d+(?:\.\d+)?$/.test(clientVersion)
    ? clientVersion
    : null;

  const supported = comparableClientVersion
    ? compareVersions(comparableClientVersion, minSupportedVersion) >= 0
    : true;
  const upgradeRecommended = comparableClientVersion
    ? compareVersions(comparableClientVersion, latestVersion) < 0
    : false;

  return jsonResponse({
    apiVersion: 1,
    app: 'besthistory',
    clientVersion,
    latestVersion,
    minSupportedVersion,
    supported,
    upgradeRecommended,
    maintenance,
    featureFlags,
  });
});
