import { ThemeItem, RepoStats, GitHubContentFile, ThemeFrontmatter, ThemeGroup } from '../types';

const TYPORA_REPO_API = 'https://api.github.com/repos/typora/theme.typora.io/contents/_posts/theme?ref=gh-pages';
const THUMBNAIL_BASE_URL = 'https://raw.githubusercontent.com/typora/theme.typora.io/gh-pages/media/thumbnails/';
const FRONTMATTER_REGEX = /^---\n([\s\S]*?)\n---/;

/**
 * Validates if the static data is stale (optionally used later)
 */
export const fetchThemesFromStatic = async (): Promise<ThemeGroup[]> => {
  try {
    // Add timestamp to bypass cache
    const response = await fetch(`/themes.json?t=${Date.now()}`);
    if (!response.ok) {
      throw new Error('Failed to load static themes data');
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Static fetch failed, falling back to API is possible but not implemented fully here.", error);
    throw error;
  }
};

/**
 * Extracts key-value pairs from YAML-like frontmatter string
 */
const parseFrontmatter = (text: string): ThemeFrontmatter => {
  const match = text.match(FRONTMATTER_REGEX);
  const data: any = {};

  if (match && match[1]) {
    const lines = match[1].split('\n');
    lines.forEach(line => {
      const parts = line.split(':');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        let value = parts.slice(1).join(':').trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        data[key] = value;
      }
    });
  }
  return data as ThemeFrontmatter;
};

/**
 * Extracts owner and repo name from a GitHub URL
 */
export const getRepoInfoFromUrl = (url?: string): { owner: string; repo: string } | null => {
  if (!url) return null;
  try {
    let cleanUrl = url.trim();
    if (cleanUrl.endsWith('.git')) cleanUrl = cleanUrl.slice(0, -4);
    if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

    const urlObj = new URL(cleanUrl);
    if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') return null;

    const segments = urlObj.pathname.split('/').filter(Boolean);
    if (segments.length >= 2) {
      return { owner: segments[0], repo: segments[1] };
    }
  } catch (e) {
    return null;
  }
  return null;
};

/**
 * Fetches the list of Markdown files from the Typora theme repo
 */
export const fetchThemeList = async (token?: string): Promise<GitHubContentFile[]> => {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const url = `${TYPORA_REPO_API}&t=${Date.now()}`;
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      throw new Error('GitHub API rate limit exceeded. Please add an API token using the key icon.');
    }
    throw new Error(`Failed to fetch theme list: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.filter((f: any) => f.name.endsWith('.md')) : [];
};

/**
 * Fetches the raw content of a markdown file and parses it
 */
export const fetchThemeDetails = async (file: GitHubContentFile): Promise<ThemeItem> => {
  const response = await fetch(file.download_url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file content for ${file.name}`);
  }
  const text = await response.text();
  const frontmatter = parseFrontmatter(text);

  const repoInfo = getRepoInfoFromUrl(frontmatter.homepage);

  let thumbnail = frontmatter.thumbnail;
  if (thumbnail && !thumbnail.startsWith('http')) {
    const cleanThumbnail = thumbnail.startsWith('/') ? thumbnail.slice(1) : thumbnail;
    thumbnail = `${THUMBNAIL_BASE_URL}${cleanThumbnail}`;
  }

  return {
    ...frontmatter,
    id: file.name,
    fileName: file.name,
    title: frontmatter.title || file.name.replace(/\.md$/i, ''),
    thumbnail,
    repoOwner: repoInfo?.owner,
    repoName: repoInfo?.repo,
  };
};

/**
 * Fetches live stats for a specific repository
 */
export const fetchRepoStats = async (owner: string, repo: string, token?: string): Promise<RepoStats> => {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}?t=${Date.now()}`, { headers });

    if (response.status === 403 || response.status === 429) {
      return { stars: 0, lastCommitAt: '', error: true, isRateLimit: true };
    }

    if (response.status === 404) {
      return { stars: 0, lastCommitAt: '', isNotFound: true, error: false };
    }

    if (!response.ok) {
      return { stars: 0, lastCommitAt: '', error: true };
    }

    const data = await response.json();
    return {
      stars: data.stargazers_count,
      lastCommitAt: data.pushed_at || data.updated_at,
      license: data.license?.spdx_id || data.license?.name,
      openIssues: data.open_issues_count,
      description: data.description,
      error: false
    };
  } catch (error) {
    return { stars: 0, lastCommitAt: '', error: true };
  }
};
