/** Small fetch wrapper: sends the session cookie and turns API errors into Error objects. */
export async function api(path, { method = 'GET', json, body } = {}) {
  const options = { method, credentials: 'include', headers: {} };
  if (json !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(json);
  } else if (body) {
    options.body = body;
  }

  let res;
  try {
    res = await fetch(path, options);
  } catch {
    throw new Error("Can't reach the server — is it running?");
  }

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || 'Something went wrong');
    err.status = res.status;
    err.details = data.details;
    throw err;
  }
  return data;
}
