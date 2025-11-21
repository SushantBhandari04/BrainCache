import { useEffect, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Logo } from "../components/Logo";
import { Button } from "../components/button";
import { PlusIcon } from "../components/icons";
import { useNavigate } from "react-router-dom";

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
};

function SpacesPage() {
    const [spaces, setSpaces] = useState<Space[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [submitting, setSubmitting] = useState(false);
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
                headers: { Authorization: token },
            });
            setSpaces(res.data.spaces || []);
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

    async function createSpace() {
        if (!name.trim()) return;
        if (atLimit) {
            setError("You've reached the space limit for the free plan. Upgrade to create more.");
            return;
        }
        setSubmitting(true);
        setError(null);
        try {
            const token = localStorage.getItem("token") || "";
            const res = await axios.post(`${BACKEND_URL}/api/v1/spaces`, {
                name: name.trim(),
                description: description.trim() ? description.trim() : undefined,
            }, {
                headers: { Authorization: token }
            });
            setSpaces(prev => [...prev, res.data.space]);
            setName("");
            setDescription("");
            setFormOpen(false);
            setSpaceCount(prev => prev + 1);
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

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-indigo-50/30 to-purple-50/30 flex flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
                <Logo />
                <div className="flex items-center gap-3">
                    <div className="text-sm pr-4 border-r border-gray-200">
                        <div className={`font-semibold ${plan === "pro" ? "text-violet-600" : "text-gray-900"}`}>
                            {plan === "pro" ? "✨ Pro Plan" : "Free Plan"}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">
                            {spaceCount}/{spaceLimit}{plan === "pro" ? "+" : ""} spaces
                        </div>
                    </div>
                    {plan === "free" && (
                        <Button variant="secondary" size="md" title={upgradeButtonLabel} onClick={upgradePlan} disabled={upgradeDisabled} />
                    )}
                    <Button variant="secondary" size="md" title="Dashboard" onClick={() => navigate("/user/dashboard")} />
                    <Button variant="primary" size="md" title={formOpen ? "Close" : "New Space"} startIcon={<PlusIcon />} onClick={() => setFormOpen(prev => !prev)} disabled={plan !== "pro" && atLimit && !formOpen} />
                </div>
            </header>

            <main className="flex-1 px-6 py-8 max-w-7xl w-full mx-auto">
                {/* Stats Cards */}
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { 
                            label: "Current Plan", 
                            value: plan === "pro" ? "Pro" : "Free",
                            gradient: plan === "pro" ? "from-violet-500 to-purple-600" : "from-gray-400 to-gray-600"
                        },
                        { 
                            label: "Spaces Used", 
                            value: `${spaceCount}/${spaceLimit}${plan === "pro" ? "+" : ""}`,
                            gradient: "from-indigo-500 to-blue-600"
                        },
                        { 
                            label: "Upgrade", 
                            value: plan === "pro" ? "Active" : priceDisplay,
                            gradient: plan === "pro" ? "from-green-500 to-emerald-600" : "from-amber-500 to-orange-600"
                        }
                    ].map((stat) => (
                        <div key={stat.label} className="group bg-white border border-gray-200/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
                            <p className="text-xs uppercase tracking-wider text-gray-500 mb-2 font-medium">{stat.label}</p>
                            <p className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent`}>
                                {stat.value}
                            </p>
                        </div>
                    ))}
                </section>

                {/* Upgrade Banner */}
                {plan === "free" && paymentsConfigured && (
                    <section className="mb-8 relative overflow-hidden bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-600 rounded-3xl p-8 shadow-xl">
                        <div className="absolute inset-0 opacity-20" style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                        }}></div>
                        <div className="relative z-10 flex flex-wrap items-center gap-8">
                            <div className="flex-1 min-w-[280px]">
                                <p className="text-xs uppercase tracking-widest text-violet-100 font-semibold mb-2">BrainCache Pro</p>
                                <h2 className="text-3xl font-bold text-white mb-3">Unlock Unlimited Spaces</h2>
                                <p className="text-violet-100 mb-4 text-sm leading-relaxed">
                                    One-time payment of <span className="font-semibold text-white">{priceDisplay}</span>. Keep every client, project, or hobby in its own workspace.
                                </p>
                                <ul className="space-y-2 text-sm text-violet-50">
                                    <li className="flex items-center gap-2">
                                        <span className="text-violet-300">✓</span>
                                        <span>Unlimited private & shared spaces</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-violet-300">✓</span>
                                        <span>Priority share links & early beta access</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <span className="text-violet-300">✓</span>
                                        <span>Dedicated support from the BrainCache team</span>
                                    </li>
                                </ul>
                            </div>
                            <div className="flex flex-col gap-3 min-w-[220px] bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                                <span className="text-xs uppercase tracking-wider text-violet-200 font-medium">One-time Payment</span>
                                <span className="text-4xl font-bold text-white">{priceDisplay}</span>
                                <Button 
                                    variant="primary" 
                                    size="md" 
                                    title={upgradeButtonLabel} 
                                    onClick={upgradePlan} 
                                    disabled={upgradeDisabled}
                                    className="bg-white text-violet-600 hover:bg-violet-50 active:bg-violet-100 mt-2"
                                />
                            </div>
                        </div>
                    </section>
                )}

                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">Your Spaces</h1>
                    <p className="text-gray-600 text-lg">Organize different brains for projects, teams, or themes.</p>
                </div>

                {/* Messages */}
                {error && (
                    <div className="mb-6 animate-in slide-in-from-top-2 text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-red-500 font-semibold">⚠</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {upgradeMessage && (
                    <div className="mb-6 animate-in slide-in-from-top-2 text-sm text-green-700 bg-green-50 border-l-4 border-green-400 rounded-lg p-4 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-green-500 font-semibold">✓</span>
                            <span>{upgradeMessage}</span>
                        </div>
                    </div>
                )}

                {!paymentsConfigured && plan === "free" && (
                    <div className="mb-6 rounded-xl bg-amber-50 border-l-4 border-amber-400 px-5 py-4 text-sm text-amber-900 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-amber-600 font-semibold">ℹ</span>
                            <span>Payments are not yet configured. Please contact support to upgrade to Pro.</span>
                        </div>
                    </div>
                )}

                {plan === "free" && atLimit && (
                    <div className="mb-6 rounded-xl bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-400 px-5 py-4 text-sm text-yellow-900 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-yellow-600 font-semibold">⚠</span>
                            <span>You've reached the {spaceLimit}-space limit on the free plan. Upgrade to Pro for unlimited spaces.</span>
                        </div>
                        <Button variant="primary" size="sm" title={upgradeButtonLabel} onClick={upgradePlan} disabled={upgradeDisabled} />
                    </div>
                )}

                {/* {plan === "pro" && (
                    <div className="mb-8 rounded-2xl border-l-4 border-green-400 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-5 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                                <span>✨</span>
                                <span>Pro plan active</span>
                            </p>
                            <p className="text-xs text-green-700 mt-1">Enjoy unlimited spaces and premium sharing.</p>
                        </div>
                        <span className="text-sm font-semibold text-green-800 bg-white/60 px-4 py-2 rounded-lg">₹0 due</span>
                    </div>
                )} */}

                {/* Create Space Form */}
                {formOpen && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-2xl shadow-lg p-8 animate-in slide-in-from-top-2">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Create a new space</h2>
                        <p className="text-sm text-gray-500 mb-6">Give your space a name and optional description to get started.</p>
                        <div className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Name *</label>
                                <input
                                    type="text"
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                                    placeholder="e.g. Growth Experiments, Client Projects, Personal Notes"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={60}
                                />
                                <p className="text-xs text-gray-400 mt-1">{name.length}/60 characters</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Description (optional)</label>
                                <textarea
                                    className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none"
                                    placeholder="Describe what goes in this space..."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={4}
                                    maxLength={240}
                                />
                                <p className="text-xs text-gray-400 mt-1">{description.length}/240 characters</p>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <Button variant="secondary" size="md" title="Cancel" onClick={() => { setFormOpen(false); setName(""); setDescription(""); }} />
                                <Button variant="primary" size="md" title={submitting ? "Creating..." : "Create Space"} onClick={createSpace} disabled={submitting || !name.trim()} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Spaces Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-violet-200 border-t-violet-500 rounded-full animate-spin"></div>
                            <p className="text-gray-500 font-medium">Loading your spaces...</p>
                        </div>
                    </div>
                ) : spaces.length === 0 ? (
                    <div className="bg-white border-2 border-dashed border-gray-300 rounded-2xl p-16 text-center">
                        <div className="max-w-md mx-auto">
                            <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                                <PlusIcon className="size-10 text-violet-500" />
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No spaces yet</h3>
                            <p className="text-gray-600 mb-6">Create your first space to start organizing your content into separate workspaces.</p>
                            <Button 
                                variant="primary" 
                                size="lg" 
                                title="Create Your First Space" 
                                startIcon={<PlusIcon />} 
                                onClick={() => setFormOpen(true)} 
                                disabled={plan === "free" && atLimit} 
                            />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {spaces.map((space) => (
                            <div 
                                key={space._id} 
                                className="group bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col justify-between hover:shadow-lg hover:border-violet-300 transition-all duration-300 hover:-translate-y-1"
                            >
                                <div>
                                    <div className="flex items-start justify-between mb-3">
                                        <h3 className="text-xl font-bold text-gray-900 truncate flex-1 pr-2 group-hover:text-violet-600 transition-colors">
                                            {space.name}
                                        </h3>
                                        {space.shareHash && (
                                            <span className="flex-shrink-0 text-xs uppercase font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">
                                                Shared
                                            </span>
                                        )}
                                    </div>
                                    {space.description ? (
                                        <p className="text-sm text-gray-600 break-words leading-relaxed line-clamp-3">{space.description}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No description provided.</p>
                                    )}
                                </div>
                                <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-100">
                                    <Button 
                                        variant="primary" 
                                        size="md" 
                                        title="Open Space" 
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
                )}
            </main>
        </div>
    );
}

export default SpacesPage;

