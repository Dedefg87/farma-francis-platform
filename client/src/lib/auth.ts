export const hasSession = () =>
  typeof document !== "undefined" &&
  (!!localStorage.getItem("authToken") || document.cookie.includes("session="));
