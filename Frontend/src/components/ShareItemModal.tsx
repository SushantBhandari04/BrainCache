import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { CrossIcon } from "./icons";
import { ShareWithUsersModal } from "./ShareWithUsersModal";

const WhatsappBadge = () => (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/10 text-green-600">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 2C6.486 2 2 6.186 2 11.333c0 1.764.508 3.403 1.381 4.813L2 22l6.067-1.91c1.222.417 2.527.645 3.933.645 5.514 0 10-4.187 10-9.333C22 6.186 17.514 2 12 2Zm0 16.667c-1.27 0-2.45-.247-3.527-.697l-.252-.104-3.607 1.134 1.184-3.297-.163-.254C5.33 14.23 4.667 12.83 4.667 11.333 4.667 7.675 8.01 4.667 12 4.667c3.99 0 7.333 3.008 7.333 6.666 0 3.658-3.343 6.667-7.333 6.667Zm4.01-4.516c-.217-.109-1.283-.63-1.482-.702-.198-.074-.343-.11-.486.109-.143.219-.557.702-.682.846-.125.146-.249.164-.466.055-.217-.109-.916-.336-1.742-1.073-.644-.574-1.078-1.283-1.203-1.502-.125-.219-.013-.337.094-.445.097-.097.217-.252.326-.378.109-.126.145-.218.218-.364.074-.147.036-.274-.018-.383-.055-.109-.486-1.17-.666-1.606-.175-.421-.353-.364-.486-.371-.126-.007-.272-.009-.417-.009-.146 0-.382.055-.583.274-.201.218-.766.748-.766 1.824s.785 2.118.894 2.264c.109.146 1.544 2.459 3.763 3.343 2.219.884 2.219.588 2.621.552.401-.036 1.283-.521 1.464-1.026.18-.505.18-.938.125-1.027-.055-.092-.199-.145-.416-.254Z" />
        </svg>
    </span>
);

const TelegramBadge = () => (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-sky-500/10 text-sky-600">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M21.447 4.104c-.2-.16-.462-.19-.696-.09L3.22 11.28c-.268.115-.447.37-.46.664-.014.294.143.564.402.696l4.803 2.407v4.33c0 .318.2.598.5.703.078.027.158.04.237.04.225 0 .444-.096.597-.27l2.623-2.94 4.525 2.182c.11.053.23.08.35.08.133 0 .266-.032.386-.097.22-.118.38-.33.428-.576l2.236-11.512c.055-.287-.06-.582-.29-.756Zm-3.512 11.156-3.42-1.647c-.125-.059-.257-.088-.387-.088-.214 0-.426.082-.587.24l-1.889 1.889v-2.705l6.788-4.189-10.073 3.976-3.214-1.61 14.908-6.366-2.126 10.5Z" />
        </svg>
    </span>
);

const MailBadge = () => (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-600">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.103.897 2 2 2h16a2 2 0 0 0 2-2V6c0-1.103-.897-2-2-2Zm0 2v.511l-8 5.333-8-5.333V6h16ZM4 18V8.689l7.445 4.966a1 1 0 0 0 1.11 0L20 8.689V18H4Z" />
        </svg>
    </span>
);

const SystemBadge = () => (
    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-500/10 text-purple-600">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M18 2h-4.586A1.994 1.994 0 0 0 12 1a1.994 1.994 0 0 0-1.414 1H6c-1.654 0-3 1.346-3 3v12c0 1.654 1.346 3 3 3h3v2h2v-2h2v2h2v-2h3c1.654 0 3-1.346 3-3V5c0-1.654-1.346-3-3-3Zm1 15c0 .552-.449 1-1 1H6c-.551 0-1-.448-1-1V5c0-.552.449-1 1-1h4.586A1.994 1.994 0 0 0 12 5c.37 0 .707-.105 1-.273V4h4c.551 0 1 .448 1 1v12ZM9 17h6v-2H9v2Zm0-4h6v-2H9v2Zm0-4h6V7H9v2Z" />
        </svg>
    </span>
);

