export async function fetchWithRetry(url: string, retries = 3, timeout = 15000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
    });

    if (!res.ok) {
      if (res.status === 429 && retries > 0) {
        await delay(backoff(retries));
        return fetchWithRetry(url, retries - 1);
      }

      throw new Error(`HTTP ${res.status}`);
    }

    return await res.text();
  } catch (err) {
    if (retries > 0) {
      await delay(backoff(retries));
      return fetchWithRetry(url, retries - 1);
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

function backoff(retry: number) {
  return Math.min(1000 * 2 ** (3 - retry), 8000);
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
