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
import { ReportContentModal } from "../components/ReportContentModal";
import { ReportsModal } from "../components/ReportsModal";

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export type Type = "youtube" | "twitter" | "document" | "link" | "article" | "note";

type Space = {
  _id: string;
  name: string;
  description?: string;
  shareHash: string | null;
  sharedBy?: {
    _id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  isShared?: boolean;
  permissions?: "read" | "read-write";
};

function Dashboard() {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [content, setContent] = useState<{ title: string; link?: string; type: Type; _id: ObjectId; body?: string }[]>([]);
  const [profile, setProfile] = useState<{ email: string; firstName?: string; lastName?: string } | null>(null);
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
  const [upgrading, setUpgrading] = useState(false);
  const [priceDisplay, setPriceDisplay] = useState("₹499");
  const [priceCurrency, setPriceCurrency] = useState("INR");
  const [paymentsConfigured, setPaymentsConfigured] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
  const [sharedSpaces, setSharedSpaces] = useState<Space[]>([]);
  const [spaceTab, setSpaceTab] = useState<"my" | "shared">("my");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportingContentId, setReportingContentId] = useState<string | null>(null);
  const [reportingContentTitle, setReportingContentTitle] = useState<string | null>(null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSpaceQueryRef = useRef<string | null>(searchParams.get("spaceId"));
  const shareIntentRef = useRef<boolean>(searchParams.get("share") === "1");

  const selectedSpace = useMemo(() => {
    const allSpaces = [...spaces, ...sharedSpaces];
    return allSpaces.find((space) => space._id === selectedSpaceId) || null;
  }, [spaces, sharedSpaces, selectedSpaceId]);
  
  const isSharedSpace = useMemo(() => {
    return selectedSpace?.isShared || false;
  }, [selectedSpace]);

  const canEditSpace = useMemo(() => {
    if (!selectedSpace) return false;
    if (!selectedSpace.isShared) return true;
    return selectedSpace.permissions === "read-write";
  }, [selectedSpace]);

  async function getContent(spaceId?: string | null) {
    if (!spaceId) return;
    try {
      const token = localStorage.getItem("token") || "";
      const response = await axios.get(`${BACKEND_URL}/api/v1/content`, {
        headers: {
          Authorization: token,
        },
        params: {
          spaceId,
        },
      });
      setContent(response.data.content);
    } catch (error) {
      console.error("Failed to load content", error);
      // If it's a shared space, try fetching from shared endpoint
      const sharedSpace = sharedSpaces.find(s => s._id === spaceId);
      if (sharedSpace) {
        // For shared spaces, content should be accessible via the same endpoint
        // The backend should handle permissions
        setContent([]);
      }
    }
  }


  async function Delete(id: ObjectId) {
    await axios.delete(`${BACKEND_URL}/api/v1/content`, {
      data: { id },
      headers: { Authorization: localStorage.getItem("token") || "" },
    });
    setContent((prev) => prev.filter((item) => item._id !== id));
  }

  function openReportModal(id: ObjectId) {
    const item = content.find((c) => c._id === id);
    setReportingContentId(id.toString());
    setReportingContentTitle(item?.title || null);
    setReportOpen(true);
  }

  function closeReportModal() {
    setReportOpen(false);
    setReportingContentId(null);
    setReportingContentTitle(null);
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

  const limitReached = spaceCount >= spaceLimit;
  const upgradeButtonLabel = upgrading
    ? "Processing..."
    : plan === "free"
      ? (paymentsConfigured ? `Upgrade (${priceDisplay})` : "Upgrade")
      : "Upgrade";
  const upgradeDisabled = upgrading || !paymentsConfigured || !razorpayReady;

  async function fetchSpaces() {
    setSpacesLoading(true);
    setSpaceError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.get(`${BACKEND_URL}/api/v1/spaces`, {
        params: { includeShared: "true" },
        headers: { Authorization: token },
      });
      const fetchedSpaces: Space[] = res.data.spaces || [];
      const fetchedSharedSpaces: Space[] = res.data.sharedSpaces || [];
      setSpaces(fetchedSpaces);
      setSharedSpaces(fetchedSharedSpaces);
      setPlan(res.data.plan || "free");
      setSpaceLimit(res.data.limit || 3);
      setSpaceCount(res.data.currentCount || fetchedSpaces.length);
      if (res.data.price) {
        setPriceDisplay(res.data.price.display || `₹${((res.data.price.amount || 0) / 100).toFixed(0)}`);
        setPriceCurrency(res.data.price.currency || "INR");
      }
      setPaymentsConfigured(!!res.data.paymentsConfigured);
      const preferredSpaceId = initialSpaceQueryRef.current;
      const allSpaces = [...fetchedSpaces, ...fetchedSharedSpaces];
      if (preferredSpaceId && allSpaces.some((s) => s._id === preferredSpaceId)) {
        setSelectedSpaceId(preferredSpaceId);
      } else if (selectedSpaceId && allSpaces.some((s) => s._id === selectedSpaceId)) {
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
      if (plan === "pro") {
        setSpaceError("You've reached the space limit for your Pro plan.");
      } else {
        setSpaceError("You've reached the space limit for the free plan. Upgrade to Pro to create more.");
      }
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
      // Refresh spaces to get updated list including shared spaces
      await fetchSpaces();
      setSelectedSpaceId(newSpace._id);
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

  // Refresh spaces when needed (e.g., after creating a new space)
  function refreshSpaces() {
    fetchSpaces();
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
    if (typeof window === "undefined") return;
    const scriptUrl = "https://checkout.razorpay.com/v1/checkout.js";
    let script = document.querySelector(`script[src="${scriptUrl}"]`) as HTMLScriptElement | null;
    const handleLoad = () => setRazorpayReady(true);

    if (script) {
      const alreadyLoaded = script.getAttribute("data-loaded") === "true"
        || typeof window.Razorpay !== "undefined"
        || ("readyState" in script && script.readyState === "complete");
      if (alreadyLoaded) {
        setRazorpayReady(true);
      } else {
        script.addEventListener("load", handleLoad);
      }
      return () => {
        script?.removeEventListener("load", handleLoad);
      };
    }

    script = document.createElement("script");
    script.src = scriptUrl;
    script.async = true;
    script.setAttribute("data-loaded", "false");
    script.onload = () => {
      script?.setAttribute("data-loaded", "true");
      setRazorpayReady(true);
    };
    script.onerror = () => setSpaceError("Unable to load payment gateway. Please refresh and try again.");
    document.body.appendChild(script);

    return () => {
      if (script) {
        script.onload = null;
        script.onerror = null;
      }
    };
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

  async function upgradePlan() {
    if (!paymentsConfigured) {
      setSpaceError("Payments are currently unavailable. Please try again later.");
      return;
    }
    if (!razorpayReady || !window.Razorpay) {
      setSpaceError("Payment gateway is still loading. Please wait a moment and try again.");
      return;
    }
    setUpgrading(true);
    setSpaceError(null);
    setUpgradeMessage(null);
    try {
      const token = localStorage.getItem("token") || "";
      const checkout = await axios.post(`${BACKEND_URL}/api/v1/subscription/checkout`, {}, {
        headers: { Authorization: token }
      });

      const options = {
        key: checkout.data.keyId,
        amount: checkout.data.amount,
        currency: checkout.data.currency || priceCurrency,
        name: "BrainCache Pro",
        description: checkout.data.description || "Unlock premium features & higher space limits",
        order_id: checkout.data.orderId,
        notes: checkout.data.notes || { plan: "pro" },
        prefill: {
          name: checkout.data.customer?.name,
          email: checkout.data.customer?.email,
          contact: checkout.data.customer?.contact
        },
        theme: {
          color: "#6366f1"
        },
        modal: {
          ondismiss: () => {
            setUpgrading(false);
          }
        },
        handler: async (response: any) => {
          try {
            await axios.post(`${BACKEND_URL}/api/v1/subscription/confirm`, {
              orderId: response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature
            }, {
              headers: { Authorization: token }
            });
            setUpgradeMessage("Payment successful! Welcome to the Pro plan.");
            await fetchSpaces();
          } catch (err) {
            console.error(err);
            setSpaceError("Payment captured but subscription update failed. Please contact support with your payment reference.");
          } finally {
            setUpgrading(false);
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on("payment.failed", (resp: any) => {
        setUpgradeMessage(null);
        setSpaceError(resp?.error?.description || "Payment failed. Please try again.");
        setUpgrading(false);
      });
      razorpay.open();
    } catch (e: any) {
      const message = e?.response?.data?.message || "Unable to start payment. Please try again.";
      setSpaceError(message);
      setUpgrading(false);
    }
  }

  // Filter and search logic
  const filteredContent = useMemo(() => {
    return content.filter(item => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.title.toLowerCase().includes(query) ||
        (item.link ? item.link.toLowerCase().includes(query) : false) ||
        (item.body ? item.body.toLowerCase().includes(query) : false);
      const matchesFilter = activeFilter === 'all' || item.type === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [content, searchQuery, activeFilter]);

  const contentTypes: { type: Type | 'all', label: string }[] = [
    { type: 'all', label: 'All Content' },
    { type: 'youtube', label: 'YouTube' },
    { type: 'twitter', label: 'Tweets' },
    { type: 'document', label: 'Documents' },
    { type: 'link', label: 'Links' },
    { type: 'article', label: 'Articles' },
    { type: 'note', label: 'Notes' }
  ];

  return (
    <div className="h-screen w-screen font-sans flex flex-col bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 flex justify-between items-center w-full h-fit py-3 md:py-4 bg-white/80 backdrop-blur-md px-4 md:px-6 border-b border-gray-200/50 shadow-sm">
        <Logo />
        <div className="flex-1 max-w-2xl mx-4 md:mx-8">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 md:pl-4 flex items-center pointer-events-none">
              <SearchIcon className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 md:pl-12 pr-3 md:pr-4 py-2 md:py-2.5 border-2 border-gray-200 rounded-lg md:rounded-xl leading-5 bg-white/90 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all text-xs md:text-sm shadow-sm"
              placeholder="Search content by title or link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden md:flex flex-col text-xs pr-3 md:pr-4 border-r border-gray-200">
            <span className={`font-semibold ${plan === "pro" ? "text-violet-600" : "text-gray-800"}`}>
              {plan === "pro" ? "✨ Pro" : "Free Plan"}
            </span>
            <span className="text-gray-500 text-[10px] mt-0.5">
              {spaceCount}/{spaceLimit} spaces
            </span>
          </div>
          {plan === "free" && (
            <Button
              variant="secondary"
              size="md"
              title={upgradeButtonLabel}
              onClick={upgradePlan}
              disabled={upgradeDisabled}
            />
          )}
          <Button
            variant="secondary"
            size="md"
            title="Reports"
            onClick={() => setReportsOpen(true)}
          />
          <Button
            variant="primary"
            size="md"
            title="Add Content"
            startIcon={<PlusIcon />}
            onClick={() => setOpen(true)}
            disabled={!selectedSpaceId || !canEditSpace}
          />
          <Button
            variant="secondary"
            size="md"
            title="Spaces"
            onClick={() => navigate("/user/spaces")}
          />
          <Button
            variant="secondary"
            size="md"
            title="Share"
            startIcon={<ShareIcon size={4} color="blue-600" />}
            onClick={() => setShareOpen(true)}
            disabled={!selectedSpaceId}
          />
          <img
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
              `${profile?.firstName || ""} ${profile?.lastName || profile?.email || "User"}`.trim()
            )}`}
            alt="Profile"
            title="Profile"
            className="w-8 h-8 md:w-10 md:h-10 rounded-full cursor-pointer border-2 border-gray-200 hover:border-violet-400 transition-colors shadow-sm"
            onClick={() => navigate("/user/profile")}
          />
          <Button
            variant="danger"
            size="sm"
            title="Logout"
            startIcon={<LogoutIcon />}
            onClick={logout}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-72 md:w-80 bg-white/60 backdrop-blur-sm border-r border-gray-200/50 overflow-y-auto shadow-sm">
          <div className="p-4 md:p-5">
            <h2 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Content Types</h2>
            <nav className="space-y-2">
              {contentTypes.map((item) => {
                const count = item.type === 'all'
                  ? content.length
                  : content.filter(c => c.type === item.type).length;
                return (
                  <button
                    key={item.type}
                    onClick={() => setActiveFilter(item.type)}
                    className={`w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg transition-all ${activeFilter === item.type
                        ? 'bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-700 border-l-4 border-violet-500 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent'
                      }`}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className={`ml-auto inline-block py-0.5 px-2 text-xs rounded-full font-semibold ${activeFilter === item.type
                        ? 'bg-violet-100 text-violet-700'
                        : 'bg-gray-100 text-gray-600'
                      }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 md:p-5 border-b border-gray-200/50 bg-gradient-to-br from-white to-gray-50/50">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h2 className="text-lg md:text-xl font-bold text-gray-900">Spaces</h2>
              {spaceTab === "my" && (
                <button
                  className={`text-sm font-semibold px-3 py-1.5 rounded-lg transition-all ${limitReached && !showSpaceForm
                      ? "text-gray-400 cursor-not-allowed bg-gray-100"
                      : "text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                    }`}
                  onClick={() => {
                    if (limitReached && !showSpaceForm) {
                      if (plan === "pro") {
                        setSpaceError("You've reached the space limit for your Pro plan.");
                      } else {
                        setSpaceError("Upgrade to Pro to create more spaces.");
                      }
                      return;
                    }
                    setShowSpaceForm((prev) => !prev);
                  }}
                  disabled={limitReached && !showSpaceForm}
                >
                  {showSpaceForm ? "✕ Close" : "+ New"}
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="mb-3 md:mb-4 flex gap-2 border-b border-gray-200">
              <button
                onClick={() => setSpaceTab("my")}
                className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  spaceTab === "my"
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                My Spaces ({spaces.length})
              </button>
              <button
                onClick={() => setSpaceTab("shared")}
                className={`flex-1 px-2 md:px-3 py-1.5 md:py-2 text-xs md:text-sm font-medium border-b-2 transition-colors ${
                  spaceTab === "shared"
                    ? "border-violet-600 text-violet-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Shared ({sharedSpaces.length})
              </button>
            </div>
            {spaceError && (
              <div className="text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-3 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-red-500">⚠</span>
                  <span>{spaceError}</span>
                </div>
              </div>
            )}
            {upgradeMessage && (
              <div className="text-sm text-green-700 bg-green-50 border-l-4 border-green-400 rounded-lg p-3 mb-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span>{upgradeMessage}</span>
                </div>
              </div>
            )}
            {!paymentsConfigured && plan === "free" && (
              <div className="mb-4 rounded-xl bg-amber-50 border-l-4 border-amber-400 px-4 py-3 text-sm text-amber-900 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-amber-600 font-semibold">ℹ</span>
                  <span>Payments are not yet configured. Please contact support to upgrade to Pro.</span>
                </div>
              </div>
            )}
            {showSpaceForm && (
              <div className="mb-4 space-y-3 p-4 bg-white rounded-xl border-2 border-gray-200 shadow-sm">
                <input
                  type="text"
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                  placeholder="Space name"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  maxLength={60}
                />
                <textarea
                  className="w-full border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none"
                  placeholder="Description (optional)"
                  value={newSpaceDescription}
                  onChange={(e) => setNewSpaceDescription(e.target.value)}
                  maxLength={240}
                  rows={2}
                />
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="secondary" size="sm" title="Cancel" onClick={() => { setShowSpaceForm(false); setNewSpaceName(""); setNewSpaceDescription(""); }} />
                  <Button variant="primary" size="sm" title={creatingSpace ? "Creating..." : "Create"} onClick={handleCreateSpace} disabled={creatingSpace || !newSpaceName.trim()} />
                </div>
              </div>
            )}
            <div className="space-y-2">
              {spacesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500">Loading spaces...</span>
                  </div>
                </div>
              ) : spaceTab === "my" ? (
                spaces.length > 0 ? (
                  spaces.map((space) => (
                    <button
                      key={space._id}
                      onClick={() => handleSpaceSelect(space._id)}
                      className={`w-full flex items-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm rounded-lg border-2 transition-all ${selectedSpaceId === space._id
                          ? "border-violet-500 bg-gradient-to-r from-violet-50 to-indigo-50 text-violet-900 shadow-md"
                          : "border-transparent text-gray-700 hover:bg-white hover:border-gray-200 hover:shadow-sm"
                        }`}
                    >
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-semibold truncate mb-0.5">{space.name}</div>
                        {space.description && (
                          <div className="text-[10px] md:text-xs text-gray-500 truncate">{space.description}</div>
                        )}
                      </div>
                      {space.shareHash && (
                        <span className="flex-shrink-0 text-[9px] md:text-[10px] uppercase tracking-wide text-green-700 bg-green-100 px-1.5 md:px-2 py-0.5 rounded-full font-semibold border border-green-200">
                          Public
                        </span>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p>No spaces yet.</p>
                    <p className="text-xs mt-1">Create one to get started</p>
                  </div>
                )
              ) : (
                sharedSpaces.length > 0 ? (
                  sharedSpaces.map((space) => {
                    const ownerLabel = space.sharedBy 
                      ? (() => {
                          const fullName = `${space.sharedBy.firstName || ""} ${space.sharedBy.lastName || ""}`.trim();
                          const email = space.sharedBy.email;
                          if (fullName && email) return `${fullName} (${email})`;
                          return email || fullName || "Unknown";
                        })()
                      : "Unknown";
                    return (
                      <button
                        key={space._id}
                        onClick={() => handleSpaceSelect(space._id)}
                        className={`w-full flex items-start gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm rounded-lg border-2 transition-all ${selectedSpaceId === space._id
                            ? "border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-900 shadow-md"
                            : "border-transparent text-gray-700 hover:bg-white hover:border-gray-200 hover:shadow-sm"
                          }`}
                      >
                        <div className="flex-1 text-left min-w-0">
                          <div className="font-semibold truncate mb-0.5">{space.name}</div>
                          {space.description && (
                            <div className="text-[10px] md:text-xs text-gray-500 truncate">{space.description}</div>
                          )}
                          <div className="text-[10px] md:text-xs text-indigo-600 mt-1">by {ownerLabel}</div>
                        </div>
                        <span className="flex-shrink-0 text-[9px] md:text-[10px] uppercase tracking-wide text-indigo-700 bg-indigo-100 px-1.5 md:px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                          Shared
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <p>No shared spaces.</p>
                    <p className="text-xs mt-1">Spaces shared with you will appear here</p>
                  </div>
                )
              )}
            </div>
          </div>

        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-gradient-to-br from-gray-50/50 to-white">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                {activeFilter === 'all' ? 'All Content' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}s`}
                {searchQuery && (
                  <span className="text-lg md:text-xl font-normal text-gray-500 ml-2">
                    matching "{searchQuery}"
                  </span>
                )}
              </h1>
              {selectedSpace && (
                <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg border ${isSharedSpace 
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200" 
                  : "bg-violet-100 text-violet-700 border-violet-200"
                }`}>
                  <span className="text-xs md:text-sm font-semibold">{selectedSpace.name}</span>
                  {isSharedSpace && selectedSpace.sharedBy && (() => {
                    const fullName = `${selectedSpace.sharedBy.firstName || ""} ${selectedSpace.sharedBy.lastName || ""}`.trim();
                    const email = selectedSpace.sharedBy.email;
                    const label = fullName && email ? `${fullName} (${email})` : (email || fullName);
                    return label ? (
                      <span className="text-[10px] md:text-xs ml-2 opacity-75">
                        by {label}
                      </span>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
            <p className="text-xs md:text-sm text-gray-600 flex items-center gap-2">
              <span className="font-medium">{filteredContent.length}</span>
              <span>{filteredContent.length === 1 ? 'item' : 'items'} found</span>
              {searchQuery && (
                <span className="text-gray-400">•</span>
              )}
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-violet-600 hover:text-violet-700 font-medium text-xs underline"
                >
                  Clear search
                </button>
              )}
            </p>
          </div>

          {!selectedSpaceId ? (
            <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center bg-white rounded-xl md:rounded-2xl border-2 border-dashed border-gray-300">
              <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-xl md:rounded-2xl flex items-center justify-center">
                <span className="text-3xl md:text-4xl">📁</span>
              </div>
              <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">No Space Selected</h3>
              <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 max-w-md px-4">
                Select a space from the sidebar or create a new one to start adding content.
              </p>
              <Button
                variant="primary"
                size="md"
                title="Create New Space"
                startIcon={<PlusIcon />}
                onClick={() => setShowSpaceForm(true)}
              />
            </div>
          ) : (
            <>
              {filteredContent.length > 0 ? (
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-3 2xl:columns-3 gap-4 md:gap-6">
                  {filteredContent.map((item, index) => (
                    <div
                      key={index}
                      className="mb-4 break-inside-avoid transform transition-all duration-300 hover:-translate-y-1"
                    >
                      <Card
                        onDelete={canEditSpace ? Delete : undefined}
                        onReport={openReportModal}
                        title={item.title}
                        link={item.link}
                        body={item.body}
                        type={item.type}
                        _id={item._id}
                        readOnly={!canEditSpace}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="col-span-full flex flex-col items-center justify-center py-12 md:py-16 text-center bg-white rounded-xl md:rounded-2xl border-2 border-dashed border-gray-300">
                  <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-3 md:mb-4 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl md:rounded-2xl flex items-center justify-center">
                    {searchQuery ? (
                      <SearchIcon className="h-8 w-8 md:h-10 md:w-10 text-gray-400" />
                    ) : (
                      <span className="text-3xl md:text-4xl">📄</span>
                    )}
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
                    {searchQuery
                      ? 'No matches found'
                      : activeFilter === 'all'
                        ? 'No content yet'
                        : `No ${activeFilter} content`}
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6 max-w-md px-4">
                    {searchQuery
                      ? `No content matches "${searchQuery}". Try a different search term.`
                      : activeFilter === 'all'
                        ? 'Start building your knowledge base by adding your first piece of content.'
                        : `You haven't added any ${activeFilter} content yet.`}
                  </p>
                  {!searchQuery && (
                    <Button
                      variant="primary"
                      size="md"
                      title="Add Content"
                      startIcon={<PlusIcon />}
                      onClick={() => setOpen(true)}
                      disabled={!canEditSpace}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Add Content Modal */}
      {open && <AddContentModal setOpen={setOpen} setContent={setContent} spaceId={selectedSpaceId} spaceName={selectedSpace?.name} />}
      <ShareModal 
        open={shareOpen} 
        onClose={() => setShareOpen(false)} 
        spaceId={selectedSpaceId} 
        spaceName={selectedSpace?.name} 
        onShareChange={handleShareChange}
        isSpaceOwner={!selectedSpace?.isShared || false}
      />
      {reportsOpen && (
        <ReportsModal
          open={reportsOpen}
          onClose={() => setReportsOpen(false)}
        />
      )}
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

export default Dashboard;
