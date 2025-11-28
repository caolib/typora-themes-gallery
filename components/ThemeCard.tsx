import React, { useState } from 'react';
import { Star, Calendar, Download, HelpCircle, Pin, ExternalLink, Github } from 'lucide-react';
import { ThemeItem, ThemeGroup } from '../types';
import { translations } from '../utils/i18n';

interface ThemeCardProps {
  group: ThemeGroup;
  onRefresh: (groupId: string) => void;
  isPinned: boolean;
  onTogglePin: () => void;
  t: typeof translations['en'];
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ group, onRefresh, isPinned, onTogglePin, t }) => {
  const { themes, stats, loadingStats, matchedThemeId } = group;

  // Initialize with matched theme if available, otherwise first theme
  const [activeThemeId, setActiveThemeId] = useState(() => {
    if (matchedThemeId && themes.some(t => t.id === matchedThemeId)) {
      return matchedThemeId;
    }
    return themes[0].id;
  });

  const activeTheme = themes.find(t => t.id === activeThemeId) || themes[0];
  const activeIndex = themes.findIndex(t => t.id === activeThemeId);

  // Helper to change theme
  const changeTheme = (newId: string) => {
    if (newId === activeThemeId) return;
    setActiveThemeId(newId);
  };

  // Update active theme if matchedThemeId changes (e.g. new search)
  React.useEffect(() => {
    if (matchedThemeId && themes.some(t => t.id === matchedThemeId)) {
      setActiveThemeId(matchedThemeId);
    }
  }, [matchedThemeId, themes]);

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col overflow-hidden ${isPinned ? 'border-brand-200 dark:border-brand-900 ring-1 ring-brand-100 dark:ring-brand-900/50' : 'border-gray-200 dark:border-gray-700'
      }`}>

      {/* Image Carousel Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-900">
        {/* Sliding Container */}
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {themes.map((theme) => (
            <div key={theme.id} className="w-full h-full flex-shrink-0">
              <img
                src={theme.thumbnail}
                alt={`${theme.title} preview`}
                className="w-full h-full object-cover object-top"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/400/250?grayscale';
                }}
              />
            </div>
          ))}
        </div>

        {/* Overlay Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Pin Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all z-10 ${isPinned
            ? 'bg-brand-500 text-white shadow-lg scale-110'
            : 'bg-white/90 dark:bg-gray-800/90 text-gray-400 hover:text-brand-500 hover:bg-white dark:hover:bg-gray-700 shadow-sm opacity-0 group-hover:opacity-100'
            }`}
          title={isPinned ? t.unpin : t.pin}
        >
          <Pin size={16} className={isPinned ? "fill-current" : ""} />
        </button>

        {/* Theme Variants Selector (Overlay) */}
        {themes.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent pt-10 flex gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {themes.map((t) => (
              <button
                key={t.id}
                onMouseEnter={() => changeTheme(t.id)}
                onClick={(e) => {
                  e.stopPropagation();
                  changeTheme(t.id);
                }}
                className={`flex-shrink-0 w-10 h-10 rounded-md overflow-hidden border-2 transition-all shadow-sm ${activeThemeId === t.id
                  ? 'border-brand-400 scale-110 ring-2 ring-brand-400/50'
                  : 'border-white/30 opacity-70 hover:opacity-100 hover:border-white/80'
                  }`}
                title={t.title}
              >
                {t.thumbnail ? (
                  <img src={t.thumbnail} alt={t.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400">
                    {(t.title || 'U').charAt(0)}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1" title={activeTheme.title}>
              {activeTheme.homepage ? (
                <a
                  href={activeTheme.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                >
                  {activeTheme.title}
                </a>
              ) : (
                activeTheme.title
              )}
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <a
                href={`https://github.com/${group.repoOwner}`}
                target="_blank"
                rel="noreferrer"
                className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
              >
                {group.repoOwner}
              </a>
            </div>
          </div>
        </div>

        {activeTheme.description && (
          <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-4 flex-grow" title={activeTheme.description}>
            {activeTheme.description}
          </p>
        )}

        {/* Stats & Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1" title="GitHub Stars">
              <Star size={14} className="text-amber-400 fill-amber-400" />
              <span className="font-medium">
                {loadingStats ? '-' : (stats?.stars?.toLocaleString() || '0')}
              </span>
            </div>
            <div className="flex items-center gap-1" title="Last Updated">
              <Calendar size={14} />
              <span>
                {loadingStats ? '-' : (stats?.lastCommitAt ? new Date(stats.lastCommitAt).toLocaleDateString() : t.unknown)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTheme.homepage && (
              <a
                href={activeTheme.homepage}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                title={t.viewHomepage}
              >
                <ExternalLink size={18} />
              </a>
            )}

            {activeTheme.download && (
              <a
                href={activeTheme.download}
                className="p-2 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                title={t.download}
              >
                <Download size={18} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
