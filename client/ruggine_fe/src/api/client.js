const BASE_URL = '/api';

const jsonFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || 'Request failed');
  }

  // Se la risposta è vuota (204), evita JSON.parse
  if (res.status === 204) return null;

  return res.json();
};

const API = {
  logIn: (credentials) =>
    jsonFetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  getUserInfo: () =>
    jsonFetch(`${BASE_URL}/sessions`),

  logOut: () =>
    jsonFetch(`${BASE_URL}/sessions`, { method: 'DELETE' }),

  getGroups: () =>
    jsonFetch(`${BASE_URL}/chats`),

  createGroup: (name) =>
    jsonFetch(`${BASE_URL}/chats`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  
  createPrivateChat: (username) =>
    jsonFetch(`${BASE_URL}/chats/private`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  searchUsers: (query) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    params.append('limit', 10);
    return jsonFetch(`${BASE_URL}/users?${params.toString()}`);
  },

  getRequests: () =>
    jsonFetch(`${BASE_URL}/requests`),

  createRequest: (groupId, username) =>
    jsonFetch(`${BASE_URL}/chats/${groupId}/requests`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  patchRequest: (id, status) =>
    jsonFetch(`${BASE_URL}/requests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
};

export default API;
