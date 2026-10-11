export const SKIP_INTRO_KEY = 'wabuddy-skip-intro';
export const skipIntro = () => { try { return localStorage.getItem(SKIP_INTRO_KEY) === 'true'; } catch { return false; } };
export const accountId = () => document.documentElement.dataset.account || 'default';
export const accountStorage = (key: string) => `${key}:${accountId()}`;

export function bindAccount(value: {account_id: string; mode: string}) {
  const current = document.documentElement.dataset.account;
  if (current && current !== value.account_id) throw new Error('The active account changed. Reload WABuddy before continuing.');
  document.documentElement.dataset.account = value.account_id;
  document.documentElement.dataset.accountMode = value.mode;
}

export async function accountRequest(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
  const pinned = document.documentElement.dataset.account;
  const bootstrap = await readFetch('/api/bootstrap' + (pinned ? '?account=' + encodeURIComponent(pinned) : ''));
  if (!bootstrap.ok) throw new Error('Cannot reach WABuddy.');
  const session = await bootstrap.json();
  bindAccount(session);
  let response: Response;
  try { response = await (method === 'GET' ? readFetch : fetch)(path, {
    method, cache: 'no-store', signal: AbortSignal.timeout(40000),
    headers: {'Content-Type': 'application/json', 'X-CSRF-Token': session.csrf_token, 'X-WABuddy-Account': accountId()},
    body: body === undefined ? undefined : JSON.stringify(body),
  }); } catch { throw new Error('Connection interrupted. The result is unknown; refresh before trying again.'); }
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.detail === 'string' ? value.detail : 'The request could not be completed.');
  return value;
}

async function readFetch(path: string, options: RequestInit = {}): Promise<Response> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(path, {...options, cache:'no-store', signal:AbortSignal.timeout(15000)});
      if (![502,503,504].includes(response.status) || attempt === 2) return response;
    } catch {
      if (attempt === 2) throw new Error('Reconnecting to WABuddy… Your last loaded data is retained.');
    }
    await new Promise(resolve=>setTimeout(resolve, 400 * (attempt + 1)));
  }
  throw new Error('Reconnecting to WABuddy…');
}
