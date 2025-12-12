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

const API = {
  logIn, 
  logOut,
  getUserInfo
};
export default API;
