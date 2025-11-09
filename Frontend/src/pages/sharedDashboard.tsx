import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { SearchIcon } from "../components/icons";
import { Type } from "./dashboard";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function SharedDashboard() {
    interface ContentItem {
        title: string;
        link: string;
        type: Type;
        _id: string;
        userId?: {
            username?: string;
            _id?: string;
        };
    }

    const [content, setContent] = useState<ContentItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState<Type | "all">("all");
    const [authRequired, setAuthRequired] = useState(false);
    const [expired, setExpired] = useState(false);
    const { hash } = useParams();
    const [isLoading, setIsLoading] = useState(true);
    const [isSingleItem, setIsSingleItem] = useState(false);
    const [username, setUsername] = useState<string | null>(null);

    const filteredContent = useMemo(() => {
        return content.filter((item) => {
            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                               item.link.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = activeFilter === "all" || item.type === activeFilter;
            return matchesSearch && matchesFilter;
        });
    }, [content, searchQuery, activeFilter]);

    useEffect(() => {
        if (!hash) return;

        const fetchSharedContent = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/api/v1/content/share/${hash}`);
                
                if (response.status === 404) {
                    setExpired(true);
                    return;
                }

                if (response.status === 401) {
                    setAuthRequired(true);
                    return;
                }

                const data = await response.json();
                
                // If it's a single item share, we'll get an array with one item
                if (data.isSingleItem && data.contents && data.contents.length > 0) {
                    setContent(data.contents);
                    setIsSingleItem(true);
                    // Try to get the username if available
                    if (data.contents[0]?.userId?.username) {
                        setUsername(data.contents[0].userId.username);
                    }
                } else {
                    // For full brain share
                    setContent(data.contents || []);
                    setIsSingleItem(false);
                    // Try to get the username if available
                    if (data.contents?.[0]?.userId?.username) {
                        setUsername(data.contents[0].userId.username);
                    }
                }
            } catch (error) {
                console.error("Error fetching shared content:", error);
                setExpired(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSharedContent();
    }, [hash]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading shared content...</p>
                </div>
            </div>
        );
    }

    if (expired) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-6 max-w-md mx-auto">
                    <div className="text-5xl mb-4">🔗</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Link Expired</h1>
                    <p className="text-gray-600 mb-6">The shared link has expired or is no longer available.</p>
                    <a
                        href="/"
                        className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Go to Home
                    </a>
                </div>
            </div>
        );
    }

    if (authRequired) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center p-6 max-w-md mx-auto">
                    <div className="text-5xl mb-4">🔒</div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Authentication Required</h1>
                    <p className="text-gray-600 mb-6">Please sign in to view this shared content.</p>
                    <a
                        href="/user/signin"
                        className="inline-block bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600 transition-colors"
                    >
                        Sign In
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">
                        {isSingleItem ? 'Shared Content' : 'Shared Brain'}
                        {username && (
                            <span className="text-lg font-normal text-gray-500 ml-2">
                                by @{username}
                            </span>
                        )}
                    </h1>
                    <p className="text-gray-600">
                        {isSingleItem 
                            ? 'This link shares a single content item.' 
                            : 'This is a shared collection of content.'}
                    </p>
                </div>

                <div className="mb-6">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Search content..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* Sidebar with filters */}
                    <div className="w-full md:w-48 flex-shrink-0">
                        <div className="space-y-1">
                            <button
                                onClick={() => setActiveFilter("all")}
                                className={`w-full text-left px-4 py-2 text-sm font-medium rounded-md ${
                                    activeFilter === "all"
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-700 hover:bg-gray-100"
                                }`}
                            >
                                All ({content.length})
                            </button>
                            {["youtube", "twitter", "document", "link"].map((type) => {
                                const count = content.filter((item) => item.type === type).length;
                                if (isSingleItem && count === 0) return null;
                                
                                return (
                                    <button
                                        key={type}
                                        onClick={() => setActiveFilter(type as Type)}
                                        className={`w-full text-left px-4 py-2 text-sm font-medium rounded-md ${
                                            activeFilter === type
                                                ? "bg-blue-100 text-blue-700"
                                                : "text-gray-700 hover:bg-gray-100"
                                        }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="flex-1">
                        {filteredContent.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredContent.map((item) => (
                                    <Card
                                        key={item._id}
_id={item._id as any}
                                        title={item.title}
                                        link={item.link}
                                        type={item.type}
                                        readOnly={true}
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500">
                                    {searchQuery
                                        ? "No content matches your search."
                                        : activeFilter !== "all"
                                        ? `No ${activeFilter} content found.`
                                        : "No content available."}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SharedDashboard