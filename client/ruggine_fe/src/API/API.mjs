const SERVER_URL = "http://127.0.0.1:3000"; // porta del backend Rust

const logIn = async (credentials) => {
  const res = await fetch(`/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(credentials),
  });
  console.log(res);
  if (res.ok) return await res.json();
  throw await res.text();
};

const getUserInfo = async () => {
  const res = await fetch(`/api/sessions`, {
    credentials: 'include',
  });

  if (res.ok) return await res.json();
  throw await res.text();
};

const logOut = async () => {
  const res = await fetch(`/api/sessions`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (res.ok) return;
  throw await res.text();
};

const getGroups = async () => {
  const res = await fetch(`/api/groups`, {
    credentials: 'include',
  });

  if (res.ok) return await res.json();
  throw await res.text();
};

const createGroup = async (name, invitees) => {
  const res = await fetch(`/api/groups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      name,
      invitees
    })
  });

  if (res.ok) return await res.json();
  throw await res.text();
};

const searchUsers = async (query) => {
  const params = new URLSearchParams();
  if (query) params.append("query", query);
  params.append("limit", 10);

  const res = await fetch(`/api/users?${params.toString()}`, {
    credentials: 'include'
  });

  if (res.ok) return await res.json();
  throw await res.text();
};
const getRequests = async () => {
  const res = await fetch(`/api/requests`, {
    credentials: 'include'
  });
  if (res.ok) return await res.json();
  throw await res.text();
};

const patchRequest = async (id, status) => {
  const res = await fetch(`/api/requests/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ status })
  });

  if (!res.ok) throw await res.text();
};

const API = {
  logIn, 
  logOut,
  getUserInfo,
  getGroups,
  createGroup,
  searchUsers, 
  getRequests,
  patchRequest    
};
export default API;
