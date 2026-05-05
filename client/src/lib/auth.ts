export const hasSession = () =>
  typeof document !== "undefined" &&
  (!!localStorage.getItem("jti") || document.cookie.includes("session="));
