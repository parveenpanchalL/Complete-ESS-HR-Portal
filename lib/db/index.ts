import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __essSql: ReturnType<typeof postgres> | undefined;
}

function cleanUrl(rawUrl?: string): string {
  if (!rawUrl) return "postgresql://placeholder:placeholder@localhost:5432/placeholder";
  let url = rawUrl.trim();
  if ((url.startsWith('"') && url.endsWith('"')) || (url.startsWith("'") && url.endsWith("'"))) {
    url = url.slice(1, -1);
  }
  // Remove square brackets around password if user accidentally left them from example: :[password]@
  url = url.replace(/:\[([^\]]+)\]@/, (_, pw) => `:${encodeURIComponent(pw)}@`);

  try {
    new URL(url);
    return url;
  } catch {
    // If invalid URL, use fallback during build so next build never crashes
    return "postgresql://placeholder:placeholder@localhost:5432/placeholder";
  }
}

function connect() {
  const url = process.env.DATABASE_URL;
  const effectiveUrl = cleanUrl(url);
  if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn("DATABASE_URL is not set — database queries will fail.");
  }
  const local = /@(localhost|127\.0\.0\.1)/.test(effectiveUrl);
  return postgres(effectiveUrl, {
    prepare: false,
    max: Number(process.env.DB_POOL_MAX || 1),
    idle_timeout: 10,
    max_lifetime: 120,
    connect_timeout: 8,
    ssl: local || /sslmode=/.test(effectiveUrl) ? undefined : "require",
  });
}

export const sql = global.__essSql ?? (global.__essSql = connect());

/** Convert `?` placeholders to $1, $2, ... */
function toPg(text: string) {
  let i = 0;
  return text.replace(/\?/g, () => `$${++i}`);
}

type Param = string | number | boolean | null;
type Runner = { unsafe: (q: string, p?: Param[]) => PromiseLike<unknown> };

export async function q<T = Record<string, any>>(text: string, params: Param[] = []): Promise<T[]> {
  if (params.length === 0) return (await sql.unsafe(text)) as unknown as T[];
  return (await sql.unsafe(toPg(text), params as never[])) as unknown as T[];
}
export async function q1<T = Record<string, any>>(text: string, params: Param[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}
export async function run(text: string, params: Param[] = []): Promise<void> {
  if (params.length === 0) await sql.unsafe(text);
  else await sql.unsafe(toPg(text), params as never[]);
}

export type Tx = {
  q: <T = Record<string, any>>(text: string, params?: Param[]) => Promise<T[]>;
  run: (text: string, params?: Param[]) => Promise<void>;
};

/** Run several statements atomically. */
export async function tx<T>(fn: (t: Tx) => Promise<T>): Promise<T> {
  return (await sql.begin(async (t) => {
    const r = t as unknown as Runner;
    const txq = async <R = Record<string, any>>(text: string, params: Param[] = []) =>
      (await r.unsafe(toPg(text), params)) as unknown as R[];
    return fn({ q: txq, run: async (text, params = []) => void (await r.unsafe(toPg(text), params)) });
  })) as T;
}
