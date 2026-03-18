const normalizeBasePath = (value?: string): string => {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === '/') {
    return '/';
  }

  return `/${trimmed.replace(/^\/+|\/+$/g, '')}`;
};

export const PARENT_APP_BASE_PATH = normalizeBasePath(
  import.meta.env.VITE_PARENT_APP_BASE_PATH,
);

export const PARENT_APP_BASENAME =
  PARENT_APP_BASE_PATH === '/' ? undefined : PARENT_APP_BASE_PATH;

export const getAssetPath = (assetPath: string): string => {
  const cleanPath = assetPath.replace(/^\/+/, '');
  const baseUrl = import.meta.env.BASE_URL || '/';
  return `${baseUrl}${cleanPath}`;
};
