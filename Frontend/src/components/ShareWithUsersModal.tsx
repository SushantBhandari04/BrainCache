import { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { CrossIcon } from "./icons";

type ShareWithUsersModalProps = {
    open: boolean;
    onClose: () => void;
    resourceType: "space" | "content";
    resourceId: string | null;
    resourceName?: string;
};

type User = {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
};

type SharedUser = {
    userId: User;
    permissions: string;
    sharedAt: string;
};

export function ShareWithUsersModal({ open, onClose, resourceType, resourceId, resourceName }: ShareWithUsersModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
    const [sharedUsers, setSharedUsers] = useState<SharedUser[]>([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [sharing, setSharing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [removing, setRemoving] = useState<string | null>(null);
    const [defaultPermission, setDefaultPermission] = useState<"read" | "read-write">("read");
    const [updatingPermissions, setUpdatingPermissions] = useState<string | null>(null);

    const fetchSharedUsers = useCallback(async () => {
        if (!resourceId) return;
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await axios.get(`${BACKEND_URL}/api/v1/share/with-users`, {
                params: { resourceType, resourceId },
                headers: { Authorization: token }
            });
            setSharedUsers(res.data.sharedWith || []);
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to load shared users");
        } finally {
            setLoading(false);
        }
    }, [resourceType, resourceId]);

    useEffect(() => {
        if (open && resourceId) {
            fetchSharedUsers();
            setSelectedUsers([]);
            setSearchQuery("");
            setSearchResults([]);
        }
    }, [open, resourceId, fetchSharedUsers]);

    useEffect(() => {
        if (!searchQuery || searchQuery.length < 3) {
            setSearchResults([]);
            return;
        }

        const searchTimeout = setTimeout(async () => {
            setSearching(true);
            setError(null);
            try {
                const token = localStorage.getItem("token") || "";
                const res = await axios.get(`${BACKEND_URL}/api/v1/users/search`, {
                    params: { email: searchQuery },
                    headers: { Authorization: token }
                });
                // Filter out already selected users and already shared users
                const sharedUserIds = sharedUsers.map(su => su.userId._id);
                const selectedUserIds = selectedUsers.map(u => u._id);
                const filtered = res.data.users.filter((u: User) => 
                    !sharedUserIds.includes(u._id) && !selectedUserIds.includes(u._id)
                );
                setSearchResults(filtered);
            } catch (e: any) {
                setError(e?.response?.data?.message || "Failed to search users");
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(searchTimeout);
    }, [searchQuery, sharedUsers, selectedUsers]);

    async function handleShare() {
        if (!resourceId || selectedUsers.length === 0) return;
        setSharing(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.post(`${BACKEND_URL}/api/v1/share/with-users`, {
                resourceType,
                resourceId,
                userIds: selectedUsers.map(u => u._id),
                permissions: defaultPermission
            }, {
                headers: { Authorization: token }
            });
            setSelectedUsers([]);
            setSearchQuery("");
            setSearchResults([]);
            await fetchSharedUsers();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to share");
        } finally {
            setSharing(false);
        }
    }

    async function handleUpdatePermissions(userId: string, newPermissions: "read" | "read-write") {
        if (!resourceId) return;
        setUpdatingPermissions(userId);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.patch(`${BACKEND_URL}/api/v1/share/with-users`, {
                resourceType,
                resourceId,
                userId,
                permissions: newPermissions
            }, {
                headers: { Authorization: token }
            });
            await fetchSharedUsers();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to update permissions");
        } finally {
            setUpdatingPermissions(null);
        }
    }

    async function handleRemoveShare(userId: string) {
        if (!resourceId) return;
        setRemoving(userId);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.delete(`${BACKEND_URL}/api/v1/share/with-users`, {
                data: { resourceType, resourceId, userId },
                headers: { Authorization: token }
            });
            await fetchSharedUsers();
        } catch (e: any) {
            setError(e?.response?.data?.message || "Failed to remove share");
        } finally {
            setRemoving(null);
        }
    }

    function addUser(user: User) {
        setSelectedUsers(prev => [...prev, user]);
        setSearchQuery("");
        setSearchResults([]);
    }

    function removeSelectedUser(userId: string) {
        setSelectedUsers(prev => prev.filter(u => u._id !== userId));
    }

    function getUserDisplayName(user: User) {
        const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
        return fullName || user.email;
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex justify-center items-center z-50 px-4">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                    <div>
                        <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Share with Users</p>
                        <h2 className="text-2xl font-semibold text-gray-900 mt-1">
                            {resourceName || `${resourceType === 'space' ? 'Space' : 'Content'}`}
                        </h2>
                    </div>
                    <CrossIcon onClick={onClose} />
                </div>

                <div className="p-6 overflow-y-auto flex-1">
                    {error && (
                        <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                            {error}
                        </div>
                    )}

                    {/* Search and Add Users */}
                    <div className="mb-6">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Search users by email
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                placeholder="Enter email address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>

                        {/* Default Permission Selector */}
                        {selectedUsers.length > 0 && (
                            <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Default Access Level
                                </label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="defaultPermission"
                                            value="read"
                                            checked={defaultPermission === "read"}
                                            onChange={(e) => setDefaultPermission(e.target.value as "read" | "read-write")}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">Read Only</span>
                                            <p className="text-xs text-gray-500">Can view content but cannot edit</p>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="defaultPermission"
                                            value="read-write"
                                            checked={defaultPermission === "read-write"}
                                            onChange={(e) => setDefaultPermission(e.target.value as "read" | "read-write")}
                                            className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">Edit Access</span>
                                            <p className="text-xs text-gray-500">Can view and edit content</p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-48 overflow-y-auto">
                                {searchResults.map((user) => (
                                    <button
                                        key={user._id}
                                        onClick={() => addUser(user)}
                                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                                    >
                                        <div className="font-medium text-gray-900">{getUserDisplayName(user)}</div>
                                        <div className="text-sm text-gray-500">{user.email}</div>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Selected Users */}
                        {selectedUsers.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium text-gray-700 mb-2">Selected users:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedUsers.map((user) => (
                                        <div
                                            key={user._id}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-full text-sm"
                                        >
                                            <span>{getUserDisplayName(user)}</span>
                                            <button
                                                onClick={() => removeSelectedUser(user._id)}
                                                className="hover:text-indigo-900"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={handleShare}
                                    disabled={sharing}
                                    className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {sharing ? "Sharing..." : `Share with ${selectedUsers.length} user${selectedUsers.length > 1 ? 's' : ''}`}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Shared Users List */}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                            Shared with ({sharedUsers.length})
                        </h3>
                        {loading ? (
                            <div className="text-center py-8 text-gray-500">Loading...</div>
                        ) : sharedUsers.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                                <p className="text-sm">No users have access yet.</p>
                                <p className="text-xs mt-1">Search and add users above to share.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {sharedUsers.map((shared) => (
                                    <div
                                        key={shared.userId._id}
                                        className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-200"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {getUserDisplayName(shared.userId)}
                                            </div>
                                            <div className="text-sm text-gray-500">{shared.userId.email}</div>
                                            <div className="text-xs text-gray-400 mt-1">
                                                Shared {new Date(shared.sharedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* Permission Selector */}
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={shared.permissions}
                                                    onChange={(e) => handleUpdatePermissions(shared.userId._id, e.target.value as "read" | "read-write")}
                                                    disabled={updatingPermissions === shared.userId._id}
                                                    className="text-xs px-2 py-1 border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <option value="read">Read Only</option>
                                                    <option value="read-write">Edit Access</option>
                                                </select>
                                                {updatingPermissions === shared.userId._id && (
                                                    <div className="w-4 h-4 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleRemoveShare(shared.userId._id)}
                                                disabled={removing === shared.userId._id}
                                                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                            >
                                                {removing === shared.userId._id ? "Removing..." : "Remove"}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

