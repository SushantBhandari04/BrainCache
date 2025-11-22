import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { CrossIcon } from "./icons";

type Comment = {
    _id: string;
    comment: string;
    edited: boolean;
    createdAt: string;
    updatedAt: string;
    userId: {
        _id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
    isOwner: boolean;
    spaceOwner: boolean;
};

type SpaceCommentsProps = {
    spaceId: string | null;
    spaceName?: string;
    isSpaceOwner: boolean;
};

export function SpaceComments({ spaceId, spaceName, isSpaceOwner }: SpaceCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [newComment, setNewComment] = useState("");
    const [error, setError] = useState<string | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (spaceId) {
            fetchComments();
        } else {
            setComments([]);
        }
    }, [spaceId]);

    useEffect(() => {
        if (editingId && editTextareaRef.current) {
            editTextareaRef.current.focus();
        }
    }, [editingId]);

    async function fetchComments() {
        if (!spaceId) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            if (!token) {
                setError("Please sign in to view comments");
                setLoading(false);
                return;
            }
            const res = await axios.get(`${BACKEND_URL}/api/v1/spaces/${spaceId}/comments`, {
                headers: { Authorization: token }
            });
            setComments(res.data.comments || []);
        } catch (e: any) {
            let errorMessage = e?.response?.data?.message || "Failed to load comments";
            // If it's a 403, show a more helpful message
            if (e?.response?.status === 403) {
                errorMessage = "You don't have access to view comments on this space. Make sure you have been granted access by the space owner.";
            } else if (e?.response?.status === 401) {
                errorMessage = "Please sign in to view comments";
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit() {
        if (!spaceId || !newComment.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            if (!token) {
                setError("Please sign in to post comments");
                setSubmitting(false);
                return;
            }
            await axios.post(`${BACKEND_URL}/api/v1/spaces/${spaceId}/comments`, {
                comment: newComment.trim()
            }, {
                headers: { Authorization: token }
            });
            setNewComment("");
            await fetchComments();
        } catch (e: any) {
            let errorMessage = e?.response?.data?.message || "Failed to add comment";
            // If it's a 403, show a more helpful message
            if (e?.response?.status === 403) {
                errorMessage = "You don't have access to post comments on this space. Make sure you have been granted access by the space owner.";
            } else if (e?.response?.status === 401) {
                errorMessage = "Please sign in to post comments";
            }
            setError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    }

    async function handleUpdate(commentId: string) {
        if (!editText.trim()) return;
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.patch(`${BACKEND_URL}/api/v1/spaces/${spaceId}/comments/${commentId}`, {
                comment: editText.trim()
            }, {
                headers: { Authorization: token }
            });
            setEditingId(null);
            setEditText("");
            await fetchComments();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to update comment");
        } finally {
            setSubmitting(false);
        }
    }

    async function handleDelete(commentId: string) {
        if (!spaceId || !confirm("Are you sure you want to delete this comment?")) return;
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.delete(`${BACKEND_URL}/api/v1/spaces/${spaceId}/comments/${commentId}`, {
                headers: { Authorization: token }
            });
            await fetchComments();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to delete comment");
        } finally {
            setSubmitting(false);
        }
    }

    function startEdit(comment: Comment) {
        setEditingId(comment._id);
        setEditText(comment.comment);
    }

    function cancelEdit() {
        setEditingId(null);
        setEditText("");
    }

    function getUserDisplayName(user: Comment["userId"]) {
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName || user.email;
    }

    function formatDate(dateString: string) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "just now";
        if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        return date.toLocaleDateString();
    }

    if (!spaceId) {
        return (
            <div className="text-center py-8 text-gray-500">
                <p className="text-sm">Select a space to view comments and feedback.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Comments & Feedback</h3>
                <p className="text-sm text-gray-500">
                    {isSpaceOwner 
                        ? "View feedback from users who have access to this space."
                        : "Share your thoughts and feedback with the space owner."}
                </p>
            </div>

            {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                    {error}
                </div>
            )}

            {/* Add Comment Form */}
            <div className="mb-6">
                <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your comment or feedback..."
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                    rows={3}
                    maxLength={2000}
                    disabled={submitting}
                />
                <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-500">
                        {newComment.length}/2000 characters
                    </span>
                    <button
                        onClick={handleSubmit}
                        disabled={!newComment.trim() || submitting}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                        {submitting ? "Posting..." : "Post Comment"}
                    </button>
                </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-8 text-gray-500">
                        <div className="w-6 h-6 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-sm">Loading comments...</p>
                    </div>
                ) : comments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <p className="text-sm font-medium">No comments yet</p>
                        <p className="text-xs mt-1">Be the first to share your feedback!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => (
                            <div
                                key={comment._id}
                                className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:border-gray-300 transition-colors"
                            >
                                {editingId === comment._id ? (
                                    <div className="space-y-3">
                                        <textarea
                                            ref={editTextareaRef}
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full px-3 py-2 border-2 border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                                            rows={3}
                                            maxLength={2000}
                                            disabled={submitting}
                                        />
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-500">
                                                {editText.length}/2000 characters
                                            </span>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={cancelEdit}
                                                    disabled={submitting}
                                                    className="px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleUpdate(comment._id)}
                                                    disabled={!editText.trim() || submitting}
                                                    className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {submitting ? "Saving..." : "Save"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold text-sm">
                                                    {getUserDisplayName(comment.userId).charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-gray-900 text-sm">
                                                            {getUserDisplayName(comment.userId)}
                                                        </span>
                                                        {comment.isOwner && (
                                                            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                                                                You
                                                            </span>
                                                        )}
                                                        {comment.spaceOwner && !comment.isOwner && (
                                                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                                                                Space Owner
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                                        <span>{comment.userId.email}</span>
                                                        <span>•</span>
                                                        <span>{formatDate(comment.createdAt)}</span>
                                                        {comment.edited && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="italic">edited</span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {(comment.isOwner || isSpaceOwner) && (
                                                <div className="flex items-center gap-1">
                                                    {comment.isOwner && (
                                                        <button
                                                            onClick={() => startEdit(comment)}
                                                            disabled={submitting}
                                                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Edit comment"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {(comment.isOwner || isSpaceOwner) && (
                                                        <button
                                                            onClick={() => handleDelete(comment._id)}
                                                            disabled={submitting}
                                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                            title="Delete comment"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-gray-700 whitespace-pre-wrap break-words">{comment.comment}</p>
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

