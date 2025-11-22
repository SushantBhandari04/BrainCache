import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Logo } from "../components/Logo";
import { Button } from "../components/button";
import { PlusIcon } from "../components/icons";
import { useNavigate } from "react-router-dom";
import { CreateSpaceModal } from "../components/CreateSpaceModal";

declare global {
    interface Window {
        Razorpay?: any;
    }
}

type Space = {
    _id: string;
    name: string;
    description?: string;
    shareHash: string | null;
    isShared?: boolean;
    sharedBy?: {
        _id: string;
        email: string;
        firstName?: string;
        lastName?: string;
    };
    sharedAt?: string;
};

function SpacesPage() {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [sharedSpaces, setSharedSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<"my" | "shared">("my");
    const [plan, setPlan] = useState<"free" | "pro">("free");
    const [spaceLimit, setSpaceLimit] = useState<number>(3);
    const [spaceCount, setSpaceCount] = useState<number>(0);
    const [upgrading, setUpgrading] = useState(false);
    const [priceDisplay, setPriceDisplay] = useState("₹499");
    const [priceCurrency, setPriceCurrency] = useState("INR");
    const [paymentsConfigured, setPaymentsConfigured] = useState(false);
    const [razorpayReady, setRazorpayReady] = useState(false);
    const [upgradeMessage, setUpgradeMessage] = useState<string | null>(null);
    const navigate = useNavigate();
    const atLimit = plan !== "pro" && spaceCount >= spaceLimit;
    const upgradeButtonLabel = upgrading
        ? "Processing..."
        : plan === "free"
            ? (paymentsConfigured ? `Upgrade (${priceDisplay})` : "Upgrade")
            : "Upgrade";
    const upgradeDisabled = upgrading || !paymentsConfigured || !razorpayReady;

    async function fetchSpaces() {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await axios.get(`${BACKEND_URL}/api/v1/spaces`, {
                params: { includeShared: "true" },
                headers: { Authorization: token },
            });
            setSpaces(res.data.spaces || []);
            setSharedSpaces(res.data.sharedSpaces || []);
            setPlan(res.data.plan || "free");
            setSpaceLimit(res.data.limit || 3);
            setSpaceCount(res.data.currentCount || (res.data.spaces || []).length || 0);
            if (res.data.price) {
                setPriceDisplay(res.data.price.display || `₹${((res.data.price.amount || 0) / 100).toFixed(0)}`);
                setPriceCurrency(res.data.price.currency || "INR");
            }
            setPaymentsConfigured(!!res.data.paymentsConfigured);
        } catch (e) {
            setError("Unable to load spaces. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSpaces();
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
        script.onerror = () => setError("Unable to load payment gateway. Please refresh and try again.");
        document.body.appendChild(script);

        return () => {
            if (script) {
                script.onload = null;
                script.onerror = null;
            }
        };
    }, []);

    async function createSpace(name: string, description: string) {
        if (atLimit) {
            setError("You've reached the space limit for the free plan. Upgrade to create more.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            await axios.post(`${BACKEND_URL}/api/v1/spaces`, {
                name: name.trim(),
                description: description.trim() ? description.trim() : undefined,
            }, {
                headers: { Authorization: token }
            });
            // Refresh spaces to get updated list including any new shared spaces
            await fetchSpaces();
            setFormOpen(false);
        } catch (e: any) {
            const message = e?.response?.data?.message || "Failed to create space.";
            setError(message);
        } finally {
            setSubmitting(false);
        }
    }

    async function upgradePlan() {
        if (!paymentsConfigured) {
            setError("Payments are currently unavailable. Please try again later.");
            return;
        }
        if (!razorpayReady || !window.Razorpay) {
            setError("Payment gateway is still loading. Please wait a moment and try again.");
            return;
        }
        setUpgrading(true);
        setError(null);
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
                description: checkout.data.description || "Unlock unlimited spaces & premium features",
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
                        setError("Payment captured but subscription update failed. Please contact support with your payment reference.");
                    } finally {
                        setUpgrading(false);
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.on("payment.failed", (resp: any) => {
                setUpgradeMessage(null);
                setError(resp?.error?.description || "Payment failed. Please try again.");
                setUpgrading(false);
            });
            razorpay.open();
        } catch (e: any) {
            const message = e?.response?.data?.message || "Unable to start payment. Please try again.";
            setError(message);
            setUpgrading(false);
        }
    }

    function openSpace(spaceId: string) {
        navigate(`/user/dashboard?spaceId=${spaceId}`);
    }

    const usagePercent = spaceLimit > 0 ? Math.min((spaceCount / spaceLimit) * 100, 100) : 0;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Clean Header */}
            <header className="sticky top-0 z-50 bg-white border-b border-gray-200/80 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <Logo />
                        <div className="flex items-center gap-4">
                            <div className="hidden sm:flex items-center gap-4 text-sm">
                                <div className="px-3 py-1.5 rounded-lg bg-gray-100">
                                    <span className={`font-medium ${plan === "pro" ? "text-indigo-600" : "text-gray-700"}`}>
                                        {plan === "pro" ? "Pro" : "Free"}
                                    </span>
                                    <span className="text-gray-500 ml-2">
                                        {spaceCount}/{plan === "pro" ? "∞" : spaceLimit}
                                    </span>
                                </div>
                            </div>
                            {plan === "free" && paymentsConfigured && (
                                <Button 
                                    variant="secondary" 
                                    size="md" 
                                    title={upgradeButtonLabel} 
                                    onClick={upgradePlan} 
                                    disabled={upgradeDisabled}
                                    className="hidden sm:inline-flex"
                                />
                            )}
                            <Button 
                                variant="secondary" 
                                size="md" 
                                title="Dashboard" 
                                onClick={() => navigate("/user/dashboard")}
                                className="hidden sm:inline-flex"
                            />
                            <Button 
                                variant="primary" 
                                size="md" 
                                title={formOpen ? "Close" : "New Space"} 
                                startIcon={<PlusIcon />} 
                                onClick={() => setFormOpen(prev => !prev)} 
                                disabled={plan !== "pro" && atLimit && !formOpen}
                            />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                {/* Status Messages */}
                {error && (
                    <div className="mb-4 md:mb-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-2">
                            <span className="font-medium flex-shrink-0">Error:</span>
                            <span className="flex-1">{error}</span>
                        </div>
                    </div>
                )}

                {upgradeMessage && (
                    <div className="mb-4 md:mb-6 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-start gap-2">
                            <span className="font-medium flex-shrink-0">Success:</span>
                            <span className="flex-1">{upgradeMessage}</span>
                        </div>
                    </div>
                )}

                {/* Overview Section */}
                <div className="mb-6 md:mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5 md:mb-6">
                            <div>
                                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 mb-1">Spaces</h1>
                                <p className="text-xs md:text-sm text-gray-600">
                                    Organize your content into dedicated workspaces
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                {plan === "free" && paymentsConfigured && (
                                    <Button 
                                        variant="primary" 
                                        size="md" 
                                        title={upgradeButtonLabel} 
                                        onClick={upgradePlan} 
                                        disabled={upgradeDisabled}
                                    />
                                )}
                                <Button 
                                    variant="secondary" 
                                    size="md" 
                                    title="Dashboard" 
                                    onClick={() => navigate("/user/dashboard")}
                                    className="sm:hidden"
                                />
                            </div>
                        </div>

                        {/* Usage Stats */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4">
                            <div className="p-3 md:p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Plan</div>
                                <div className="text-base md:text-lg font-semibold text-gray-900">
                                    {plan === "pro" ? (
                                        <span className="text-indigo-600">Pro Plan</span>
                                    ) : (
                                        "Free Plan"
                                    )}
                                </div>
                            </div>
                            <div className="p-3 md:p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">My Spaces</div>
                                <div className="text-base md:text-lg font-semibold text-gray-900">
                                    {spaceCount} {plan === "pro" ? "" : `of ${spaceLimit}`}
                                </div>
                            </div>
                            <div className="p-3 md:p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Shared With Me</div>
                                <div className="text-base md:text-lg font-semibold text-gray-900">{sharedSpaces.length}</div>
                            </div>
                            <div className="p-3 md:p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100/50 transition-colors">
                                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Total</div>
                                <div className="text-base md:text-lg font-semibold text-gray-900">{spaces.length + sharedSpaces.length}</div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        {plan === "free" && (
                            <div className="mt-6">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
                                    <span>Space usage</span>
                                    <span className="font-medium">{Math.round(usagePercent)}%</span>
                                </div>
                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                                        style={{ width: `${usagePercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Upgrade Banner - Only for Free Plan */}
                {/* {plan === "free" && paymentsConfigured && (
                    <div className="mb-6 md:mb-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-5 md:p-6 shadow-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div className="flex-1">
                                <h2 className="text-lg md:text-xl font-semibold mb-2">Upgrade to Pro</h2>
                                <p className="text-xs md:text-sm text-indigo-100 mb-3">
                                    Unlock unlimited spaces and premium features for {priceDisplay}
                                </p>
                                <ul className="text-xs md:text-sm text-indigo-100 space-y-1">
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-300">✓</span>
                                        <span>Unlimited spaces</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-green-300">✓</span>
                                        <span>Priority support</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex flex-col sm:items-end gap-2">
                                <div className="text-2xl md:text-3xl font-bold">{priceDisplay}</div>
                                <Button 
                                    variant="secondary" 
                                    size="md" 
                                    title={upgradeButtonLabel} 
                                    onClick={upgradePlan} 
                                    disabled={upgradeDisabled}
                                    className="bg-white text-indigo-600 hover:bg-gray-50 w-full sm:w-auto"
                                />
                            </div>
                        </div>
                    </div>
                )} */}

                {/* Limit Warning */}
                {plan === "free" && atLimit && (
                    <div className="mb-4 md:mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <span className="flex-1">You've reached the {spaceLimit}-space limit. Upgrade to Pro for unlimited spaces.</span>
                            {paymentsConfigured && (
                                <Button 
                                    variant="primary" 
                                    size="sm" 
                                    title={upgradeButtonLabel} 
                                    onClick={upgradePlan} 
                                    disabled={upgradeDisabled}
                                    className="w-full sm:w-auto"
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Create Space Modal */}
                <CreateSpaceModal
                    open={formOpen}
                    onClose={() => setFormOpen(false)}
                    onSubmit={createSpace}
                    submitting={submitting}
                    atLimit={atLimit}
                />

                {/* Tabs */}
                <div className="mb-6">
                    <div className="flex gap-2 border-b border-gray-200">
                        <button
                            onClick={() => setActiveTab("my")}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "my"
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            My Spaces ({spaces.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("shared")}
                            className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === "shared"
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            Shared With Me ({sharedSpaces.length})
                        </button>
                    </div>
                </div>

                {/* Spaces Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-2 border-gray-300 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-sm text-gray-600">Loading spaces...</p>
                        </div>
                    </div>
                ) : activeTab === "my" ? (
                    spaces.length === 0 ? (
                        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
                            <div className="max-w-sm mx-auto">
                                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-gray-100 rounded-xl flex items-center justify-center">
                                    <PlusIcon className="w-7 h-7 md:w-8 md:h-8 text-gray-400" />
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">No spaces yet</h3>
                                <p className="text-xs md:text-sm text-gray-600 mb-6">
                                    Create your first space to start organizing your content.
                                </p>
                                <Button 
                                    variant="primary" 
                                    size="md" 
                                    title="Create Your First Space" 
                                    startIcon={<PlusIcon />} 
                                    onClick={() => setFormOpen(true)} 
                                    disabled={plan === "free" && atLimit} 
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {spaces.map((space) => (
                                <div 
                                    key={space._id} 
                                    className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 hover:shadow-lg hover:border-indigo-300 transition-all duration-200 flex flex-col group"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between mb-3 gap-2">
                                            <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate flex-1 pr-2 group-hover:text-indigo-600 transition-colors">
                                                {space.name}
                                            </h3>
                                            {space.shareHash && (
                                                <span className="flex-shrink-0 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                                    Public
                                                </span>
                                            )}
                                        </div>
                                        {space.description ? (
                                            <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-4">{space.description}</p>
                                        ) : (
                                            <p className="text-xs md:text-sm text-gray-400 italic mb-4">No description</p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                        <Button 
                                            variant="primary" 
                                            size="md" 
                                            title="Open" 
                                            onClick={() => openSpace(space._id)}
                                            className="flex-1"
                                        />
                                        <Button 
                                            variant="secondary" 
                                            size="md" 
                                            title="Share" 
                                            onClick={() => navigate(`/user/dashboard?spaceId=${space._id}&share=1`)}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    sharedSpaces.length === 0 ? (
                        <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
                            <div className="max-w-sm mx-auto">
                                <div className="w-14 h-14 md:w-16 md:h-16 mx-auto mb-4 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <svg className="w-7 h-7 md:w-8 md:h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">No shared spaces</h3>
                                <p className="text-xs md:text-sm text-gray-600 mb-6">
                                    Spaces shared with you by other users will appear here.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                            {sharedSpaces.map((space) => {
                                const ownerLabel = space.sharedBy 
                                    ? (() => {
                                        const fullName = `${space.sharedBy.firstName || ""} ${space.sharedBy.lastName || ""}`.trim();
                                        const email = space.sharedBy.email;
                                        if (fullName && email) return `${fullName} (${email})`;
                                        return email || fullName || "Unknown";
                                    })()
                                    : "Unknown";
                                return (
                                    <div 
                                        key={space._id} 
                                        className="bg-white border border-indigo-200 rounded-lg p-4 md:p-5 hover:shadow-lg hover:border-indigo-400 transition-all duration-200 flex flex-col group"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between mb-3 gap-2">
                                                <h3 className="text-base md:text-lg font-semibold text-gray-900 truncate flex-1 pr-2 group-hover:text-indigo-600 transition-colors">
                                                    {space.name}
                                                </h3>
                                                <span className="flex-shrink-0 text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                                    Shared
                                                </span>
                                            </div>
                                            {space.description ? (
                                                <p className="text-xs md:text-sm text-gray-600 line-clamp-2 mb-2">{space.description}</p>
                                            ) : (
                                                <p className="text-xs md:text-sm text-gray-400 italic mb-2">No description</p>
                                            )}
                                            <p className="text-xs text-indigo-600 mb-4">by {ownerLabel}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                                            <Button 
                                                variant="primary" 
                                                size="md" 
                                                title="Open" 
                                                onClick={() => openSpace(space._id)}
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </main>
        </div>
    );
}

export default SpacesPage;
