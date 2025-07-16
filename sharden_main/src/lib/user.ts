export type UserInfo = { user: string; role: string };

const KEY = "sharden_user";

export function saveUser(u: UserInfo) {
  localStorage.setItem(KEY, JSON.stringify(u));
}

export function loadUser(): UserInfo {
  if (typeof window === "undefined")
    return { user: "anonymous", role: "guest" };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { user: "anonymous", role: "guest" };
    return JSON.parse(raw);
  } catch {
    return { user: "anonymous", role: "guest" };
  }
}
