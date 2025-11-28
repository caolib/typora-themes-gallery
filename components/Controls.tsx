import React, { useState, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, Loader2, Key, Check, RefreshCw, Database, Activity, ChevronDown } from 'lucide-react';
import { SortOption } from '../types';

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
}

export const Controls: React.FC<ControlsProps> = ({
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
  onRefreshStats
}) => {
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [showRefreshMenu, setShowRefreshMenu] = useState(false);
  const [tempToken, setTempToken] = useState(apiToken);
  const refreshMenuRef = useRef<HTMLDivElement>(null);

  const handleSaveToken = () => {
    setApiToken(tempToken);
    setShowTokenInput(false);
  };

  // Close refresh menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (refreshMenuRef.current && !refreshMenuRef.current.contains(event.target as Node)) {
        setShowRefreshMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200 py-4 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          
          {/* Left: Stats & Status */}
          <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-gray-800 tracking-tight">
               Themes
               <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                 {totalThemes}
               </span>
             </h2>
             {loading && <Loader2 className="animate-spin text-brand-500" size={20} />}
          </div>

          {/* Right: Controls */}
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
             {/* Search */}
             <div className="relative group w-full sm:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-500 transition-colors" size={18} />
                <input
                  type="text"
                  placeholder="Search themes, authors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
                />
             </div>

             {/* Sort */}
             <div className="relative w-full sm:w-auto">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <ArrowUpDown size={16} />
                </div>
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="w-full sm:w-48 pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer shadow-sm"
                >
                  <option value={SortOption.STARS}>Most Stars</option>
                  <option value={SortOption.UPDATED}>Recently Updated</option>
                  <option value={SortOption.NAME}>Alphabetical</option>
                </select>
             </div>

             <div className="flex items-center gap-2">
                {/* Refresh Dropdown */}
                <div className="relative" ref={refreshMenuRef}>
                  <button
                    onClick={() => setShowRefreshMenu(!showRefreshMenu)}
                    className="flex items-center gap-1 p-2 rounded-lg border bg-white border-gray-200 text-gray-500 hover:text-brand-600 hover:bg-gray-50 transition-all shadow-sm"
                    title="Refresh Options"
                  >
                    <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    <ChevronDown size={14} />
                  </button>

                  {showRefreshMenu && (
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1 z-50 overflow-hidden">
                      <button 
                        onClick={() => {
                          onRefreshFull();
                          setShowRefreshMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Database size={16} className="text-gray-400" />
                        <div>
                          <div className="font-medium">Full Refresh</div>
                          <div className="text-xs text-gray-400">Reload list & stats</div>
                        </div>
                      </button>
                      <div className="h-px bg-gray-100 mx-2"></div>
                      <button 
                        onClick={() => {
                          onRefreshStats();
                          setShowRefreshMenu(false);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-2 text-sm text-gray-700"
                      >
                        <Activity size={16} className="text-gray-400" />
                        <div>
                          <div className="font-medium">Update Stats</div>
                          <div className="text-xs text-gray-400">Stars & dates only</div>
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
                      className={`p-2 rounded-lg border transition-all shadow-sm ${
                        apiToken 
                          ? 'bg-brand-50 border-brand-200 text-brand-600' 
                          : 'bg-white border-gray-200 text-gray-500 hover:text-gray-700'
                      }`}
                      title={apiToken ? "API Token Set" : "Set GitHub API Token"}
                    >
                      <Key size={20} />
                    </button>

                    {/* Token Popover */}
                    {showTokenInput && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50">
                        <h3 className="text-sm font-semibold text-gray-800 mb-2">GitHub API Token</h3>
                        <p className="text-xs text-gray-500 mb-3">
                          Add a personal access token to increase rate limits (60 &rarr; 5000 requests/hr).
                        </p>
                        <input
                          type="password"
                          placeholder="ghp_..."
                          value={tempToken}
                          onChange={(e) => setTempToken(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 mb-3"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setShowTokenInput(false)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveToken}
                            className="px-3 py-1.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors flex items-center gap-1"
                          >
                            <Check size={12} /> Save
                          </button>
                        </div>
                      </div>
                    )}
                </div>
             </div>
          </div>
        </div>

        {/* Rate Limit Warning */}
        {rateLimitExceeded && !apiToken && (
          <div className="mt-3 flex items-center justify-between text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded border border-amber-200">
            <span>
              <span className="font-bold">Rate Limit Exceeded:</span> GitHub API request limit reached. Stats may be incomplete.
            </span>
            <button 
              onClick={() => {
                setTempToken(apiToken);
                setShowTokenInput(true);
              }}
              className="underline hover:text-amber-900 font-medium ml-2"
            >
              Add Token to fix
            </button>
          </div>
        )}
      </div>
      
      {/* Overlay to close popover when clicking outside */}
      {showTokenInput && (
        <div 
          className="fixed inset-0 z-40 bg-transparent" 
          onClick={() => setShowTokenInput(false)}
        />
      )}
    </div>
  );
};
