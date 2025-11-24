import { useState, useEffect } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Button } from "./button";
import { CrossIcon } from "./icons";

interface ReportContentModalProps {
  open: boolean;
  onClose: () => void;
  contentId: string | null;
  contentTitle?: string;
}

export function ReportContentModal({ open, onClose, contentId, contentTitle }: ReportContentModalProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [open, contentId]);

  if (!open) return null;

  function handleClose() {
    setReason("");
    setErrorMessage(null);
    setSuccessMessage(null);
    onClose();
  }

  async function handleSubmit() {
    if (!contentId) {
      setErrorMessage("No content selected to report.");
      return;
    }

    const trimmed = reason.trim();
    if (!trimmed) {
      setErrorMessage("Please describe why you are reporting this content.");
      return;
    }

    if (trimmed.length > 500) {
      setErrorMessage("Reason must be 500 characters or less.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const token = localStorage.getItem("token") || "";
      const config = token ? { headers: { Authorization: token } } : {};
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/content/${contentId}/report`,
        { reason: trimmed },
        config
      );

      const msg = (res.data && (res.data.message || res.data.error)) ||
        "Content reported. Our team will review it.";
      setSuccessMessage(msg);
      setReason("");
    } catch (error: any) {
      console.error("Failed to report content", error);
      let message = "Failed to report content. Please try again.";
      if (axios.isAxiosError(error) && error.response) {
        const data: any = error.response.data || {};
        message = data.message || data.error || message;
        if (error.response.status === 401) {
          message = "Please sign in to report content.";
        }
      }
      setErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  const remaining = 500 - reason.length;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 px-4 animate-in fade-in"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-content-title"
        className="bg-white w-full max-w-lg border-2 border-gray-200 rounded-3xl p-6 md:p-7 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") handleClose();
        }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h2
              id="report-content-title"
              className="text-2xl font-bold text-gray-900 mb-1"
            >
              Report content
            </h2>
            <p className="text-xs md:text-sm text-gray-500 max-w-md">
              Help us keep BrainCache safe. Tell us what is wrong with this
              content.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close report dialog"
          >
            <CrossIcon onClick={() => { }} />
          </button>
        </div>

        {contentTitle && (
          <div className="mb-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Reporting
            </p>
            <p className="text-sm font-medium text-gray-900 line-clamp-2 break-words">
              {contentTitle}
            </p>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            rows={4}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all text-sm resize-none"
            placeholder="Describe why this content is inappropriate, spam, or violates guidelines..."
            maxLength={600}
          />
          <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
            <span>Maximum 500 characters</span>
            <span className={remaining < 0 ? "text-red-500" : ""}>
              {remaining} characters left
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-semibold">⚠</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 text-sm text-green-700 bg-green-50 border-l-4 border-green-400 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-500 font-semibold">✓</span>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            title="Cancel"
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={submitting}
          />
          <Button
            title={submitting ? "Submitting..." : "Submit report"}
            variant="danger"
            size="md"
            onClick={handleSubmit}
            disabled={submitting}
          />
        </div>
      </div>
    </div>
  );
}

export default ReportContentModal;
