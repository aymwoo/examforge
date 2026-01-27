const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && String(envUrl).trim() && String(envUrl).trim() !== "/") {
    return String(envUrl).trim();
  }
  return "";
};

const isAbsoluteUrl = (value: string) => /^https?:\/\//i.test(value);

export const resolveAssetUrl = (path: string) => {
  if (!path) return path;
  if (path.startsWith("data:") || isAbsoluteUrl(path)) return path;

  const baseUrl = getBaseUrl();
  if (!baseUrl) {
    return path.startsWith("/") ? path : `/${path}`;
  }

  try {
    const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
    return new URL(path, normalizedBase).toString();
  } catch {
    return path.startsWith("/") ? path : `/${path}`;
  }
};
