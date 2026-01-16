import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Star, Calendar, Download, Pin, ExternalLink, Github, ChevronLeft, ChevronRight } from 'lucide-react';
import { ThemeGroup } from '../types';
import { translations } from '../utils/i18n';
import { formatDate, formatDateCustom } from '@caolib/time-util';

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

  // Helper to show relative time for recent updates and pure date for older ones
  const getSmartDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const diff = Date.now() - date.getTime();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    if (diff < oneMonth) return formatDate(dateStr);
    return formatDateCustom(dateStr, 'yyyy.MM.dd');
  };

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
    <div className={`group relative aspect-[5/4] bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-500 border overflow-hidden ${isPinned ? 'border-brand-300 dark:border-brand-800 ring-2 ring-brand-100/50 dark:ring-brand-900/30' : 'border-gray-200 dark:border-gray-700'
      }`}>

      {/* Full Background Image Carousel */}
      <div
        className="absolute inset-0 z-0 bg-gray-100 dark:bg-gray-900"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div
          className="flex h-full transition-transform duration-700 cubic-bezier(0.4, 0, 0.2, 1)"
          style={{ transform: `translateX(-${activeIndex * 100}%)` }}
        >
          {themes.map((theme) => (
            <div key={theme.id} className="w-full h-full flex-shrink-0">
              <img
                src={theme.thumbnail}
                alt={`${theme.title} preview`}
                className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/500/400?grayscale';
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Variant Selectors (Targeted Overlay - Moved outside for better interaction) */}
      {themes.length > 1 && (
        <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-b from-black/60 to-transparent z-30 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-y-1 group-hover:translate-y-0">
          <div className="flex items-center justify-between gap-1 pointer-events-none">
            <button
              className="p-0.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 backdrop-blur-md transition-colors pointer-events-auto"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollContainerRef.current?.scrollBy({ left: -60, behavior: 'smooth' }); }}
            >
              <ChevronLeft size={12} />
            </button>
            <div ref={scrollContainerRef} className="flex gap-1 overflow-x-auto no-scrollbar px-1 py-0.5 scroll-smooth pointer-events-auto">
              {themes.map((t) => (
                <button
                  key={t.id}
                  onMouseEnter={() => changeTheme(t.id)}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); changeTheme(t.id); }}
                  className={`flex-shrink-0 w-6 h-6 rounded-md overflow-hidden border transition-all ${activeThemeId === t.id ? 'border-brand-400 scale-105' : 'border-white/20 opacity-60'}`}
                >
                  <img src={t.thumbnail} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <button
              className="p-0.5 rounded-full bg-black/20 hover:bg-black/40 text-white/90 backdrop-blur-md transition-colors pointer-events-auto"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); scrollContainerRef.current?.scrollBy({ left: 60, behavior: 'smooth' }); }}
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Main Link to Detail */}
      <Link
        to={`/theme/${encodeURIComponent(group.id)}?variant=${encodeURIComponent(activeThemeId)}`}
        className="absolute inset-0 z-10"
      />

      {/* Floating Info Card */}
      <div className="absolute bottom-2 left-2 z-20 pointer-events-none flex justify-start w-full">
        <div className="group/info bg-black/60 backdrop-blur-xl rounded-xl p-3 shadow-2xl border border-white/10 w-auto min-w-[55%] max-w-[calc(100%-24px)] pointer-events-auto">
          <div className="flex items-center justify-between gap-3 min-w-0">
            <span className="font-medium text-[10px] text-white whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">
              {activeTheme.title}
            </span>

            {/* Minimal Stats (Normal State Only) */}
            <div className="flex items-center gap-2 text-[10px] text-gray-300 group-hover/info:hidden transition-all duration-700 font-medium flex-shrink-0">
              <div className="flex items-center gap-0.5 h-full">
                <Star size={10} className="text-amber-500 fill-amber-500 -translate-y-[0.5px]" />
                <span className="leading-none">{stats?.stars || 0}</span>
              </div>
              <div className="flex items-center gap-0.5">
                <span className="whitespace-nowrap leading-none">{getSmartDate(stats?.lastCommitAt)}</span>
              </div>
            </div>
          </div>

          {/* Expanded Menu (Hover Only) */}
          <div className="grid grid-rows-[0fr] group-hover/info:grid-rows-[1fr] transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
            <div className="overflow-hidden min-w-0">
              <div className="pt-2 mt-2 border-t border-white/10 min-w-0 opacity-0 group-hover/info:opacity-100 transition-opacity duration-700 delay-100">
                <div className="flex items-center justify-between gap-4 text-[10px] text-gray-400 mb-2">
                  <a
                    href={`https://github.com/${group.repoOwner}`}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="truncate font-medium hover:text-white hover:bg-white/10 px-1.5 py-0.5 -ml-1.5 rounded-md transition-all"
                  >
                    {activeTheme.author || group.repoOwner}
                  </a>
                  <span className="opacity-60 whitespace-nowrap leading-none">{stats?.lastCommitAt ? getSmartDate(stats.lastCommitAt) : t.unknown}</span>
                </div>

                {activeTheme.description && (
                  <p className="text-[10px] text-gray-300 line-clamp-1 mb-3 leading-relaxed italic">
                    {activeTheme.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 flex-shrink-0">
                    <Star size={12} className="fill-current -translate-y-[0.5px]" />
                    <span className="leading-none">{stats?.stars?.toLocaleString() || '0'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(); }}
                      className={`p-1.5 rounded-lg transition-all ${isPinned ? 'text-brand-400 bg-brand-400/10' : 'text-gray-400 hover:text-brand-400 hover:bg-white/10'}`}
                      title={isPinned ? t.unpin : t.pin}
                    >
                      <Pin size={14} className={isPinned ? "fill-current" : ""} />
                    </button>
                    {activeTheme.homepage && (
                      <a
                        href={activeTheme.homepage}
                        target="_blank" rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title={t.viewGithub}
                      >
                        <Github size={14} />
                      </a>
                    )}
                    {activeTheme.download && (
                      <a
                        href={activeTheme.download}
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-brand-400 hover:bg-white/10 transition-all"
                        title={t.download}
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
