import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Logo } from "../components/Logo";
import { Button } from "../components/button";

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
  spaceId?: string | null;
  spaceName?: string | null;
  contentLink?: string | null;
  contentBody?: string | null;
  owner?: ReporterInfo | null;
  status?: "pending" | "resolved" | "ignored" | string;
  reason: string;
  createdAt: string;
  reportedBy?: ReporterInfo | null;
}

interface ProfileResponse {
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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

function AdminDashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTypeFilter, setActiveTypeFilter] = useState<string | "all">("all");
  const [activeStatusFilter, setActiveStatusFilter] = useState<"all" | "pending" | "resolved" | "ignored">("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token") || "";
    if (!token) {
      navigate("/user/signin");
      return;
    }

    async function fetchProfile() {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/profile`, {
          headers: { Authorization: token },
        });
        const data: ProfileResponse = res.data || {};
        if (data.role !== "admin") {
          navigate("/user/spaces");
          return;
        }
        setProfile(data);
      } catch (e) {
        navigate("/user/signin");
        return;
      } finally {
        setLoadingProfile(false);
      }
    }

    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loadingProfile) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingProfile]);

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchesType = activeTypeFilter === "all" || report.contentType === activeTypeFilter;
      const status = (report.status as string) || "pending";
      const matchesStatus = activeStatusFilter === "all" || status === activeStatusFilter;

      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesType && matchesStatus;
      const title = (report.contentTitle || "").toLowerCase();
      const reason = (report.reason || "").toLowerCase();
      const reporterLabel = resolveReporterName(report.reportedBy || undefined).toLowerCase();
      return (
        matchesType && matchesStatus && (
          title.includes(query) ||
          reason.includes(query) ||
          reporterLabel.includes(query)
        )
      );
    });
  }, [reports, activeTypeFilter, activeStatusFilter, searchQuery]);

  async function updateReportStatus(id: string, status: "pending" | "resolved" | "ignored") {
    try {
      const token = localStorage.getItem("token") || "";
      await axios.patch(
        `${BACKEND_URL}/api/v1/reports/${id}/status`,
        { status },
        { headers: { Authorization: token } }
      );

      setReports((prev) =>
        prev.map((r) => (r._id === id ? { ...r, status } : r))
      );
    } catch (err: any) {
      console.error("Failed to update report status", err);
      let message = "Failed to update report status.";
      if (axios.isAxiosError(err) && err.response) {
        const body: any = err.response.data || {};
        message = body.message || body.error || message;
      }
      setError(message);
    }
  }

  async function deleteContent(contentId: string) {
    if (!contentId) return;
    const confirmed = window.confirm("Are you sure you want to delete this content? This cannot be undone.");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("token") || "";
      await axios.delete(`${BACKEND_URL}/api/v1/content`, {
        data: { id: contentId },
        headers: { Authorization: token },
      });

      setReports((prev) => prev.filter((r) => r.contentId !== contentId));
    } catch (err: any) {
      console.error("Failed to delete content", err);
      let message = "Failed to delete content.";
      if (axios.isAxiosError(err) && err.response) {
        const body: any = err.response.data || {};
        message = body.message || body.error || message;
      }
      setError(message);
    }
  }

  function getStatusStyles(status: string | undefined) {
    const value = status || "pending";
    switch (value) {
      case "resolved":
        return {
          label: "Resolved",
          className:
            "bg-emerald-50 text-emerald-700 border-emerald-200",
        };
      case "ignored":
        return {
          label: "Ignored",
          className:
            "bg-gray-100 text-gray-700 border-gray-200",
        };
      default:
        return {
          label: "Pending",
          className:
            "bg-amber-50 text-amber-700 border-amber-200",
        };
    }
  }

  async function fetchReports() {
    setLoadingReports(true);
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
          message = "Please sign in as admin to view reports.";
        }
      }
      setError(message);
    } finally {
      setLoadingReports(false);
    }
  }

  function logout() {
    localStorage.removeItem("token");
    navigate("/");
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20">
        <div className="flex flex-col items-center gap-3 text-gray-600">
          <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin" />
          <span className="text-sm">Loading admin panel...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/20 to-purple-50/20 flex flex-col">
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              Admin Panel
            </span>
          </div>
          <div className="flex items-center gap-3">
            {profile && (
              <div className="hidden md:flex flex-col text-right text-xs text-gray-600">
                <span className="font-semibold text-gray-800">{profile.email}</span>
                <span className="text-[11px] text-gray-500">Role: {profile.role || "user"}</span>
              </div>
            )}
            <Button
              variant="danger"
              size="sm"
              title="Logout"
              onClick={logout}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Content Reports</h1>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Review all reports submitted across BrainCache. As an admin you can see reports for every user.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              title={loadingReports ? "Refreshing..." : "Refresh"}
              onClick={loadingReports ? undefined : fetchReports}
              disabled={loadingReports}
            />
          </div>
        </div>

        {reports.length > 0 && (
          <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,2fr)]">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Overview
                </h2>
                <span className="text-[11px] text-gray-500">
                  Showing {filteredReports.length} of {reports.length}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="flex flex-col rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <span className="text-[11px] text-gray-500">Total</span>
                  <span className="mt-1 text-base font-semibold text-gray-900">{reports.length}</span>
                </div>
                <div className="flex flex-col rounded-lg bg-amber-50 border border-amber-100 px-3 py-2">
                  <span className="text-[11px] text-amber-700">Pending</span>
                  <span className="mt-1 text-base font-semibold text-amber-900">
                    {reports.filter((r) => ((r.status as string) || "pending") === "pending").length}
                  </span>
                </div>
                <div className="flex flex-col rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2">
                  <span className="text-[11px] text-emerald-700">Resolved</span>
                  <span className="mt-1 text-base font-semibold text-emerald-900">
                    {reports.filter((r) => ((r.status as string) || "pending") === "resolved").length}
                  </span>
                </div>
                <div className="flex flex-col rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <span className="text-[11px] text-gray-700">Ignored</span>
                  <span className="mt-1 text-base font-semibold text-gray-900">
                    {reports.filter((r) => ((r.status as string) || "pending") === "ignored").length}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
                  Filters
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTypeFilter("all")}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeTypeFilter === "all"
                    ? "bg-violet-50 text-violet-700 border-violet-300"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                >
                  All types ({reports.length})
                </button>
                {Array.from(new Set(reports.map((r) => r.contentType || "unknown"))).map((type) => {
                  const count = reports.filter((r) => (r.contentType || "unknown") === type).length;
                  const label = type === "unknown" ? "Unknown" : type;
                  return (
                    <button
                      key={type || "unknown"}
                      type="button"
                      onClick={() => setActiveTypeFilter(type)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${activeTypeFilter === type
                        ? "bg-violet-50 text-violet-700 border-violet-300"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {["all", "pending", "resolved", "ignored"].map((statusKey) => {
                  const label =
                    statusKey === "all"
                      ? "All statuses"
                      : statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
                  const count =
                    statusKey === "all"
                      ? reports.length
                      : reports.filter((r) => ((r.status as string) || "pending") === statusKey).length;
                  const isActive = activeStatusFilter === statusKey;
                  return (
                    <button
                      key={statusKey}
                      type="button"
                      onClick={() => setActiveStatusFilter(statusKey as typeof activeStatusFilter)}
                      className={`px-3 py-1.5 rounded-full font-medium border transition-colors ${isActive
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              <div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, reporter, or reason..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-red-500 font-semibold">⚠</span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {loadingReports ? (
          <div className="py-12 flex flex-col items-center justify-center text-gray-500 text-sm">
            <div className="w-8 h-8 border-3 border-violet-200 border-t-violet-500 rounded-full animate-spin mb-3" />
            <span>Loading reports...</span>
          </div>
        ) : reports.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 text-sm bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">No reports yet</p>
            <p className="text-xs md:text-sm text-gray-500 max-w-sm">
              When users report content, it will appear here so you can review it.
            </p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-gray-500 text-sm bg-white rounded-2xl border border-dashed border-gray-300">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-2xl">🔍</span>
            </div>
            <p className="font-semibold text-gray-800 mb-1">No reports match your filters</p>
            <p className="text-xs md:text-sm text-gray-500 max-w-sm">
              Try clearing the search or selecting a different content type.
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                title="Clear filters"
                onClick={() => {
                  setActiveTypeFilter("all");
                  setSearchQuery("");
                }}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const reporterLabel = resolveReporterName(report.reportedBy || undefined);
              const ownerLabel = report.owner ? resolveReporterName(report.owner) : null;
              const hasPreviewLink = !!report.contentLink;
              const isNote = report.contentType === "note";
              const hasNoteBody = !!report.contentBody;
              const noteBody = report.contentBody || "";

              const statusStyles = getStatusStyles(report.status as string);
              const currentStatus = (report.status as string) || "pending";

              return (
                <div
                  key={report._id}
                  className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm flex flex-col gap-3"
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
                        {report.spaceName && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-50 text-gray-700 border border-gray-200">
                            Space: {report.spaceName}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 break-all">
                        Content ID: {report.contentId}
                        {report.spaceId && (
                          <span className="ml-1 text-[10px] text-gray-400">(space: {report.spaceId})</span>
                        )}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500 flex flex-col items-end gap-1">
                      <div className="flex gap-4 items-center mb-1">
                        <span>{formatDate(report.createdAt)}</span>
                        <span
                          className={` inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusStyles.className}`}
                        >
                          {statusStyles.label}
                        </span>
                      </div>
                      {ownerLabel && (
                        <span className="text-[11px] text-gray-500">Owner: {ownerLabel}</span>
                      )}
                      <span className="text-[11px] text-gray-600">Reported by: {reporterLabel}</span>
                    </div>
                  </div>

                  {isNote && hasNoteBody && (
                    <div className="mt-2 text-xs text-gray-800 whitespace-pre-wrap break-words bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                      {noteBody}
                    </div>
                  )}

                  {hasPreviewLink && (
                    <div className="mt-1 text-[11px] md:text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex flex-col gap-1">
                      <span className="font-semibold text-gray-700 mr-1">Source link:</span>
                      <a
                        href={report.contentLink || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-violet-600 hover:text-violet-700 hover:underline break-all"
                      >
                        {report.contentLink}
                      </a>
                    </div>
                  )}

                  <div className="mt-2 border-t border-gray-100 pt-2">
                    <p className="text-[11px] font-semibold text-gray-700 mb-0.5">Report reason</p>
                    <p className="text-xs md:text-sm text-gray-800 whitespace-pre-wrap break-words">
                      {report.reason}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      title="Delete content"
                      onClick={() => deleteContent(report.contentId)}
                    />
                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        variant={currentStatus === "pending" ? "primary" : "secondary"}
                        size="sm"
                        title="Mark pending"
                        onClick={() => updateReportStatus(report._id, "pending")}
                      />
                      <Button
                        variant={currentStatus === "resolved" ? "primary" : "secondary"}
                        size="sm"
                        title="Mark resolved"
                        onClick={() => updateReportStatus(report._id, "resolved")}
                      />
                      <Button
                        variant={currentStatus === "ignored" ? "danger" : "secondary"}
                        size="sm"
                        title="Ignore"
                        onClick={() => updateReportStatus(report._id, "ignored")}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;
