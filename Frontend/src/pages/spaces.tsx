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
            if (script.getAttribute("data-loaded") === "true") {
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
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
                <Logo />
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-500 pr-4">
                        <div className="font-semibold text-gray-900">{plan === "pro" ? "Pro Plan" : "Free Plan"}</div>
                        <div>{spaceCount}/{spaceLimit}{plan === "pro" ? "+" : ""} spaces used</div>
                    </div>
                    {plan === "free" && (
                        <Button variant="secondary" size="md" title={upgradeButtonLabel} onClick={upgradePlan} disabled={upgradeDisabled} />
                    )}
                    <Button variant="secondary" size="md" title="Back to Dashboard" onClick={() => navigate("/user/dashboard")} />
                    <Button variant="primary" size="md" title={formOpen ? "Close" : "New Space"} startIcon={<PlusIcon />} onClick={() => setFormOpen(prev => !prev)} disabled={plan !== "pro" && atLimit && !formOpen} />
                </div>
            </header>

            <main className="flex-1 px-6 py-8 max-w-6xl w-full mx-auto">
                <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    {[
                        { label: "Plan", value: plan === "pro" ? "Pro" : "Free" },
                        { label: "Spaces", value: `${spaceCount}/${spaceLimit}${plan === "pro" ? "+" : ""}` },
                        { label: "Upgrade", value: plan === "pro" ? "Active" : priceDisplay }
                    ].map((stat) => (
                        <div key={stat.label} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                            <p className="text-xs uppercase tracking-widest text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                        </div>
                    ))}
                </section>

                {plan === "free" && paymentsConfigured && (
                    <section className="mb-8 bg-white border border-indigo-100 rounded-3xl p-6 shadow-sm flex flex-wrap items-center gap-6">
                        <div className="flex-1">
                            <p className="text-xs uppercase tracking-widest text-indigo-500 font-semibold">BrainCache Pro</p>
                            <h2 className="text-2xl font-semibold text-gray-900 mt-1">Upgrade for unlimited spaces & premium sharing</h2>
                            <p className="text-sm text-gray-600 mt-2">One-time payment of {priceDisplay}. Keep every client, project, or hobby in its own workspace.</p>
                            <ul className="mt-4 space-y-1 text-sm text-gray-600">
                                <li>• Unlimited private / shared spaces</li>
                                <li>• Priority share links (soon) & early beta access</li>
                                <li>• Dedicated support from the BrainCache team</li>
                            </ul>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                            <span className="text-xs uppercase tracking-wider text-gray-500">One-time</span>
                            <span className="text-3xl font-semibold text-gray-900">{priceDisplay}</span>
                            <Button variant="primary" size="md" title={upgradeButtonLabel} onClick={upgradePlan} disabled={upgradeDisabled} />
                        </div>
                    </section>
                )}

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Your Spaces</h1>
                    <p className="text-gray-600 mt-2">Organize different brains for projects, teams, or themes.</p>
                </div>

                {error && (
                    <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
                        {error}
                    </div>
                )}

                {upgradeMessage && (
                    <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                        {upgradeMessage}
                    </div>
                )}

                {!paymentsConfigured && plan === "free" && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                        Payments are not yet configured. Please contact support to upgrade to Pro.
                    </div>
                )}

                {plan === "free" && atLimit && (
                    <div className="mb-6 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-900 flex items-center justify-between">
                        <span>You've reached the {spaceLimit}-space limit on the free plan. Upgrade to Pro for unlimited spaces.</span>
                        <Button variant="primary" size="sm" title={upgradeButtonLabel} onClick={upgradePlan} disabled={upgradeDisabled} />
                    </div>
                )}

                
                {plan === "pro" && (
                    <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 px-5 py-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-green-800">Pro plan active</p>
                            <p className="text-xs text-green-700">Enjoy unlimited spaces and premium sharing.</p>
                        </div>
                        <span className="text-sm font-semibold text-green-800">₹0 due</span>
                    </div>
                )}

                {formOpen && (
                    <div className="mb-8 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Create a new space</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="e.g. Growth Experiments"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={60}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                                <textarea
                                    className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Describe what goes in this space."
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    maxLength={240}
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="secondary" size="md" title="Cancel" onClick={() => { setFormOpen(false); setName(""); setDescription(""); }} />
                                <Button variant="primary" size="md" title={submitting ? "Creating..." : "Create Space"} onClick={createSpace} disabled={submitting || !name.trim()} />
                            </div>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-gray-500">Loading spaces...</div>
                ) : spaces.length === 0 ? (
                    <div className="bg-white border border-dashed border-gray-300 rounded-xl p-10 text-center">
                        <p className="text-gray-600 mb-4">No spaces yet. Create one to get started.</p>
                        <Button variant="primary" size="md" title="Create Space" startIcon={<PlusIcon />} onClick={() => setFormOpen(true)} disabled={plan === "free" && atLimit} />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {spaces.map((space) => (
                            <div key={space._id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-semibold text-gray-900 truncate">{space.name}</h3>
                                        {space.shareHash && (
                                            <span className="text-xs uppercase font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                                Shared
                                            </span>
                                        )}
                                    </div>
                                    {space.description ? (
                                        <p className="text-sm text-gray-600 break-words">{space.description}</p>
                                    ) : (
                                        <p className="text-sm text-gray-400 italic">No description provided.</p>
                                    )}
                                </div>
                                <div className="mt-6 flex items-center gap-3">
                                    <Button variant="primary" size="md" title="Open Space" onClick={() => openSpace(space._id)} />
                                    <Button variant="secondary" size="md" title="Share" onClick={() => navigate(`/user/dashboard?spaceId=${space._id}&share=1`)} />
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

