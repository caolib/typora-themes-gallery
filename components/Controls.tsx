import React, { useRef, useState, useEffect } from 'react';
import { Search, RefreshCw, ChevronDown, Database, Activity, Key, ArrowUpDown, X, Check } from 'lucide-react';
import { SortOption } from '../types';
import { translations } from '../utils/i18n';

interface ControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  totalThemes: number;
  loading: boolean;
  rateLimitExceeded: boolean;
  apiToken: string;
  setApiToken: (token: string) => void;
  onRefreshFull: () => void;
  onRefreshStats: () => void;
  t: typeof translations['en'];
}

export function Controls({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  totalThemes,
  loading,
  rateLimitExceeded,
  apiToken,
  setApiToken,
  onRefreshFull,
  onRefreshStats,
  t
}: ControlsProps) {
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tempToken, setTempToken] = useState(apiToken);
  const refreshMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (refreshMenuRef.current && !refreshMenuRef.current.contains(event.target as Node)) {
        setShowRefreshMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveToken = () => {
    setApiToken(tempToken);
    setShowTokenInput(false);
  };

  return (
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative w-full sm:max-w-md group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors pointer-events-none">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white dark:focus:bg-gray-800 transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Sort */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ArrowUpDown size={16} />
              </div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full sm:w-48 pl-10 pr-8 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer shadow-sm text-gray-900 dark:text-white"
              >
                <option value={SortOption.STARS}>{t.sortStars}</option>
                <option value={SortOption.UPDATED}>{t.sortUpdated}</option>
                <option value={SortOption.NAME}>{t.sortName}</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              {/* Refresh Dropdown */}
              <div className="relative" ref={refreshMenuRef}>
                <button
                  onClick={() => setShowRefreshMenu(!showRefreshMenu)}
                  className="flex items-center gap-1 p-2 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                  title="Refresh Options"
                >
                  <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                  <ChevronDown size={14} />
                </button>

                {showRefreshMenu && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 overflow-hidden">
                    <button
                      onClick={() => {
                        onRefreshFull();
                        setShowRefreshMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <Database size={16} className="text-gray-400" />
                      <div>
                        <div className="font-medium">{t.refreshFull}</div>
                        <div className="text-xs text-gray-400">{t.refreshFullDesc}</div>
                      </div>
                    </button>
                    <div className="h-px bg-gray-100 dark:bg-gray-700 mx-2"></div>
                    <button
                      onClick={() => {
                        onRefreshStats();
                        setShowRefreshMenu(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200"
                    >
                      <Activity size={16} className="text-gray-400" />
                      <div>
                        <div className="font-medium">{t.refreshStats}</div>
                        <div className="text-xs text-gray-400">{t.refreshStatsDesc}</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              {/* API Token Button */}
              <div className="relative">
                <button
                  onClick={() => {
                    setTempToken(apiToken);
                    setShowTokenInput(!showTokenInput);
                  }}
                  className={`p-2 rounded-lg border transition-all shadow-sm ${apiToken
                    ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  title={apiToken ? t.tokenSet : t.setToken}
                >
                  <Key size={20} />
                </button>

                {/* Token Input Popover */}
                {showTokenInput && (
                  <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{t.tokenTitle}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                      {t.tokenDesc}
                    </p>
                    <input
                      type="password"
                      value={tempToken}
                      onChange={(e) => setTempToken(e.target.value)}
                      placeholder="ghp_..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setShowTokenInput(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                      >
                        {t.cancel}
                      </button>
                      <button
                        onClick={handleSaveToken}
                        className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700"
                      >
                        {t.save}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            {totalThemes} {t.themesCount}
          </div>
          {rateLimitExceeded && (
            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Activity size={12} />
              <span>{t.rateLimit}</span>
              <span className="hidden sm:inline">{t.rateLimitDesc}</span>
              {!apiToken && (
                <button
                  onClick={() => setShowTokenInput(true)}
                  className="underline hover:text-amber-700 dark:hover:text-amber-300 ml-1"
                >
                  {t.addToken}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
