import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import { fetchThemesFromStatic } from '../services/githubService';
import { ThemeGroup } from '../types';

export const ThemeDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    // Handle cases where id might contain slashes (repoOwner/repoName)
    // Actually, extracting "id" from the URL path might be tricky if "id" itself contains slashes.
    // We'll assume encoded ID or just repoOwner/repoName. 
    // Let's verify how we will route this. 
    // Ideally, we pass the group ID, but the group ID is "owner/repo".

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [markdown, setMarkdown] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [group, setGroup] = useState<ThemeGroup | null>(null);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                setLoading(true);
                // We need the theme data to know the filename
                const groups = await fetchThemesFromStatic();
                // Decode the ID in case it was encoded for the URL
                const decodedId = decodeURIComponent(id || '');
                const foundGroup = groups.find(g => g.id === decodedId);

                if (!foundGroup) {
                    setError('Theme not found');
                    return;
                }

                setGroup(foundGroup);

                // Determine which theme to show. If variant is provided in URL, prioritize it.
                // Otherwise use the first theme.
                const variantId = searchParams.get('variant');
                const themeItem = variantId
                    ? foundGroup.themes.find(t => t.id === variantId) || foundGroup.themes[0]
                    : foundGroup.themes[0];

                if (!themeItem || !themeItem.fileName) {
                    setError('No markdown file associated with this theme.');
                    return;
                }

                const rawUrl = `https://raw.githubusercontent.com/typora/theme.typora.io/gh-pages/_posts/theme/${themeItem.fileName}`;
                // Verify if we need to remove ".md" from URL or if fileName includes it?
                // fileName in themes.json includes ".md". 
                // Example: "2025-8-22-OneLight.md"

                const response = await fetch(rawUrl);
                if (!response.ok) {
                    throw new Error('Failed to fetch markdown content');
                }
                const text = await response.text();
                // Remove frontmatter if present (usually between --- and ---)
                const cleanText = text.replace(/^---[\s\S]*?---/, '');
                setMarkdown(cleanText);

            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            loadTheme();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-brand-500" />
                <p className="mt-4 text-gray-500 dark:text-gray-400">Loading theme details...</p>
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{error || 'Theme not found'}</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition"
                >
                    Back to Gallery
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-4 py-4 sm:px-6 lg:px-8">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-brand-600 dark:hover:text-brand-400 transition"
                    >
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back</span>
                    </button>

                    <div className="flex items-center gap-4">
                        <a
                            href={group.themes[0].homepage}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline"
                        >
                            <ExternalLink size={16} />
                            View on GitHub
                        </a>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <article className="prose prose-lg dark:prose-invert max-w-none bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                    {/* Enable HTML rendering with rehype-raw and GFM tables with remark-gfm */}
                    <ReactMarkdown
                        rehypePlugins={[rehypeHighlight, rehypeRaw]}
                        remarkPlugins={[remarkGfm]}
                        components={{
                            img: ({ node, ...props }) => {
                                let src = props.src;
                                if (src && src.startsWith('/')) {
                                    src = `https://theme.typora.io${src}`;
                                }
                                return <img {...props} src={src} className="max-w-full h-auto rounded-lg my-4" />;
                            }
                        }}
                    >
                        {markdown}
                    </ReactMarkdown>
                </article>
            </main>
        </div>
    );
};
