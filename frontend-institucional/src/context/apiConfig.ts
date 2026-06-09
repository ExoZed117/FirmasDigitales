export const getApiUrl = (): string => {
  return localStorage.getItem("blockcert_api_url") || import.meta.env.VITE_API_URL || "http://localhost:3001";
};
