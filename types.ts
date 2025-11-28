export interface ThemeFrontmatter {
  title: string;
  author?: string;
  homepage?: string;
  download?: string;
  thumbnail?: string;
  description?: string;
  category?: string;
}

export interface RepoStats {
  stars: number;
  lastCommitAt: string; // Changed from updatedAt to be more specific
  license?: string;
  openIssues?: number;
  description?: string;
  
  // Status flags
  error?: boolean;       // Generic error flag
  isRateLimit?: boolean; // Specific flag for 403/429
  isNotFound?: boolean;  // Specific flag for 404
}

export interface ThemeItem extends ThemeFrontmatter {
  id: string; // usually filename
  fileName: string;
  repoOwner?: string;
  repoName?: string;
  stats?: RepoStats;
  loadingStats?: boolean;
}

export enum SortOption {
  STARS = 'stars',
  UPDATED = 'updated',
  NAME = 'name',
}

export interface GitHubContentFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}