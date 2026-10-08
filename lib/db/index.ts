import postgres from "postgres";

declare global {
  // eslint-disable-next-line no-var
  var __essSql: ReturnType<typeof postgres> | undefined;
}

function connect() {
  const url = process.env.DATABASE_URL;
  // Next's build-time "collect page data" step imports every route module, including this
  // one, even for pages that only query the DB inside a request handler. Fall back to an
  // inert placeholder so the module can load without a real DATABASE_URL at build time;
  // the `postgres` client doesn't open a socket until the first query, so this only
  // surfaces as an error if something actually tries to query during the build (it shouldn't).
  // Real requests at runtime still require a working DATABASE_URL and will fail loudly if not.
  const effectiveUrl = url || "postgresql://placeholder:placeholder@localhost:5432/placeholder";
  if (!url && process.env.NEXT_PHASE !== "phase-production-build") {
    console.warn("DATABASE_URL is not set — database queries will fail.");
  }
  const local = /@(localhost|127\.0\.0\.1)/.test(effectiveUrl);
  return postgres(effectiveUrl, {
    // Supabase's pooler (pgbouncer, transaction mode) does not support prepared statements.
    prepare: false,
    max: Number(process.env.DB_POOL_MAX || 3),
    idle_timeout: 20,
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
