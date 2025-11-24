import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Button } from "./button";
import { CrossIcon } from "./icons";

interface ReportsModalProps {
  open: boolean;
  onClose: () => void;
}

interface ReporterInfo {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface ReportListItem {
  _id: string;
  contentId: string;
  contentTitle: string;
  contentType?: string | null;
  reason: string;
  createdAt: string;
  reportedBy?: ReporterInfo | null;
}

function resolveReporterName(info?: ReporterInfo | null) {
  if (!info) return "Unknown";
  const fullName = `${info.firstName || ""} ${info.lastName || ""}`.trim();
  if (fullName && info.email) return `${fullName} (${info.email})`;
  if (fullName) return fullName;
  return info.email || "Unknown";
}

function formatDate(value: string) {
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    return d.toLocaleString();
  } catch {
    return value;
  }
}

export function ReportsModal({ open, onClose }: ReportsModalProps) {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  async function fetchReports() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.get(`${BACKEND_URL}/api/v1/reports`, {
        headers: { Authorization: token },
      });
      const data = res.data || {};
      setReports(data.reports || []);
    } catch (err: any) {
      console.error("Failed to load reports", err);
      let message = "Failed to load reports. Please try again.";
      if (axios.isAxiosError(err) && err.response) {
        const body: any = err.response.data || {};
        message = body.message || body.error || message;
        if (err.response.status === 401) {
          message = "Please sign in to view reports.";
        }
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/35 backdrop-blur-sm flex justify-center items-center z-50 px-4"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reports-title"
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold">Moderation</p>
            <h2 id="reports-title" className="text-2xl font-semibold text-gray-900 mt-1">
              Content reports
            </h2>
            <p className="text-xs md:text-sm text-gray-500 mt-1">
              These are reports other users have submitted on your content.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close reports dialog"
          >
            <CrossIcon onClick={() => { }} />
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-500">
              <span className="font-semibold text-gray-800">{reports.length}</span>{" "}
              {reports.length === 1 ? "report" : "reports"}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                title={loading ? "Refreshing..." : "Refresh"}
                onClick={loading ? undefined : fetchReports}
                disabled={loading}
              />
            </div>
          </div>

          {error && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-semibold">⚠</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-10 flex flex-col items-center justify-center text-gray-500 text-sm">
              <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin mb-3" />
              <span>Loading reports...</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center text-center text-gray-500 text-sm">
              <div className="w-14 h-14 mb-3 rounded-full bg-gray-100 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <p className="font-semibold text-gray-800 mb-1">No reports yet</p>
              <p className="text-xs md:text-sm text-gray-500 max-w-sm">
                When users report your content, it will appear here so you can review it.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const reporterLabel = resolveReporterName(report.reportedBy || undefined);
                return (
                  <div
                    key={report._id}
                    className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm md:text-base font-semibold text-gray-900 truncate">
                            {report.contentTitle || "Untitled content"}
                          </h3>
                          {report.contentType && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-violet-50 text-violet-700 border border-violet-100">
                              {report.contentType}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 break-all">
                          Content ID: {report.contentId}
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                        <span>{formatDate(report.createdAt)}</span>
                        <span className="text-[11px] text-gray-600">by {reporterLabel}</span>
                      </div>
                    </div>
                    <div className="mt-1">
                      <p className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap break-words">
                        {report.reason}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
          <Button
            variant="secondary"
            size="sm"
            title="Close"
            onClick={handleClose}
          />
        </div>
      </div>
    </div>
  );
}

export default ReportsModal;
