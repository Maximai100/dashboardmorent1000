import { DIRECTUS_URL, DIRECTUS_TOKEN } from '../config';

const WEB_VIEWABLE_EXTENSIONS = new Set([
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'txt',
    'bmp',
]);

const extractExtension = (fileName: string | null | undefined): string | null => {
    if (!fileName) return null;
    const normalized = fileName.split('?')[0].trim();
    const lastDot = normalized.lastIndexOf('.');
    if (lastDot === -1) return null;
    return normalized.slice(lastDot + 1).toLowerCase();
};

export const isWebViewable = (fileName: string | null | undefined): boolean => {
    const ext = extractExtension(fileName);
    if (!ext) return false;
    return WEB_VIEWABLE_EXTENSIONS.has(ext);
};

export const buildDirectusAssetUrl = (fileId: string, options: { forceDownload?: boolean } = {}): string => {
    const params: string[] = [];
    if (DIRECTUS_TOKEN) {
        params.push(`access_token=${DIRECTUS_TOKEN}`);
    }
    if (options.forceDownload) {
        params.push('download');
    }
    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return `${DIRECTUS_URL}/assets/${fileId}${query}`;
};