const LinkBadge = () => (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gray-900 text-white">
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M13 6h-2v2h2c1.654 0 3 1.346 3 3s-1.346 3-3 3h-2v2h2c2.757 0 5-2.243 5-5s-2.243-5-5-5Zm-4 8c-1.654 0-3-1.346-3-3s1.346-3 3-3h2V6H9c-2.757 0-5 2.243-5 5s2.243 5 5 5h2v-2H9Z" />
        </svg>
    </span>
);

interface ShareItemModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function ShareItemModal({ open, onClose, itemId, itemTitle }: ShareItemModalProps) {
  const [isShared, setIsShared] = useState<boolean>(false);
  const [shareHash, setShareHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"link" | "users">("link");
  const [userShareModalOpen, setUserShareModalOpen] = useState(false);

  const shareLink = useMemo(
    () => (shareHash ? `${window.location.origin}/share/${shareHash}` : ""),
    [shareHash]
  );

  const shareTitle = useMemo(() => `Check out "${itemTitle}" on BrainCache`, [itemTitle]);
  const canUseNativeShare = typeof window !== "undefined" && typeof (navigator as Navigator & { share?: Navigator["share"] | undefined }).share === "function";

  useEffect(() => {
    if (open && itemId) {
      fetchShareState();
    } else if (open && !itemId) {
      setIsShared(false);
      setShareHash(null);
    }
  }, [open, itemId]);

  async function fetchShareState() {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.get(`${BACKEND_URL}/api/v1/content/${itemId}/share`, {
        headers: { Authorization: token }
      });
      setIsShared(res.data.shared);
      setShareHash(res.data.hash);
    } catch (e) {
      setError("Failed to load sharing status.");
      setIsShared(false);
      setShareHash(null);
    } finally {
      setLoading(false);
    }
  }

  async function updateSharing(share: boolean) {
    if (!itemId) return;
    setUpdating(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.post(`${BACKEND_URL}/api/v1/content/${itemId}/share`, { share }, {
        headers: { Authorization: token }
      });
      if (share) {
        setIsShared(true);
        setShareHash(res.data.hash);
      } else {
        setIsShared(false);
        setShareHash(null);
      }
    } catch (e) {
      setError("Failed to update sharing.");
    } finally {
      setUpdating(false);
    }
  }

  function copyLink() {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    alert("Share link copied.");
  }

  async function nativeShare() {
    if (!shareLink || !navigator.share) return;
    try {
      await navigator.share({
        title: shareTitle,
        text: "Here's a BrainCache content item I wanted to share with you.",
        url: shareLink
      });
    } catch (e) {
      console.error("Native share failed/cancelled", e);
    }
  }

