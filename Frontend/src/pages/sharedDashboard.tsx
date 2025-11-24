import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { SearchIcon } from "../components/icons";
import { Type } from "./dashboard";
import { Logo } from "../components/Logo";
import axios from "axios";
import { ReportContentModal } from "../components/ReportContentModal";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export function SharedDashboard() {
    interface ContentItem {
        title: string;
        link?: string;
        type: Type;
        _id: string;
        body?: string;
        userId?: {
            email?: string;
            firstName?: string;
            lastName?: string;
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
    const [ownerName, setOwnerName] = useState<string | null>(null);
    const [ownerEmail, setOwnerEmail] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [reportingContentId, setReportingContentId] = useState<string | null>(null);
    const [reportingContentTitle, setReportingContentTitle] = useState<string | null>(null);
    

    const resolveOwnerName = (item?: ContentItem) => {
        if (!item?.userId) return null;
        const fullName = `${item.userId.firstName || ""} ${item.userId.lastName || ""}`.trim();
        if (fullName) return fullName;
        return item.userId.email || null;
    };

    const resolveOwnerEmail = (item?: ContentItem) => {
        if (!item?.userId) return null;
        return item.userId.email || null;
    };

    function handleReport(id: string) {
        const item = content.find((c) => c._id === id);
        setReportingContentId(id);
        setReportingContentTitle(item?.title || null);
        setReportOpen(true);
    }

    function closeReportModal() {
        setReportOpen(false);
        setReportingContentId(null);
        setReportingContentTitle(null);
    }

    async function handleDelete(id: string) {
        if (!canEdit) return;
        try {
            const token = localStorage.getItem("token") || "";
            await axios.delete(`${BACKEND_URL}/api/v1/content`, {
                data: { id },
                headers: { Authorization: token }
            });
            setContent((prev) => prev.filter((item) => item._id !== id));
        } catch (error) {
            console.error("Failed to delete content", error);
            alert("Failed to delete content. Please try again.");
        }
    }

    const filteredContent = useMemo(() => {
        return content.filter((item) => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                item.title.toLowerCase().includes(query) ||
                (item.link ? item.link.toLowerCase().includes(query) : false) ||
                (item.body ? item.body.toLowerCase().includes(query) : false);
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
                    const owner = resolveOwnerName(data.contents[0]);
                    const ownerEmail = resolveOwnerEmail(data.contents[0]);
                    
                    if (owner) {
                        setOwnerName(owner);
                        setOwnerEmail(ownerEmail);
                    }
                } else {
                    // For full brain share
                    setContent(data.contents || []);
                    setIsSingleItem(false);
                    const owner = resolveOwnerName(data.contents?.[0]);
                    const ownerEmail = resolveOwnerEmail(data.contents?.[0]);
                    if (owner) {
                        setOwnerName(owner);
                        setOwnerEmail(ownerEmail);
                    }
                }

                // Check if user is authenticated and has edit permissions
                const token = localStorage.getItem("token");
                if (token && data.spaceId) {
                    try {
                        const permResponse = await axios.get(`${BACKEND_URL}/api/v1/shared-with-me`, {
                            params: { resourceType: "space" },
                            headers: { Authorization: token }
                        });
                        if (permResponse.data && permResponse.data.spaces) {
                            // Check if current user has read-write access to this space
                            const spaceAccess = permResponse.data.spaces.find((space: any) => 
                                space._id === data.spaceId && space.permissions === "read-write"
                            );
                            if (spaceAccess) {
                                setCanEdit(true);
                            }
                        }
                    } catch (error) {
                        // User might not have user-to-user sharing access, which is fine
                        // Public link sharing remains read-only
                        console.log("No user-to-user sharing access found");
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
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Logo />
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
                    <div className="text-center">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-4 border-indigo-200 border-t-indigo-600 mx-auto"></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="h-8 w-8 bg-indigo-600 rounded-full animate-pulse"></div>
                            </div>
                        </div>
                        <p className="mt-6 text-gray-600 font-medium">Loading shared content...</p>
                        <p className="mt-2 text-sm text-gray-500">Please wait while we fetch the content</p>
                    </div>
                </div>
            </div>
        );
    }

    if (expired) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Logo />
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
                    <div className="text-center p-8 max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-red-100 to-orange-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
                        <p className="text-gray-600 mb-8">The shared link has expired or is no longer available.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="/"
                                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                            >
                                Go to Home
                            </a>
                            <a
                                href="/user/signin"
                                className="inline-block bg-white text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Sign In
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (authRequired) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
                <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                        <Logo />
                    </div>
                </div>
                <div className="flex items-center justify-center min-h-[calc(100vh-100px)] px-4">
                    <div className="text-center p-8 max-w-md mx-auto bg-white rounded-2xl shadow-lg border border-gray-200">
                        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                            <svg className="w-10 h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h1>
                        <p className="text-gray-600 mb-8">Please sign in to view this shared content.</p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <a
                                href="/user/signin"
                                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium shadow-sm"
                            >
                                Sign In
                            </a>
                            <a
                                href="/"
                                className="inline-block bg-white text-gray-700 border-2 border-gray-300 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                            >
                                Go to Home
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className=" bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
                <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Logo />
                            <div className="hidden sm:block h-8 w-px bg-gray-300"></div>
                            <div>
                                <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-0.5">
                                    {isSingleItem ? 'Shared Content' : 'Shared Brain'}
                                </h1>
                                {ownerName && (
                                    <p className="text-sm text-gray-500">
                                        Shared by <span className="font-medium text-gray-700">{ownerName}</span>
                                        {ownerEmail && <span className="text-gray-800 text-xs"> ( {ownerEmail} )</span>}
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <a
                                href="/"
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                            >
                                Home
                            </a>
                            <a
                                href="/user/signin"
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                Sign In
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 overflow-x-hidden">
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-2xl">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm shadow-sm transition-all"
                            placeholder="Search content by title or link..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar with filters */}
                    <div className="w-full lg:w-64 flex-shrink-0">
                        <div className="bg-white/60 backdrop-blur-sm rounded-xl border border-gray-200/50 p-5 shadow-sm">
                            <h2 className="text-lg font-bold text-gray-900 mb-4">Content Types</h2>
                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveFilter("all")}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                                        activeFilter === "all"
                                            ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-l-4 border-indigo-500 shadow-sm"
                                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                                    }`}
                                >
                                    <span>All Content</span>
                                    <span
                                        className={`ml-auto inline-block py-1 px-2.5 text-xs rounded-full font-semibold ${
                                            activeFilter === "all"
                                                ? "bg-indigo-100 text-indigo-700"
                                                : "bg-gray-100 text-gray-600"
                                        }`}
                                    >
                                        {content.length}
                                    </span>
                                </button>

                                {[
                                    { type: "youtube" as Type, label: "YouTube" },
                                    { type: "twitter" as Type, label: "Tweets" },
                                    { type: "document" as Type, label: "Documents" },
                                    { type: "link" as Type, label: "Links" },
                                    { type: "article" as Type, label: "Articles" },
                                    { type: "note" as Type, label: "Notes" },
                                ].map(({ type, label }) => {
                                    const count = content.filter((item) => item.type === type).length;
                                    if (isSingleItem && count === 0) return null;

                                    return (
                                        <button
                                            key={type}
                                            onClick={() => setActiveFilter(type)}
                                            className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                                                activeFilter === type
                                                    ? "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-l-4 border-indigo-500 shadow-sm"
                                                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                                            }`}
                                        >
                                            <span>{label}</span>
                                            <span
                                                className={`ml-auto inline-block py-1 px-2.5 text-xs rounded-full font-semibold ${
                                                    activeFilter === type
                                                        ? "bg-indigo-100 text-indigo-700"
                                                        : "bg-gray-100 text-gray-600"
                                                }`}
                                            >
                                                {count}
                                            </span>
                                        </button>
                                    );
                                })}
                            </nav>
                        </div>
                    </div>

                    {/* Main content */}
                    <div className="w-4/5">
                        <div className="mb-5 flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <span className="font-semibold text-gray-900">{filteredContent.length}</span>
                                    <span>{filteredContent.length === 1 ? 'item' : 'items'}</span>
                                    {searchQuery && (
                                        <span className="text-gray-400">matching "{searchQuery}"</span>
                                    )}
                                </p>
                            </div>
                            {content.length > 0 && (
                                <div className="text-xs text-gray-500">
                                    {isSingleItem ? 'Single item view' : `${content.length} total items`}
                                </div>
                            )}
                        </div>

                        {filteredContent.length > 0 ? (
                            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-3 2xl:columns-3 gap-4 md:gap-6">
                                {filteredContent.map((item, index) => (
                                    <div
                                        key={item._id}
                                        className="mb-4 break-inside-avoid transform transition-all duration-300 hover:-translate-y-1 animate-in fade-in slide-in-from-bottom-4"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <Card
                                            _id={item._id as any}
                                            title={item.title}
                                            link={item.link}
                                            body={item.body}
                                            type={item.type}
                                            readOnly={!canEdit}
                                            onReport={(id) => handleReport(id.toString())}
                                            onDelete={canEdit ? (id) => handleDelete(id.toString()) : undefined}
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 md:py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-300 animate-in fade-in">
                                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                                    {searchQuery ? (
                                        <SearchIcon className="h-10 w-10 text-gray-400" />
                                    ) : activeFilter !== "all" ? (
                                        <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    )}
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    {searchQuery
                                        ? 'No matches found'
                                        : activeFilter !== "all"
                                        ? `No ${activeFilter} content found`
                                        : "No content available"}
                                </h3>
                                <p className="text-gray-600 mb-6 max-w-md px-4">
                                    {searchQuery
                                        ? `No content matches "${searchQuery}". Try a different search term or clear the filter.`
                                        : activeFilter !== "all"
                                        ? `There's no ${activeFilter} content in this shared collection. Try selecting "All Content" to see everything.`
                                        : "This shared collection doesn't have any content yet."}
                                </p>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery("")}
                                        className="px-5 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                                    >
                                        Clear search
                                    </button>
                                )}
                                {!searchQuery && activeFilter !== "all" && (
                                    <button
                                        onClick={() => setActiveFilter("all")}
                                        className="px-5 py-2.5 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors shadow-sm"
                                    >
                                        Show all content
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {reportOpen && (
                <ReportContentModal
                    open={reportOpen}
                    onClose={closeReportModal}
                    contentId={reportingContentId}
                    contentTitle={reportingContentTitle || undefined}
                />
            )}
        </div>
    );
}

export default SharedDashboard