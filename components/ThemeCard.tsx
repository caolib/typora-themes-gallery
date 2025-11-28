import React from 'react';
import { Star, Calendar, Download, User, AlertCircle, Github, HelpCircle, RefreshCw } from 'lucide-react';
import { ThemeItem } from '../types';

interface ThemeCardProps {
  theme: ThemeItem;
  onRefresh: (id: string) => void;
}

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const ThemeCard: React.FC<ThemeCardProps> = ({ theme, onRefresh }) => {
  const { id, title, author, thumbnail, homepage, download, stats, loadingStats } = theme;

  // Determine what icon to show in top right of image
  const renderStatusIcon = () => {
    if (stats?.isRateLimit) {
      return (
        <div className="absolute top-2 right-2">
           <div className="bg-red-50/90 backdrop-blur text-red-500 p-1.5 rounded-full shadow-sm" title="Rate limit exceeded. Add token to view stats.">
              <AlertCircle size={14} />
           </div>
        </div>
      );
    }
    if (stats?.isNotFound) {
      return (
        <div className="absolute top-2 right-2">
           <div className="bg-gray-100/90 backdrop-blur text-gray-500 p-1.5 rounded-full shadow-sm" title="Repository not found or private.">
              <HelpCircle size={14} />
           </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Thumbnail Area */}
      <div className="relative aspect-[16/10] overflow-hidden bg-gray-100">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={`${title} preview`} 
            className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/400/250?grayscale';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-sm">No Preview</span>
          </div>
        )}
        
        {renderStatusIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="mb-2">
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{title || 'Untitled'}</h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
            <User size={14} />
            <span className="truncate">by {author || 'Unknown'}</span>
          </div>
        </div>

        {/* Footer: Stats & Actions */}
        <div className="mt-auto pt-4 border-t border-gray-50 flex items-center justify-between">
          
          {/* Left: Stats & Refresh */}
          <div className="flex items-center gap-3">
             <div className="flex flex-col gap-1 text-xs text-gray-500">
                <div className="flex items-center gap-1.5" title="GitHub Stars">
                  <Star size={14} className={stats?.stars ? "text-amber-500 fill-amber-500" : "text-gray-300"} />
                  <span className="font-medium">
                    {loadingStats ? '...' : (stats?.error || stats?.isNotFound) ? '-' : stats?.stars?.toLocaleString() ?? '-'}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5" title="Last Commit Date">
                  <Calendar size={14} className="text-gray-400" />
                  <span>
                    {loadingStats ? '...' : (stats?.error || stats?.isNotFound) ? '-' : formatDate(stats?.lastCommitAt)}
                  </span>
                </div>
             </div>
             
             {/* Individual Refresh */}
             <button 
                onClick={() => onRefresh(id)}
                className={`p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-brand-600 transition-all ${loadingStats ? 'animate-spin text-brand-500' : ''}`}
                title="Refresh stats for this theme"
                disabled={loadingStats}
             >
                <RefreshCw size={12} />
             </button>
          </div>

          {/* Right: Actions */}
          <div className="flex gap-2">
            {homepage && (
              <a 
                href={homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-gray-600 bg-gray-100 hover:bg-brand-50 hover:text-brand-600 rounded-full transition-all"
                title="View Source on GitHub"
              >
                <Github size={18} />
              </a>
            )}
            {download && (
              <a 
                href={download} 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-white bg-brand-600 hover:bg-brand-700 rounded-full transition-all shadow-sm hover:shadow"
                title="Download Theme"
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