  function shareViaWhatsApp() {
    if (!shareLink) return;
    const text = encodeURIComponent(`${shareTitle}\n${shareLink}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  }

  function shareViaEmail() {
    if (!shareLink) return;
    const subject = encodeURIComponent(shareTitle);
    const body = encodeURIComponent(`Hi,\n\nTake a look at this BrainCache content:\n${shareLink}\n\nThanks!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  }

  function shareViaTelegram() {
    if (!shareLink) return;
    const text = encodeURIComponent(`${shareTitle}\n${shareLink}`);
    window.open(`https://t.me/share/url?url=${encodeURIComponent(shareLink)}&text=${text}`, "_blank", "noopener,noreferrer");
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/35 backdrop-blur-sm flex justify-center items-center z-50 px-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Share</p>
            <h2 className="text-2xl font-semibold text-gray-900 mt-1">Share this content</h2>
          </div>
          <CrossIcon onClick={onClose} />
        </div>

        <div className="p-6">
          {itemId ? (
            <>
              <div className="mb-6 flex flex-col gap-2">
                <p className="text-xs uppercase tracking-wide text-gray-500 font-medium">Content</p>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{itemTitle || "Untitled content"}</h3>
                    <p className="text-gray-500 text-sm">Share this content item with others.</p>
                  </div>
                  {isShared ? (
                    <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-green-700 bg-green-100 rounded-full">Live</span>
                  ) : (
                    <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-gray-500 bg-gray-100 rounded-full">Offline</span>
                  )}
                </div>
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 mb-4">{error}</div>}

              {/* Tabs */}
              <div className="mb-6 flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("link")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "link"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Public Link
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "users"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Share with Users
                </button>
              </div>

              {activeTab === "users" ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-indigo-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Share with Application Users</h3>
                  <p className="text-gray-600 text-sm mb-6">Share this content directly with other BrainCache users. They'll see it in their dashboard.</p>
                  <button
                    onClick={() => setUserShareModalOpen(true)}
                    className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white px-6 py-2 font-semibold shadow-sm hover:bg-indigo-700 transition"
                  >
                    Manage Users
                  </button>
                </div>
              ) : (
                <>
                  {loading ? (
                    <div className="text-gray-500 text-sm">Loading share status...</div>
                  ) : isShared ? (
                <>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-3">
                      <LinkBadge />
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wide text-gray-500 font-semibold">Link</p>
                        <p className="text-sm text-gray-700 break-all font-medium">{shareLink}</p>
                      </div>
                      <button onClick={copyLink} className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <button onClick={shareViaWhatsApp} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:bg-green-50 transition-all">
                      <WhatsappBadge />
                      <span className="text-sm font-semibold text-gray-800">WhatsApp</span>
                      <span className="text-xs text-gray-500">Share chat invite</span>
                    </button>
                    <button onClick={shareViaTelegram} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-sky-300 hover:bg-sky-50 transition-all">
                      <TelegramBadge />
                      <span className="text-sm font-semibold text-gray-800">Telegram</span>
                      <span className="text-xs text-gray-500">Send to channels</span>
                    </button>
                    <button onClick={shareViaEmail} className="flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:bg-indigo-50 transition-all">
                      <MailBadge />
                      <span className="text-sm font-semibold text-gray-800">Email</span>
                      <span className="text-xs text-gray-500">Send via mail</span>
                    </button>
                    <button onClick={nativeShare} disabled={!canUseNativeShare} className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-gray-200 p-4 transition-all ${canUseNativeShare ? "hover:border-purple-300 hover:bg-purple-50" : "opacity-50 cursor-not-allowed"}`}>
                      <SystemBadge />
                      <span className="text-sm font-semibold text-gray-800">More</span>
                      <span className="text-xs text-gray-500">Device share sheet</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-gray-900 text-white rounded-2xl px-6 py-4">
                    <div>
                      <p className="text-sm text-gray-300">Need to take it offline?</p>
                      <p className="text-lg font-semibold">Stop sharing this content</p>
                    </div>
                    <button onClick={() => updateSharing(false)} disabled={updating} className="bg-white text-gray-900 font-semibold rounded-full px-4 py-2 shadow-sm hover:bg-gray-100 transition">
                      Disable sharing
                    </button>
                  </div>
                </>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-900/10 text-gray-900 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                      <path d="M19 2H9c-1.103 0-2 .897-2 2v2H5c-1.103 0-2 .897-2 2v12c0 1.103.897 2 2 2h10c1.103 0 2-.897 2-2v-2h2c1.103 0 2-.897 2-2V4c0-1.103-.897-2-2-2Zm-4 18H5V8h10v12Zm4-4h-2V8c0-1.103-.897-2-2-2h-8V4h12v12Z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Content is private</h3>
                  <p className="text-gray-600 text-sm mb-5">Enable sharing to generate a private link that you can send to others.</p>
                  <button onClick={() => updateSharing(true)} disabled={updating} className="inline-flex items-center justify-center rounded-full bg-blue-600 text-white px-6 py-2 font-semibold shadow-sm hover:bg-blue-700 transition">
                    {updating ? "Enabling..." : "Enable sharing"}
                  </button>
                </div>
              )}
                </>
              )}
            </>
          ) : (
            <div className="text-center text-gray-600">
              <p className="text-sm">No content selected to share.</p>
            </div>
          )}
        </div>
      </div>

      <ShareWithUsersModal
        open={userShareModalOpen}
        onClose={() => setUserShareModalOpen(false)}
        resourceType="content"
        resourceId={itemId}
        resourceName={itemTitle}
      />
    </div>
  );
}
