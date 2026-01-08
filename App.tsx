import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeItem, ThemeGroup, SortOption } from './types';
import { fetchThemesFromStatic } from './services/githubService';
import { ThemeCard } from './components/ThemeCard';
import { Controls } from './components/Controls';
import { ThemeDetail } from './components/ThemeDetail';
import { Github, Search, AlertCircle, RefreshCw, Loader2, Moon, Sun, Monitor, ArrowUp, Languages, ChevronDown } from 'lucide-react';
import { translations, Language } from './utils/i18n';

const BATCH_SIZE = 5;
const DELAY_MS = 1000; // Delay between batches to be nice to API
const CACHE_KEY = 'typora_theme_explorer_cache_v2'; // Changed cache key for new structure
const ITEMS_PER_PAGE = 15; // Number of items to load per scroll

type ThemeMode = 'light' | 'dark' | 'system';

// The main gallery content component
const Gallery = () => {
  // Initialize state from local storage if available
  const [themeGroups, setThemeGroups] = useState<ThemeGroup[]>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      console.warn("Failed to load cache", e);
      return [];
    }
  });

  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'system';
  });

  // Language State
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'zh';
  });

  const t = translations[lang];

  // Language menu state & outside-click handler
  const [showLangMenu, setShowLangMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Apply Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    localStorage.setItem('theme_mode', themeMode);
  }, [themeMode]);

  // Persist Language
  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
  };


  // Pin State
  const [pinnedGroups, setPinnedGroups] = useState<string[]>(() => {
    try {
      const cached = localStorage.getItem('pinned_groups');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Save pinned groups
  useEffect(() => {
    localStorage.setItem('pinned_groups', JSON.stringify(pinnedGroups));
  }, [pinnedGroups]);

  const togglePin = (groupId: string) => {
    setPinnedGroups(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      } else {
        return [...prev, groupId];
      }
    });
  };

  // Only show initial loading state if we have no cached themes
  const [loadingInitial, setLoadingInitial] = useState(themeGroups.length === 0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.STARS);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);



  // Save themes to cache whenever they change
  useEffect(() => {
    if (themeGroups.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(themeGroups));
    }
  }, [themeGroups]);

  // Back to Top Scroll Listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowBackToTop(true);
      } else {
        setShowBackToTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Helper to group themes
  const groupThemes = (themes: ThemeItem[]): ThemeGroup[] => {
    const groups: { [key: string]: ThemeGroup } = {};

    themes.forEach(theme => {
      const repoOwner = theme.repoOwner || 'unknown';
      const repoName = theme.repoName || 'unknown';
      const groupId = `${repoOwner}/${repoName}`;

      if (!groups[groupId]) {
        groups[groupId] = {
          id: groupId,
          repoOwner,
          repoName,
          themes: [],
          loadingStats: true // Default to loading stats
        };
      }
      groups[groupId].themes.push(theme);
    });

    return Object.values(groups);
  };


  // Track themeGroups with a ref for use in useCallback without creating loops
  const themeGroupsRef = useRef(themeGroups);
  useEffect(() => {
    themeGroupsRef.current = themeGroups;
  }, [themeGroups]);

  // Core fetch logic using pre-built static JSON
  const loadData = useCallback(async (force = false) => {
    if (!force && themeGroupsRef.current.length > 0) return;

    if (themeGroupsRef.current.length === 0) {
      setLoadingInitial(true);
    }
    setFetchError(null);
    try {
      // Try to fetch static JSON first (fast, no rate limit)
      const groups = await fetchThemesFromStatic();

      setThemeGroups(groups);
      setVisibleCount(ITEMS_PER_PAGE); // Reset pagination on full reload
    } catch (error: any) {
      console.error("Failed to load themes", error);
      setFetchError(error.message || "Failed to load themes.");
    } finally {
      setLoadingInitial(false);
    }
  }, []); // No dependencies, safe to use in initial load effect

  // 1. Initial Load
  useEffect(() => {
    // Only load automatically if we have NO cached data
    if (themeGroups.length === 0) {
      loadData();
    }
  }, [loadData, themeGroups.length]);

  // If loading while we already have data, it means it's a manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Wrap loadData to track isRefreshing
  const handleFullRefresh = async () => {
    setIsRefreshing(true);
    await loadData(true);
    setIsRefreshing(false);
  };


  // 3. Filtering & Sorting Logic
  const processedGroups = useMemo(() => {
    let result = [...themeGroups];

    // Filter - Check if ANY theme in the group matches
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.map(g => {
        // Find the first theme that matches
        const matchedTheme = g.themes.find(t =>
          (t.title || '').toLowerCase().includes(lowerTerm) ||
          (t.author || '').toLowerCase().includes(lowerTerm) ||
          (t.description || '').toLowerCase().includes(lowerTerm)
        );

        // If found, return group with matchedThemeId
        if (matchedTheme) {
          return { ...g, matchedThemeId: matchedTheme.id };
        }
        return null;
      }).filter((g): g is ThemeGroup => g !== null);
    }

    // Sort
    result.sort((a, b) => {
      // If NOT searching, prioritize pinned items
      if (!searchTerm) {
        const isPinnedA = pinnedGroups.includes(a.id);
        const isPinnedB = pinnedGroups.includes(b.id);
        if (isPinnedA && !isPinnedB) return -1;
        if (!isPinnedA && isPinnedB) return 1;
      }

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
          // Sort by the title of the first theme in the group
          const titleA = a.themes[0]?.title || '';
          const titleB = b.themes[0]?.title || '';
          return titleA.localeCompare(titleB);
        default:
          return 0;
      }
    });

    return result;
  }, [themeGroups, searchTerm, sortOption, pinnedGroups]);

  // 4. Infinite Scroll Logic
  const visibleGroups = useMemo(() => {
    return processedGroups.slice(0, visibleCount);
  }, [processedGroups, visibleCount]);

  // Reset page when search or sort changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, sortOption]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingInitial && visibleCount < processedGroups.length) {
          setVisibleCount(prev => Math.min(prev + ITEMS_PER_PAGE, processedGroups.length));
        }
      },
      { rootMargin: '100px' } // Load slightly before reaching bottom
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [loadingInitial, visibleCount, processedGroups.length]);


  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pt-6 pb-4 transition-colors duration-300">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                {t.title.split(' ')[0]} <span className="text-brand-600 dark:text-brand-400">{t.title.split(' ').slice(1).join(' ')}</span>
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Theme Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`p-2 rounded-md transition-all ${themeMode === 'light' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  title="Light Mode"
                >
                  <Sun size={18} />
                </button>
                <button
                  onClick={() => setThemeMode('system')}
                  className={`p-2 rounded-md transition-all ${themeMode === 'system' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  title="System Mode"
                >
                  <Monitor size={18} />
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`p-2 rounded-md transition-all ${themeMode === 'dark' ? 'bg-white dark:bg-gray-600 shadow text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  title="Dark Mode"
                >
                  <Moon size={18} />
                </button>
              </div>

              {/* Language Menu */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2"
                  title="Language"
                >
                  <Languages size={20} />
                  <span className="sr-only">{lang === 'en' ? 'ZH' : 'EN'}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>

                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button
                      onClick={() => { setLang('en'); setShowLangMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                    >
                      English
                    </button>
                    <button
                      onClick={() => { setLang('zh'); setShowLangMenu(false); }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm text-gray-700 dark:text-gray-200"
                    >
                      简体中文
                    </button>
                  </div>
                )}
              </div>

              <a
                href="https://github.com/caolib/typora-themes-gallery"
                target="_blank"
                rel="noreferrer"
                className="hidden sm:flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <Github size={24} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Controls (Sticky) */}
      <Controls
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        sortOption={sortOption}
        setSortOption={setSortOption}
        totalThemes={processedGroups.length}
        t={t}
        onRefresh={handleFullRefresh}
        refreshing={isRefreshing}
      />

      {/* Main Grid */}
      <main className="flex-grow max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {loadingInitial ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-xl h-80 shadow-sm border border-gray-100 dark:border-gray-700"></div>
            ))}
          </div>
        ) : fetchError ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-2xl mx-auto">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 mb-4">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.loadError}</h3>
            <p className="text-gray-500 dark:text-gray-400 mt-2 max-w-md mx-auto px-4">{fetchError}</p>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                onClick={handleFullRefresh}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-md shadow hover:bg-brand-700 transition-colors"
              >
                <RefreshCw size={18} />
                {t.retry}
              </button>
            </div>
          </div>
        ) : (
          <>
            {visibleGroups.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                  {visibleGroups.map(group => (
                    <ThemeCard
                      key={group.id}
                      group={group}
                      isPinned={pinnedGroups.includes(group.id)}
                      onTogglePin={() => togglePin(group.id)}
                      t={t}
                    />
                  ))}
                </div>
                {/* Infinite Scroll Sentinel */}
                <div ref={loadMoreRef} className="h-20 w-full flex items-center justify-center mt-8">
                  {visibleCount < processedGroups.length && (
                    <Loader2 className="animate-spin text-brand-500" />
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t.noThemes}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t.noThemesDesc}</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 mt-auto transition-colors duration-300">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2 mb-4 sm:mb-0">
            <p>{t.footerDisclaimer}</p>
          </div>
          <p>
            {t.dataSourced} <a href="https://theme.typora.io/" className="text-brand-600 dark:text-brand-400 hover:underline">theme.typora.io</a>
          </p>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 bg-brand-600 text-white rounded-full shadow-lg hover:bg-brand-700 transition-all z-50 animate-fade-in"
          title="Back to Top"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Gallery />} />
      <Route path="/theme/:id" element={<ThemeDetail />} />
    </Routes>
  );
}