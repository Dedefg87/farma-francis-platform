export const hasSession = () =>
  typeof document !== "undefined" &&
  document.cookie.includes("session=");
