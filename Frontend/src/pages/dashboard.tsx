import { useEffect, useState, useMemo, useRef } from "react";
import { AddContentModal } from "../components/AddContentModal";
import { Button } from "../components/button";
import { PlusIcon, ShareIcon, LogoutIcon, SearchIcon } from "../components/icons";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Card } from "../components/Card";
import { ObjectId } from "mongodb";
import { Logo } from "../components/Logo";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShareModal } from "../components/ShareModal";

export type Type = "youtube" | "twitter" | "document" | "link";

type Space = {
  _id: string;
  name: string;
  description?: string;
  shareHash: string | null;
};

function Dashboard() {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [content, setContent] = useState<{ title: string; link: string; type: Type; _id: ObjectId }[]>([]);
  const [profile, setProfile] = useState<{ username: string; firstName?: string; lastName?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Type | "all">("all");
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(true);
  const [spaceError, setSpaceError] = useState<string | null>(null);
  const [selectedSpaceId, setSelectedSpaceId] = useState<string | null>(null);
  const [showSpaceForm, setShowSpaceForm] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");
  const [newSpaceDescription, setNewSpaceDescription] = useState("");
  const [creatingSpace, setCreatingSpace] = useState(false);
  const [plan, setPlan] = useState<"free" | "pro">("free");
  const [spaceLimit, setSpaceLimit] = useState(3);
  const [spaceCount, setSpaceCount] = useState(0);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSpaceQueryRef = useRef<string | null>(searchParams.get("spaceId"));
  const shareIntentRef = useRef<boolean>(searchParams.get("share") === "1");

  const selectedSpace = useMemo(() => spaces.find((space) => space._id === selectedSpaceId) || null, [spaces, selectedSpaceId]);

  async function getContent(spaceId?: string | null) {
    if (!spaceId) return;
    try {
      const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: localStorage.getItem("token") || "",
        },
        params: {
          spaceId,
        },
      });
      setContent(response.data.content);
    } catch (error) {
      console.error("Failed to load content", error);
    }
  }

  async function Delete(id: ObjectId) {
    await axios.delete(`${BACKEND_URL}/api/v1/content`, {
      data: { id },
      headers: { Authorization: localStorage.getItem("token") || "" },
    });
    setContent((prev) => prev.filter((item) => item._id !== id));
  }

  // sharing actions handled inside ShareModal

  // stopSharing moved into ShareModal

  // Logout function
  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  function updateSpaceQueryParam(spaceId: string | null, replace = false) {
    const params = new URLSearchParams(searchParams);
    if (spaceId) {
      params.set("spaceId", spaceId);
    } else {
      params.delete("spaceId");
    }
    if (!shareOpen && !shareIntentRef.current) {
      params.delete("share");
    }
    setSearchParams(params, { replace });
  }

  const limitReached = plan !== "pro" && spaceCount >= spaceLimit;

  async function fetchSpaces() {
    setSpacesLoading(true);
    setSpaceError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.get(`${BACKEND_URL}/api/v1/spaces`, {
        headers: { Authorization: token },
      });
      const fetchedSpaces: Space[] = res.data.spaces || [];
      setSpaces(fetchedSpaces);
      setPlan(res.data.plan || "free");
      setSpaceLimit(res.data.limit || 3);
      setSpaceCount(res.data.currentCount || fetchedSpaces.length);
      const preferredSpaceId = initialSpaceQueryRef.current;
      if (preferredSpaceId && fetchedSpaces.some((s) => s._id === preferredSpaceId)) {
        setSelectedSpaceId(preferredSpaceId);
      } else if (selectedSpaceId && fetchedSpaces.some((s) => s._id === selectedSpaceId)) {
        // keep current selection
      } else if (fetchedSpaces.length) {
        setSelectedSpaceId(fetchedSpaces[0]._id);
        updateSpaceQueryParam(fetchedSpaces[0]._id, true);
      } else {
        setSelectedSpaceId(null);
        updateSpaceQueryParam(null, true);
      }
    } catch (error) {
      console.error("Failed to load spaces", error);
      setSpaceError("Failed to load spaces. Please try again.");
    } finally {
      setSpacesLoading(false);
    }
  }

  async function handleCreateSpace() {
    if (!newSpaceName.trim()) return;
    if (limitReached) {
      setSpaceError("You've reached the free-plan space limit. Upgrade to add more.");
      return;
    }
    setCreatingSpace(true);
    setSpaceError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/spaces`,
        {
          name: newSpaceName.trim(),
          description: newSpaceDescription.trim() ? newSpaceDescription.trim() : undefined,
        },
        {
          headers: { Authorization: token },
        }
      );
      const newSpace = res.data.space as Space;
      setSpaces((prev) => [...prev, newSpace]);
      setSelectedSpaceId(newSpace._id);
      setSpaceCount((prev) => prev + 1);
      updateSpaceQueryParam(newSpace._id);
      setShowSpaceForm(false);
      setNewSpaceName("");
      setNewSpaceDescription("");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to create space.";
      setSpaceError(message);
    } finally {
      setCreatingSpace(false);
    }
  }

  function handleSpaceSelect(spaceId: string) {
    setSelectedSpaceId(spaceId);
    updateSpaceQueryParam(spaceId);
  }

  function handleShareChange(spaceId: string, hash: string | null) {
    setSpaces((prev) =>
      prev.map((space) => (space._id === spaceId ? { ...space, shareHash: hash } : space))
    );
  }

  useEffect(() => {
    fetchSpaces();
    const token = localStorage.getItem("token") || "";
    axios
      .get(`${BACKEND_URL}/api/v1/profile`, { headers: { Authorization: token } })
      .then((res) => setProfile(res.data))
      .catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedSpaceId) {
      getContent(selectedSpaceId);
    }
  }, [selectedSpaceId]);

  useEffect(() => {
    if (shareIntentRef.current && selectedSpaceId) {
      setShareOpen(true);
      shareIntentRef.current = false;
      const params = new URLSearchParams(window.location.search);
      params.delete("share");
      const newSearch = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${newSearch ? `?${newSearch}` : ""}`);
    }
  }, [selectedSpaceId]);

  // Filter and search logic
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.link.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [content, searchQuery, activeFilter]);

  const contentTypes: { type: Type | 'all', label: string }[] = [
    { type: 'all', label: 'All Content' },
    { type: 'youtube', label: 'YouTube' },
    { type: 'twitter', label: 'Tweets' },
    { type: 'document', label: 'Documents' },
    { type: 'link', label: 'Links' }
  ];

  return (
    <div className="h-screen w-screen font-sans flex flex-col">
      {/* Top Bar */}
      <div className="flex justify-between items-center w-full h-fit py-4 bg-gray-100 px-6 border-b border-gray-200">
        <Logo />
        <div className="flex-1 max-w-xl mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <SearchIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="hidden md:flex flex-col text-xs text-gray-500 mr-4">
            <span className="font-semibold text-gray-800">{plan === "pro" ? "Pro Plan" : "Free Plan"}</span>
            <span>{spaceCount}/{spaceLimit}{plan === "pro" ? "+" : ""} spaces used</span>
          </div>
          {plan === "free" && (
            <Button
              variant="secondary"
              size="md"
              title="Upgrade"
              onClick={() => navigate("/user/spaces")}
            />
          )}
          <Button
            variant="primary"
            size="md"
            title="Add Content"
            startIcon={<PlusIcon />}
            onClick={() => setOpen(true)}
            disabled={!selectedSpaceId}
          />
          <Button
            variant="secondary"
            size="md"
            title="Manage Spaces"
            onClick={() => navigate("/user/spaces")}
          />
          <Button
            variant="secondary"
            size="md"
            title="Share Space"
            startIcon={<ShareIcon size={4} color="blue-600" />}
            onClick={() => setShareOpen(true)}
            disabled={!selectedSpaceId}
          />
          <Button
            variant="danger"
            size="md"
            title="Logout"
            startIcon={<LogoutIcon />}
            onClick={logout}
          />
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              `${profile?.firstName || ""} ${profile?.lastName || profile?.username || "User"}`.trim()
            )}`}
            alt="Profile"
            title="Profile"
            className="w-10 h-10 rounded-full cursor-pointer bg-red-500"
            onClick={() => navigate("/user/profile")}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium text-gray-900">Spaces</h2>
              <button
                className={`text-sm font-medium ${limitReached && !showSpaceForm ? "text-gray-400 cursor-not-allowed" : "text-blue-600 hover:underline"}`}
                onClick={() => {
                  if(limitReached && !showSpaceForm){
                    setSpaceError("Upgrade to Pro to create more spaces.");
                    return;
                  }
                  setShowSpaceForm((prev) => !prev);
                }}
                disabled={limitReached && !showSpaceForm}
              >
                {showSpaceForm ? "Close" : "New"}
              </button>
            </div>
            {spaceError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2 mb-3">{spaceError}</div>}
            {showSpaceForm && (
              <div className="mb-4 space-y-2">
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Space name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  maxLength={60}
                />
                <textarea
                  className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Description (optional)"
                  value={newSpaceDescription}
                  onChange={(e) => setNewSpaceDescription(e.target.value)}
                  maxLength={240}
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" title="Cancel" onClick={() => { setShowSpaceForm(false); setNewSpaceName(""); setNewSpaceDescription(""); }} />
                  <Button variant="primary" size="sm" title={creatingSpace ? "Creating..." : "Create"} onClick={handleCreateSpace} disabled={creatingSpace || !newSpaceName.trim()} />
                </div>
              </div>
            )}
            <div className="space-y-1">
              {spacesLoading ? (
                <div className="text-sm text-gray-500">Loading spaces...</div>
              ) : spaces.length ? (
                spaces.map((space) => (
                  <button
                    key={space._id}
                    onClick={() => handleSpaceSelect(space._id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-sm rounded-lg border ${selectedSpaceId === space._id ? "border-blue-500 bg-blue-50 text-blue-900" : "border-transparent text-gray-700 hover:bg-white"}`}
                  >
                    <div className="flex-1 text-left">
                      <div className="font-semibold truncate">{space.name}</div>
                      {space.description && <div className="text-xs text-gray-500 truncate">{space.description}</div>}
                    </div>
                    {space.shareHash && (
                      <span className="text-[10px] uppercase tracking-wide text-green-600 font-semibold">Shared</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-sm text-gray-500">No spaces yet.</div>
              )}
            </div>
          </div>
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Content Types</h2>
            <nav className="space-y-1">
              {contentTypes.map((item) => (
                <button
                  key={item.type}
                  onClick={() => setActiveFilter(item.type)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                    activeFilter === item.type
                      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className="truncate">{item.label}</span>
                  <span className="ml-auto inline-block py-0.5 px-2 text-xs rounded-full bg-gray-100">
                    {item.type === 'all' 
                      ? content.length 
                      : content.filter(c => c.type === item.type).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {activeFilter === 'all' ? 'All Content' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}s`}
              {searchQuery && ` matching "${searchQuery}"`}
            </h1>
            <p className="text-sm text-gray-500">
              {filteredContent.length} {filteredContent.length === 1 ? 'item' : 'items'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredContent.length > 0 ? (
              filteredContent.map((item, index) => (
                <Card
                  onDelete={Delete}
                  key={index}
                  title={item.title}
                  link={item.link}
                  type={item.type}
                  _id={item._id}
                />
              ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-gray-500 text-lg">
                  {searchQuery 
                    ? 'No content matches your search.'
                    : activeFilter === 'all'
                      ? 'No content added yet.'
                      : `No ${activeFilter} content found.`}
                </p>
                <button
                  onClick={() => setOpen(true)}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Add Content
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Content Modal */}
      {open && <AddContentModal setOpen={setOpen} setContent={setContent} spaceId={selectedSpaceId} spaceName={selectedSpace?.name} />}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} spaceId={selectedSpaceId} spaceName={selectedSpace?.name} onShareChange={handleShareChange} />
    </div>
  );
}

export default Dashboard;
