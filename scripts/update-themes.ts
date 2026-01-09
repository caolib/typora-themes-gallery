
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// --- Types ---
interface ThemeFrontmatter {
    title: string;
    author?: string;
    homepage?: string;
    download?: string;
    thumbnail?: string;
    description?: string;
    category?: string;
}

interface RepoStats {
    stars: number;
    lastCommitAt: string;
    license?: string;
    openIssues?: number;
    description?: string;
    error?: boolean;
    isRateLimit?: boolean;
    isNotFound?: boolean;
}

interface ThemeItem extends ThemeFrontmatter {
    id: string;
    fileName: string;
    repoOwner?: string;
    repoName?: string;
}

interface ThemeGroup {
    id: string; // repoOwner/repoName
    repoOwner: string;
    repoName: string;
    themes: ThemeItem[];
    stats?: RepoStats;
    loadingStats?: boolean;
}

interface GitHubContentFile {
    name: string;
    download_url: string;
}

// --- Constants ---
const TYPORA_REPO_API = 'https://api.github.com/repos/typora/theme.typora.io/contents/_posts/theme?ref=gh-pages';
const THUMBNAIL_BASE_URL = 'https://raw.githubusercontent.com/typora/theme.typora.io/gh-pages/media/thumbnails/';
const OUTPUT_PATH = path.join(process.cwd(), 'public/themes.json');

// --- Helper Functions ---

const fetchJson = <T>(url: string, token?: string): Promise<T> => {
    return new Promise((resolve, reject) => {
        const headers: any = {
            'User-Agent': 'Typora-Theme-Gallery-Builder',
            'Accept': 'application/vnd.github.v3+json'
        };
        if (token) {
            headers['Authorization'] = `token ${token}`;
        }

        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    reject(new Error(`Status Code: ${res.statusCode} for ${url}`));
                } else {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(new Error(`Failed to parse JSON for ${url}: ${e}`));
                    }
                }
            });
        }).on('error', err => reject(err));
    });
};

const fetchText = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode && (res.statusCode < 200 || res.statusCode >= 300)) {
                    reject(new Error(`Status Code: ${res.statusCode} for ${url}`));
                } else {
                    resolve(data);
                }
            });
        }).on('error', err => reject(err));
    });
};

const fetchGraphQL = async (query: string, token: string) => {
    const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `bearer ${token}`,
            'User-Agent': 'Typora-Theme-Gallery-Builder'
        },
        body: JSON.stringify({ query })
    });

    if (!response.ok) {
        throw new Error(`GraphQL Error: ${response.status} ${response.statusText}`);
    }
    return response.json();
};

const parseFrontmatter = (text: string): ThemeFrontmatter => {
    const lines = text.split(/\r?\n/);
    const data: any = {};

    // Check if it starts with frontmatter delimiter
    if (lines[0].trim() !== '---') return data;

    let i = 1;
    while (i < lines.length && lines[i].trim() !== '---') {
        const line = lines[i];
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.slice(0, colonIndex).trim();
            let value = line.slice(colonIndex + 1).trim();

            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }

            // Basic unescape for YAML-like strings (just : and common chars)
            // If it's a number, it will still be a string here which is fine
            data[key] = value;
        }
        i++;
    }
    return data as ThemeFrontmatter;
};

const getRepoInfoFromUrl = (url?: string): { owner: string; repo: string } | null => {
    if (!url) return null;
    try {
        let cleanUrl = url.trim();
        if (cleanUrl.endsWith('.git')) cleanUrl = cleanUrl.slice(0, -4);
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

        const urlObj = new URL(cleanUrl);
        if (urlObj.hostname !== 'github.com' && urlObj.hostname !== 'www.github.com') return null;

        const segments = urlObj.pathname.split('/').filter(Boolean);
        // Handle cases like github.com/owner/repo/releases/tag/v1
        if (segments.length >= 2) {
            return { owner: segments[0], repo: segments[1] };
        }
    } catch (e) {
        return null;
    }
    return null;
};

// --- Main Script ---

