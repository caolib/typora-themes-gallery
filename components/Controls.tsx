import { Search, ArrowUpDown, X, ChevronDown, RefreshCw } from 'lucide-react';
import { SortOption } from '../types';
import { translations } from '../utils/i18n';

interface ControlsProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  totalThemes: number;
  t: typeof translations['en'];
  onRefresh: () => void;
  refreshing: boolean;
}

export function Controls({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
  totalThemes,
  t,
  onRefresh,
  refreshing
}: ControlsProps) {

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
            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className={`p-2 rounded-lg bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:border-brand-200 dark:hover:border-brand-800 transition-all shadow-sm ${refreshing ? 'cursor-not-allowed opacity-70' : ''}`}
              title={t.retry}
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Sort */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ArrowUpDown size={16} />
              </div>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="w-full sm:w-48 pl-10 pr-10 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer shadow-sm text-gray-900 dark:text-white"
              >
                <option value={SortOption.STARS}>{t.sortStars}</option>
                <option value={SortOption.UPDATED}>{t.sortUpdated}</option>
                <option value={SortOption.NAME}>{t.sortName}</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <ChevronDown size={14} />
              </div>
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div>
            {totalThemes} {t.themesCount}
          </div>
        </div>
      </div>
    </div>
  );
}
