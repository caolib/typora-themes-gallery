import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ThemeItem, SortOption } from './types';
import { fetchThemeList, fetchThemeDetails, fetchRepoStats } from './services/githubService';
import { ThemeCard } from './components/ThemeCard';
import { Controls } from './components/Controls';
import { Github, Code2, Search, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const BATCH_SIZE = 5;
const DELAY_MS = 1000; // Delay between batches to be nice to API
const CACHE_KEY = 'typora_theme_explorer_cache';
const ITEMS_PER_PAGE = 15; // Number of items to load per scroll

export default function App() {
  // Initialize state from local storage if available
  const [themes, setThemes] = useState<ThemeItem[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn("Failed to load cache", e);
      return [];
    }
  });

  // Only show initial loading state if we have no cached themes
  const [loadingInitial, setLoadingInitial] = useState(themes.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.STARS);
  const [rateLimitExceeded, setRateLimitExceeded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  
  // Initialize token from local storage
  const [apiToken, setApiToken] = useState<string>(() => {
    return localStorage.getItem('github_token') || '';
  });

  // Save token to local storage when it changes
  useEffect(() => {
    if (apiToken) {
      localStorage.setItem('github_token', apiToken);
    } else {
      localStorage.removeItem('github_token');
    }
    // If token changes, we reset rate limit warning
    setRateLimitExceeded(false);
  }, [apiToken]);

  // Save themes to cache whenever they change
  useEffect(() => {
    if (themes.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(themes));
    }
  }, [themes]);

  // Core fetch logic for getting the list and parsing MD files
  const loadData = useCallback(async (force = false) => {
    if (!force && themes.length > 0) return;

    setLoadingInitial(true);
    setFetchError(null);
    try {
      const files = await fetchThemeList(apiToken);
      
      // Fetch raw content in parallel with resilience
      const themePromises = files.map(file => 
        fetchThemeDetails(file).catch(err => {
          console.warn(`Failed to load details for ${file.name}`, err);
          return null;
        })
      );
      
      const results = await Promise.all(themePromises);
      const initialThemes = results.filter((t): t is ThemeItem => t !== null);
      
      if (initialThemes.length === 0 && files.length > 0) {
         throw new Error("Failed to load details for any themes.");
      }

      // Mark all as loading stats initially, preserve existing stats if we are refreshing
      const themesWithLoadState = initialThemes.map(t => ({ ...t, loadingStats: true }));
      setThemes(themesWithLoadState);
      setVisibleCount(ITEMS_PER_PAGE); // Reset pagination on full reload
    } catch (error: any) {
      console.error("Failed to load themes", error);
      setFetchError(error.message || "Failed to load themes. Check your connection or API limit.");
    } finally {
      setLoadingInitial(false);
    }
  }, [apiToken, themes.length]);

  // 1. Initial Load
  useEffect(() => {
    // If we have no themes (cache empty), load data
    if (themes.length === 0) {
      loadData();
    }
  }, [loadData, themes.length]);

  // Full Refresh Handler (Reloads list + stats)
  const handleFullRefresh = () => {
    loadData(true);
  };

  // Stats Only Refresh (Keeps list, reloads stats)
  const handleStatsRefresh = () => {
    setThemes(prev => prev.map(t => ({
      ...t,
      loadingStats: true,
      stats: t.stats ? { ...t.stats, error: false } : undefined // clear errors to retry
    })));
  };

  // Single Theme Refresh
  const refreshSingleTheme = async (id: string) => {
    const themeIndex = themes.findIndex(t => t.id === id);
    if (themeIndex === -1) return;

    const theme = themes[themeIndex];
    if (!theme.repoOwner || !theme.repoName) return;

    // Set loading state
    setThemes(prev => prev.map(t => t.id === id ? { ...t, loadingStats: true } : t));

    try {
      const stats = await fetchRepoStats(theme.repoOwner, theme.repoName, apiToken);
      if (stats.isRateLimit) setRateLimitExceeded(true);
      
      setThemes(prev => prev.map(t => t.id === id ? { ...t, stats, loadingStats: false } : t));
    } catch (error) {
      setThemes(prev => prev.map(t => t.id === id ? { 
        ...t, 
        loadingStats: false,
        stats: { ...t.stats!, error: true } 
      } : t));
    }
  };

  // 2. Background Process: Fetch Stats Queue
  useEffect(() => {
    if (loadingInitial || themes.length === 0) return;

    // Filter themes that need updates:
    // 1. loadingStats is true (initial load or manual refresh)
    // 2. OR stats.isRateLimit is true AND we have a token (user provided token to fix error)
    // NOTE: We do NOT retry if isNotFound is true.
    const themesToUpdate = themes.filter(t => 
      t.repoOwner && t.repoName && (t.loadingStats || (t.stats?.isRateLimit && apiToken))
    );
    
    if (themesToUpdate.length === 0) return;

    let isMounted = true;
    const controller = new AbortController();

    const processBatch = async () => {
       // Take a small batch
       const batch = themesToUpdate.slice(0, BATCH_SIZE);
       
       const updates = await Promise.all(batch.map(async (theme) => {
         if (!theme.repoOwner || !theme.repoName) {
            return { id: theme.id, stats: undefined, loadingStats: false };
         }
         // Pass the API token
         const stats = await fetchRepoStats(theme.repoOwner, theme.repoName, apiToken);
         
         if (stats.isRateLimit) setRateLimitExceeded(true);
         
         return { id: theme.id, stats, loadingStats: false };
       }));

       if (!isMounted) return;

       // Update state
       setThemes(prev => prev.map(t => {
         const update = updates.find(u => u.id === t.id);
         return update ? { ...t, ...update } : t;
       }));
    };

    const timeoutId = setTimeout(processBatch, DELAY_MS);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [themes, loadingInitial, apiToken]);


  // 3. Filtering & Sorting Logic
  const processedThemes = useMemo(() => {
    let result = [...themes];

    // Filter - Safe checks to prevent crash
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.title || '').toLowerCase().includes(lowerTerm) || 
        (t.author || '').toLowerCase().includes(lowerTerm) ||
        (t.description || '').toLowerCase().includes(lowerTerm)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case SortOption.STARS:
          // Treat undefined stars as -1 so they go to bottom
          return (b.stats?.stars || 0) - (a.stats?.stars || 0);
        case SortOption.UPDATED:
           // Sort by lastCommitAt (pushed_at)
           const dateA = a.stats?.lastCommitAt ? new Date(a.stats.lastCommitAt).getTime() : 0;
           const dateB = b.stats?.lastCommitAt ? new Date(b.stats.lastCommitAt).getTime() : 0;
           return dateB - dateA;
        case SortOption.NAME:
          return (a.title || '').localeCompare(b.title || '');
        default:
          return 0;
      }
    });

    return result;
  }, [themes, searchTerm, sortOption]);

  // 4. Infinite Scroll Logic
  const visibleThemes = useMemo(() => {
    return processedThemes.slice(0, visibleCount);
  }, [processedThemes, visibleCount]);

  // Reset page when search or sort changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, sortOption]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingInitial && visibleCount < processedThemes.length) {
           setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, processedThemes.length));
        }
      },
      { rootMargin: '100px' } // Load slightly before reaching bottom
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadingInitial, visibleCount, processedThemes.length]);


  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 pt-8 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
                Typora Theme <span className="text-brand-600">Explorer</span>
              </h1>
              <p className="text-gray-500 max-w-2xl text-lg">
                Discover beautiful themes for Typora. Sorted by community stars and recency.
              </p>
            </div>
            <a 
              href="https://github.com/typora/theme.typora.io" 
              target="_blank" 
              rel="noreferrer"
              className="hidden sm:flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors"
            >
              <Github size={24} />
            </a>
          </div>
        </div>
      </header>

      {/* Controls (Sticky) */}
      <Controls 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOption={sortOption}
        setSortOption={setSortOption}
        totalThemes={processedThemes.length}
        loading={loadingInitial}
        rateLimitExceeded={rateLimitExceeded}
        apiToken={apiToken}
        setApiToken={setApiToken}
        onRefreshFull={handleFullRefresh}
        onRefreshStats={handleStatsRefresh}
      />

      {/* Main Grid */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loadingInitial ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl h-80 shadow-sm border border-gray-100"></div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Unable to load themes</h3>
            <p className="text-gray-500 mt-2 max-w-md mx-auto px-4">{fetchError}</p>
            
            <div className="mt-8 flex flex-col items-center gap-4">
              {!apiToken && (
                <div className="text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-lg border border-blue-100 max-w-sm">
                  <p className="font-semibold text-blue-800 mb-1">Tip: API Limit Reached?</p>
                  GitHub limits unauthenticated requests. Click the key icon <span className="inline-block align-middle"><Code2 size={12} /></span> in the toolbar above to add a token.
                </div>
              )}
              
              <button 
                onClick={handleFullRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md shadow hover:bg-brand-700 transition-colors"
              >
                <RefreshCw size={18} />
                Retry
              </button>
            </div>
          </div>
        ) : (
          <>
            {visibleThemes.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {visibleThemes.map(theme => (
                    <ThemeCard 
                      key={theme.id} 
                      theme={theme} 
                      onRefresh={refreshSingleTheme}
                    />
                  ))}
                </div>
                {/* Infinite Scroll Sentinel */}
                <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-8">
                   {visibleCount < processedThemes.length && (
                      <Loader2 className="animate-spin text-brand-500" />
                   )}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No themes found</h3>
                <p className="text-gray-500 mt-2">Try adjusting your search terms.</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <Code2 size={16} />
            <span>Built with React & Tailwind</span>
          </div>
          <p>
            Data sourced from <a href="https://theme.typora.io/" className="text-brand-600 hover:underline">theme.typora.io</a>
          </p>
        </div>
      </footer>
    </div>
  );
}