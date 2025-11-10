import { Dispatch, SetStateAction, useEffect, useState, useMemo } from "react";
import { AddContentModal } from "../components/AddContentModal";
import { Button } from "../components/button";
import { PlusIcon, ShareIcon, LogoutIcon, SearchIcon } from "../components/icons";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Card } from "../components/Card";
import { ObjectId } from "mongodb";
import { Logo } from "../components/Logo";
import { useNavigate } from "react-router-dom";
import { ShareModal } from "../components/ShareModal";

export type Type = "youtube" | "twitter" | "document" | "link";

function Dashboard() {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [content, setContent] = useState<{ title: string; link: string; type: Type; _id: ObjectId }[]>([]);
  const [profile, setProfile] = useState<{ username: string; firstName?: string; lastName?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<Type | "all">("all");
  const navigate = useNavigate();

  async function getContent(
    setContent: Dispatch<SetStateAction<{ title: string; link: string; type: Type; _id: ObjectId }[]>>
  ) {
    axios
      .get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: localStorage.getItem("token") || "",
        },
      })
      .then((response) => {
        setContent(response.data.content);
      });
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

  useEffect(() => {
    getContent(setContent);
    // fetch profile for avatar
    const token = localStorage.getItem("token") || "";
    axios
      .get(`${BACKEND_URL}/api/v1/profile`, { headers: { Authorization: token } })
      .then((res) => setProfile(res.data))
      .catch(() => { });
  }, []);

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
          <Button
            variant="primary"
            size="md"
            title="Add Content"
            startIcon={<PlusIcon />}
            onClick={() => setOpen(true)}
          />
          <Button
            variant="secondary"
            size="md"
            title="Share Brain"
            startIcon={<ShareIcon size={4} color="blue-600" />}
            onClick={() => setShareOpen(true)}
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
        <div className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
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
      {open && <AddContentModal setOpen={setOpen} setContent={setContent} />}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} />
    </div>
  );
}

export default Dashboard;
