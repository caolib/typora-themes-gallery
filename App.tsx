import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeItem, ThemeGroup, SortOption } from './types';
import { fetchThemesFromStatic } from './services/githubService';
import { ThemeCard } from './components/ThemeCard';
import { ThemeDetail } from './components/ThemeDetail';
import { Github, Search, AlertCircle, RefreshCw, Loader2, Moon, Sun, Monitor, ArrowUp, Languages, ChevronDown, X, SortAsc, SortDesc } from 'lucide-react';
import { translations, Language } from './utils/i18n';

const BATCH_SIZE = 5;
const DELAY_MS = 1000; // Delay between batches to be nice to API
const CACHE_KEY = 'typora_theme_explorer_cache_v2'; // Changed cache key for new structure
const ITEMS_PER_PAGE = 15; // Number of items to load per scroll

type ThemeMode = 'light' | 'dark' | 'system';

// The main gallery content component
interface GalleryProps {
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  lang: Language;
  setLang: (lang: Language) => void;
}

const Gallery: React.FC<GalleryProps> = ({ themeMode, setThemeMode, lang, setLang }) => {
  const t = translations[lang];

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

  // Language & Sort menu state
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (langMenuRef.current && !langMenuRef.current.contains(target)) {
        setShowLangMenu(false);
      }
      if (sortMenuRef.current && !sortMenuRef.current.contains(target)) {
        setShowSortMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Persisted filter states
  const [searchTerm, setSearchTerm] = useState(() => localStorage.getItem('gallery_search') || '');
  const [sortOption, setSortOption] = useState<SortOption>(() =>
    (localStorage.getItem('gallery_sort_option') as SortOption) || SortOption.STARS
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(() =>
    (localStorage.getItem('gallery_sort_order') as 'asc' | 'desc') || 'desc'
  );

  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Save filter states whenever they change
  useEffect(() => {
    localStorage.setItem('gallery_search', searchTerm);
    localStorage.setItem('gallery_sort_option', sortOption);
    localStorage.setItem('gallery_sort_order', sortOrder);
  }, [searchTerm, sortOption, sortOrder]);


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
      const groups = await fetchThemesFromStatic(force);

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

      let comparison = 0;
      switch (sortOption) {
        case SortOption.STARS:
          comparison = (a.stats?.stars || 0) - (b.stats?.stars || 0);
          break;
        case SortOption.UPDATED:
          const dateA = a.stats?.lastCommitAt ? new Date(a.stats.lastCommitAt).getTime() : 0;
          const dateB = b.stats?.lastCommitAt ? new Date(b.stats.lastCommitAt).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case SortOption.NAME:
          const titleA = a.themes[0]?.title || '';
          const titleB = b.themes[0]?.title || '';
          comparison = b.themes[0]?.title ? titleA.localeCompare(titleB) : comparison;
          break;
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return result;
  }, [themeGroups, searchTerm, sortOption, sortOrder, pinnedGroups]);

  // 4. Infinite Scroll Logic
  const visibleGroups = useMemo(() => {
    return processedGroups.slice(0, visibleCount);
  }, [processedGroups, visibleCount]);

  // Reset page size when search, sort option, or sort order changes
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [searchTerm, sortOption, sortOrder]);

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
      {/* Header (Sticky) */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 py-3 transition-colors duration-300">
        <div className="max-w-[125rem] mx-auto px-4 sm:px-8 lg:px-12">
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-4 xl:gap-8 items-center justify-between">
            {/* Logo / Title */}
            <div className="flex items-center justify-between w-full lg:w-auto flex-shrink-0">
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight flex-shrink-0 cursor-pointer" onClick={scrollToTop}>
                {t.title.split(' ')[0]} <span className="text-brand-600 dark:text-brand-400">{t.title.split(' ').slice(1).join(' ')}</span>
              </h1>

              {/* Mobile View Toggle/Menu could go here if needed, but keeping it simple for now */}
              <div className="flex lg:hidden items-center gap-2">
                <button
                  onClick={handleFullRefresh}
                  disabled={isRefreshing}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 transition-colors"
                >
                  <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
                <a href="https://github.com/caolib/typora-themes-gallery" target="_blank" rel="noreferrer" className="text-gray-500 dark:text-gray-400">
                  <Github size={20} />
                </a>
              </div>
            </div>

            {/* Middle: Search Box */}
            <div className="w-full lg:max-w-md xl:max-w-2xl flex-grow min-w-0">
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
                  <Search size={18} />
                </div>
                <input
                  type="text"
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-9 h-10 bg-gray-100 dark:bg-gray-900/50 border border-transparent focus:border-brand-500 dark:focus:border-brand-500 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-white dark:focus:bg-gray-800 transition-all text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Controls & Utilities */}
            <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
              {/* Sort & Order */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 rounded-lg p-0.5 border border-gray-200 dark:border-gray-700">
                <div className="relative" ref={sortMenuRef}>
                  <button
                    onClick={() => setShowSortMenu(!showSortMenu)}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  >
                    {sortOption === SortOption.STARS ? t.sortStars : sortOption === SortOption.UPDATED ? t.sortUpdated : t.sortName}
                    <ChevronDown size={12} className={`opacity-50 transition-transform duration-200 ${showSortMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {showSortMenu && (
                    <div className="absolute left-0 mt-2 w-36 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-in fade-in slide-in-from-top-1 duration-200">
                      <button
                        onClick={() => { setSortOption(SortOption.STARS); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs transition-colors ${sortOption === SortOption.STARS ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {t.sortStars}
                      </button>
                      <button
                        onClick={() => { setSortOption(SortOption.UPDATED); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs transition-colors ${sortOption === SortOption.UPDATED ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {t.sortUpdated}
                      </button>
                      <button
                        onClick={() => { setSortOption(SortOption.NAME); setShowSortMenu(false); }}
                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs transition-colors ${sortOption === SortOption.NAME ? 'text-brand-600 dark:text-brand-400 font-bold' : 'text-gray-700 dark:text-gray-200'}`}
                      >
                        {t.sortName}
                      </button>
                    </div>
                  )}
                </div>

                <div className="w-px h-3 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 text-gray-500 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                  title={sortOrder === 'asc' ? t.sortAsc : t.sortDesc}
                >
                  {sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />}
                </button>
              </div>

              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

              {/* Refresh */}
              <button
                onClick={handleFullRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all"
                title={t.refreshTooltip}
              >
                <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              </button>

              {/* Theme Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-900/50 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setThemeMode('light')}
                  className={`p-1.5 rounded-md transition-all ${themeMode === 'light' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  <Sun size={14} />
                </button>
                <button
                  onClick={() => setThemeMode('system')}
                  className={`p-1.5 rounded-md transition-all ${themeMode === 'system' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  <Monitor size={14} />
                </button>
                <button
                  onClick={() => setThemeMode('dark')}
                  className={`p-1.5 rounded-md transition-all ${themeMode === 'dark' ? 'bg-white dark:bg-gray-700 shadow-sm text-brand-600 dark:text-brand-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                >
                  <Moon size={14} />
                </button>
              </div>

              {/* Language */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors flex items-center gap-1"
                >
                  <Languages size={18} />
                  <ChevronDown size={12} className="opacity-50" />
                </button>

                {showLangMenu && (
                  <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    <button onClick={() => { setLang('en'); setShowLangMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">English</button>
                    <button onClick={() => { setLang('zh'); setShowLangMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-xs text-gray-700 dark:text-gray-200">简体中文</button>
                  </div>
                )}
              </div>

              <a href="https://github.com/caolib/typora-themes-gallery" target="_blank" rel="noreferrer" className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Status info (compact) */}
          <div className="hidden lg:flex justify-end mt-1 px-4 text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wider uppercase">
            {processedGroups.length} {t.themesCount}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-grow max-w-[125rem] mx-auto px-4 sm:px-8 lg:px-12 py-8 w-full">
        {loadingInitial ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6 animate-pulse">
            {[...Array(12)].map((_, i) => (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-6">
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
        <div className="max-w-[125rem] mx-auto px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500 dark:text-gray-400">
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
  // Theme State
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme_mode') as ThemeMode) || 'system';
  });

  // Language State
  const [lang, setLang] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'zh';
  });

  // Apply Theme Effect & Listen to System Changes
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      const systemDark = mediaQuery.matches;
      const isDark = themeMode === 'dark' || (themeMode === 'system' && systemDark);

      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for system theme changes
    const listener = () => {
      if (themeMode === 'system') {
        applyTheme();
      }
    };

    // Use addEventListener if available, fallback to addListener for older browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', listener);
    } else {
      mediaQuery.addListener(listener);
    }

    localStorage.setItem('theme_mode', themeMode);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', listener);
      } else {
        mediaQuery.removeListener(listener);
      }
    };
  }, [themeMode]);

  // Persist Language
  useEffect(() => {
    localStorage.setItem('app_lang', lang);
  }, [lang]);

  return (
    <Routes>
      <Route path="/" element={<Gallery themeMode={themeMode} setThemeMode={setThemeMode} lang={lang} setLang={setLang} />} />
      <Route path="/theme/:id" element={<ThemeDetail />} />
    </Routes>
  );
}