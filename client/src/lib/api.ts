export const api = {
  async get(endpoint: string) {
    const res = await fetch(`/api${endpoint}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API Error');
    }
    return res.json();
  },
  async post(endpoint: string, body?: any) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'POST',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API Error');
    }
    return res.json();
  },
  async put(endpoint: string, body: any) {
    const res = await fetch(`/api${endpoint}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API Error');
    }
    return res.json();
  },
  async delete(endpoint: string) {
    const res = await fetch(`/api${endpoint}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'API Error');
    }
    return res.json();
  }
};
