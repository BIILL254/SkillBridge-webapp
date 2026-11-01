// resilientFetch.js
//
// Week 11: Resilience — When Your Partner Is Slow, Flaky, or Gone.
// Wraps fetch with timeouts, exponential backoff retries, and transient status filtering.
//
// Rules:
//   1. Retries are capped at 2 (total 3 attempts).
//   2. Never retry unsafe HTTP writes (POST, PUT, PATCH, DELETE).
//   3. Only retry transient failures: timeout, network drop, 429, 500, 502, 503, 504.
//   4. Never retry permanent client errors: 400, 401, 403, 404.
//   5. Honor partner's Retry-After header on 429 (capped at 5s).

export const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);
export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms || 0)));

function failureReason(err) {
  if (err?.name === "TimeoutError" || err?.name === "AbortError") return "timeout";
  return err?.cause?.code || err?.code || err?.name || "network error";
}

export async function fetchWithRetry(url, options = {}, config = {}) {
  const configuredTimeout = Number(config.timeoutMs);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0 ? configuredTimeout : 1500;
  const configuredRetries = Number(config.retries);
  const retries = Number.isFinite(configuredRetries) ? Math.max(0, Math.min(2, Math.floor(configuredRetries))) : 2;
  const configuredDelay = Number(config.delayMs);
  const delayMs = Number.isFinite(configuredDelay) && configuredDelay >= 0 ? configuredDelay : 200;

  const method = (options.method || "GET").toUpperCase();
  const maxRetries = method === "GET" ? retries : 0; // never retry writes

  for (let attempt = 0; ; attempt++) {
    let wait = delayMs * 2 ** attempt; // e.g. 200 ms, then 400 ms
    let reason;
    try {
      const res = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs),
      });

      // If response is good, or status is non-retryable (e.g. 400/401/404), or retries exhausted: return immediately
      if (!RETRY_STATUSES.has(res.status) || attempt >= maxRetries) {
        return res;
      }
      reason = `HTTP ${res.status}`;

      // Check for partner rate limit Retry-After header
      const rawHeader = res.headers?.get ? res.headers.get("Retry-After") : res.headers?.["retry-after"];
      const retryAfter = Number(rawHeader);
      if (res.status === 429 && Number.isFinite(retryAfter) && retryAfter > 0) {
        wait = Math.min(retryAfter * 1000, 5000); // wait as requested, up to 5s
      }
    } catch (err) {
      if (attempt >= maxRetries) {
        throw err; // out of retries, propagate failure
      }
      reason = failureReason(err);
    }

    console.warn(`[resilientFetch] attempt ${attempt + 1} failed (${reason}), retrying in ${wait} ms`);
    await sleep(wait);
  }
}

export default fetchWithRetry;