async function main() {
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
        console.error("Error: GITHUB_TOKEN is required for GraphQL fetching.");
        process.exit(1);
    }

    console.log("Using GITHUB_TOKEN for GraphQL.");

    console.log("Fetching theme list...");
    let files: GitHubContentFile[] = [];
    try {
        // REST is fine for this single call
        files = await fetchJson<GitHubContentFile[]>(TYPORA_REPO_API, token);
        files = files.filter(f => f.name.endsWith('.md'));
        console.log(`Found ${files.length} theme files.`);
    } catch (e) {
        console.error("Failed to fetch theme list:", e);
        process.exit(1);
    }

    console.log("Fetching theme details...");
    const themes: ThemeItem[] = [];
    const validFiles = files.slice(0);

    // Parallel fetch for frontmatter is fine as it hits raw.githubusercontent (no API limit usually)
    const CHUNK_SIZE = 15;
    for (let i = 0; i < validFiles.length; i += CHUNK_SIZE) {
        const chunk = validFiles.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(async (file) => {
            try {
                const text = await fetchText(file.download_url);
                const frontmatter = parseFrontmatter(text);

                // Fallback repo info check: try download URL if homepage fails
                let repoInfo = getRepoInfoFromUrl(frontmatter.homepage);
                if (!repoInfo) {
                    repoInfo = getRepoInfoFromUrl(frontmatter.download);
                }

                let thumbnail = frontmatter.thumbnail;
                if (thumbnail && !thumbnail.startsWith('http')) {
                    const cleanThumbnail = thumbnail.startsWith('/') ? thumbnail.slice(1) : thumbnail;
                    thumbnail = `${THUMBNAIL_BASE_URL}${cleanThumbnail}`;
                }

                // Clean title: remove date prefix (e.g., 2024-03-19-keepstyle -> keepstyle)
                let title = frontmatter.title;
                if (!title) {
                    title = file.name.replace(/\.md$/i, '').replace(/^\d{4}-\d{1,2}-\d{1,2}-/, '');
                }

                themes.push({
                    ...frontmatter,
                    id: file.name,
                    fileName: file.name,
                    title: title,
                    thumbnail,
                    repoOwner: repoInfo?.owner,
                    repoName: repoInfo?.repo,
                });
            } catch (e) {
                console.error(`Error processing ${file.name}:`, e);
            }
        }));
    }

    console.log(`Parsed ${themes.length} themes. Grouping by repo or author...`);

    const groups: { [key: string]: ThemeGroup } = {};
    themes.forEach(theme => {
        let groupId = '';
        let owner = theme.repoOwner;
        let name = theme.repoName;

        if (owner && name) {
            // Group 1: By GitHub Repository (Best for stats)
            groupId = `${owner}/${name}`;
        } else if (theme.author) {
            // Group 2: By Author (For non-GitHub or broken links)
            owner = theme.author;
            name = theme.repoName || 'themes'; // Use 'themes' if no repo name
            groupId = `author/${theme.author}`;
        } else {
            // Group 3: Standalone (Unknown author and no GitHub info)
            owner = 'unknown';
            name = theme.title;
            groupId = `standalone/${theme.id}`;
        }

        if (!groups[groupId]) {
            groups[groupId] = {
                id: groupId,
                repoOwner: owner,
                repoName: name || 'unknown',
                themes: [],
                loadingStats: false,
            };
        }
        groups[groupId].themes.push(theme);
    });

    const groupList = Object.values(groups);

    // Only fetch GraphQL stats for real GitHub repo groups
    const validGroups = groupList.filter(g =>
        !g.id.startsWith('author/') &&
        !g.id.startsWith('standalone/') &&
        g.repoOwner !== 'unknown'
    );

    console.log(`Identified ${validGroups.length} unique repositories to fetch.`);

    // --- GraphQL Batch Fetching ---
    console.log("Fetching repository stats via GraphQL...");

    // Batch size for GraphQL aliases (limit node cost)
    const BATCH_SIZE = 50;

    for (let i = 0; i < validGroups.length; i += BATCH_SIZE) {
        const batch = validGroups.slice(i, i + BATCH_SIZE);

        // Construct Query
        // clean key: repo_owner_name (remove special chars)
        const queryParts = batch.map((g, idx) => {
            const alias = `repo${idx}`;
            return `${alias}: repository(owner: "${g.repoOwner}", name: "${g.repoName}") {
              stargazers { totalCount }
              pushedAt
              updatedAt
              description
              licenseInfo { spdxId name }
              issues(states: OPEN) { totalCount }
          }`;
        });

        const query = `query { ${queryParts.join('\n')} }`;

        try {
            const result = await fetchGraphQL(query, token);

            if (result.errors) {
                // GraphQL often returns partial data with errors
                console.warn("GraphQL Errors:", result.errors.map((e: any) => e.message).join(', '));
            }

            const data = result.data || {};

            batch.forEach((group, idx) => {
                const alias = `repo${idx}`;
                const repoData = data[alias];

                if (repoData) {
                    group.stats = {
                        stars: repoData.stargazers.totalCount,
                        lastCommitAt: repoData.pushedAt || repoData.updatedAt,
                        description: repoData.description,
                        license: repoData.licenseInfo?.spdxId || repoData.licenseInfo?.name,
                        openIssues: repoData.issues.totalCount,
                        error: false
                    };
                } else {
                    // Likely not found or renamed
                    group.stats = {
                        stars: 0,
                        lastCommitAt: '',
                        isNotFound: true,
                        error: false
                    };
                }
            });

        } catch (e) {
            console.error("Batch fetch failed:", e);
        }

        console.log(`Fetched stats for batch ${Math.min(i + BATCH_SIZE, validGroups.length)}/${validGroups.length}`);
    }

    // Map back to original list (include unknown repos if any)
    // groupList already references same objects so validGroups updates are reflected in groupList

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(groupList, null, 2));
    console.log(`\nSuccessfully wrote ${groupList.length} groups to ${OUTPUT_PATH}`);
}

main().catch(console.error);
