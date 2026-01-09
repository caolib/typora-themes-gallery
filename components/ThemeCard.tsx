import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar, Download, Pin, ExternalLink, Github, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeGroup } from '../types';
import { translations } from '../utils/i18n';

interface ThemeCardProps {
  group: ThemeGroup;
  isPinned: boolean;
  onTogglePin: () => void;
  t: typeof translations['en'];
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ group, isPinned, onTogglePin, t }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
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

  const [paused, setPaused] = useState(false);

  // Auto-rotate themes when there are multiple previews
  useEffect(() => {
    if (themes.length <= 1) return;

    const id = setInterval(() => {
      if (paused) return;
      setActiveThemeId(prevId => {
        const idx = themes.findIndex(x => x.id === prevId);
        const next = (idx + 1) % themes.length;
        return themes[next].id;
      });
    }, 4000);

    return () => clearInterval(id);
  }, [themes, paused]);

  // Helper to change theme
  const changeTheme = (newId: string) => {
    if (newId === activeThemeId) return;
    setActiveThemeId(newId);
  };

  // Update active theme if matchedThemeId changes (e.g. new search)
  useEffect(() => {
    if (matchedThemeId && themes.some(t => t.id === matchedThemeId)) {
      setActiveThemeId(matchedThemeId);
    }
  }, [matchedThemeId, themes]);

  return (
    <div className={`group relative bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 border flex flex-col overflow-hidden ${isPinned ? 'border-brand-200 dark:border-brand-900 ring-1 ring-brand-100 dark:ring-brand-900/50' : 'border-gray-200 dark:border-gray-700'
      }`}>

      {/* Image Carousel Area */}
      <Link
        to={`/theme/${encodeURIComponent(group.id)}?variant=${encodeURIComponent(activeThemeId)}`}
        className="relative aspect-[16/10] overflow-hidden bg-gray-100 dark:bg-gray-900 block cursor-pointer"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
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





        {/* Theme Variants Selector (Overlay) */}
        {themes.length > 1 && (
          <div className="absolute bottom-0 left-0 right-0 px-2 py-3 bg-gradient-to-t from-black/90 to-transparent pt-12 flex items-center justify-between gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">

            <button
              className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white/90 transition-colors backdrop-blur-sm flex-shrink-0"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                scrollContainerRef.current?.scrollBy({ left: -100, behavior: 'smooth' });
              }}
            >
              <ChevronLeft size={16} />
            </button>

            <div
              ref={scrollContainerRef}
              className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth px-1 py-1"
            >
              {themes.map((t) => (
                <button
                  key={t.id}
                  onMouseEnter={() => changeTheme(t.id)}
                  onClick={(e) => {
                    e.preventDefault();
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

            <button
              className="p-1 rounded-full bg-black/30 hover:bg-black/60 text-white/90 transition-colors backdrop-blur-sm flex-shrink-0"
              onClick={(e) => {
                e.preventDefault(); e.stopPropagation();
                scrollContainerRef.current?.scrollBy({ left: 100, behavior: 'smooth' });
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-1" title={activeTheme.title}>
              {/* Clickable Title for Detail View */}
              <Link
                to={`/theme/${encodeURIComponent(group.id)}?variant=${encodeURIComponent(activeThemeId)}`}
                className="hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
              >
                {activeTheme.title}
              </Link>
            </h3>
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              {group.repoOwner !== 'unknown' && !group.id.startsWith('author/') && !group.id.startsWith('standalone/') ? (
                <a
                  href={`https://github.com/${group.repoOwner}`}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {activeTheme.author || group.repoOwner}
                </a>
              ) : (
                <span>{activeTheme.author || group.repoOwner}</span>
              )}
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
            {/* Pin Button */}
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onTogglePin();
              }}
              className={`p-2 rounded-lg transition-all ${isPinned
                ? 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/30 opacity-100'
                : 'text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 opacity-0 group-hover:opacity-100'
                }`}
              title={isPinned ? t.unpin : t.pin}
            >
              <Pin size={18} className={isPinned ? "fill-current" : ""} />
            </button>

            {activeTheme.homepage && (
              <a
                href={activeTheme.homepage}
                target="_blank"
                rel="noreferrer"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg transition-colors"
                title={t.viewHomepage}
              >
                <Github size={18} />
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
