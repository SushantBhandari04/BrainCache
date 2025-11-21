import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";

interface ShareItemModalProps {
  open: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function ShareItemModal({ open, onClose, itemId, itemTitle }: ShareItemModalProps) {
  const [isShared, setIsShared] = useState<boolean>(false);
  const [shareHash, setShareHash] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shareLink = useMemo(
    () => (shareHash ? `${window.location.origin}/share/${shareHash}` : ""),
    [shareHash]
  );

  useEffect(() => {
    if (open) {
      checkShareStatus();
    }
  }, [open]);

  async function checkShareStatus() {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${BACKEND_URL}/api/v1/content/${itemId}/share`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      setIsShared(response.data.shared);
      if (response.data.hash) {
        setShareHash(response.data.hash);
      }
    } catch (err) {
      console.error("Error checking share status:", err);
      setError("Failed to check share status");
    } finally {
      setIsLoading(false);
    }
  }

  async function toggleSharing() {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      if (isShared) {
        // Disable sharing
        await axios.post(
          `${BACKEND_URL}/api/v1/content/${itemId}/share`,
          { share: false },
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        setIsShared(false);
        setShareHash(null);
      } else {
        // Enable sharing
        const response = await axios.post(
          `${BACKEND_URL}/api/v1/content/${itemId}/share`,
          { share: true },
          {
            headers: {
              Authorization: `${token}`,
            },
          }
        );
        setIsShared(true);
        setShareHash(response.data.hash);
      }
      setError(null);
    } catch (err) {
      console.error("Error toggling sharing:", err);
      setError("Failed to update sharing settings");
    } finally {
      setIsLoading(false);
    }
  }

  function copyToClipboard() {
    if (!shareLink) return;
    
    navigator.clipboard.writeText(shareLink).then(
      () => {
        // Show a success message or tooltip
        const button = document.getElementById("copy-button");
        if (button) {
          const originalText = button.textContent;
          button.textContent = "Copied!";
          setTimeout(() => {
            if (button) button.textContent = originalText;
          }, 2000);
        }
      },
      (err) => {
        console.error("Could not copy text: ", err);
        setError("Failed to copy link to clipboard");
      }
    );
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Share "{itemTitle}"</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <div className="mb-6">
          <p className="text-sm text-gray-600 mb-4">
            {isShared
              ? "This content is currently shared. Anyone with the link can view it."
              : "Enable sharing to generate a shareable link for this content."
            }
          </p>

          {isShared && shareLink && (
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium text-gray-700">Shareable Link</label>
              <div className="flex">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-l-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  id="copy-button"
                  onClick={copyToClipboard}
                  className="bg-blue-500 text-white px-4 py-2 rounded-r-md hover:bg-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm"
                  disabled={isLoading}
                >
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-500"
            disabled={isLoading}
          >
            Close
          </button>
          <button
            onClick={toggleSharing}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-1 focus:ring-offset-1 ${
              isShared
                ? "bg-red-500 hover:bg-red-600 focus:ring-red-500"
                : "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500"
            }`}
          >
            {isLoading
              ? "Processing..."
              : isShared
              ? "Stop Sharing"
              : "Enable Sharing"}
          </button>
        </div>
      </div>
    </div>
  );
}
