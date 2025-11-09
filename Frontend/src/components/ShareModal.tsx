import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Button } from "./button";
import { CrossIcon } from "./icons";

export function ShareModal({ open, onClose }: { open: boolean; onClose: () => void }) {
    const [isShared, setIsShared] = useState<boolean | null>(null);
    const [currentHash, setCurrentHash] = useState<string | null>(null);
    const shareLink = useMemo(() => currentHash ? `${window.location.origin}/share/${currentHash}` : "", [currentHash]);

    async function fetchShareState() {
        try {
            // Ping enable with share=true to get existing hash without changing state
            const res = await axios.post(`${BACKEND_URL}/api/v1/brain/share`, { share: true }, {
                headers: { Authorization: localStorage.getItem("token") || "" }
            });
            if (res?.data?.hash) {
                setIsShared(true);
                setCurrentHash(res.data.hash);
            } else {
                setIsShared(false);
                setCurrentHash(null);
            }
        } catch {
            setIsShared(false);
            setCurrentHash(null);
        }
    }

    useEffect(() => {
        if (open) fetchShareState();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    async function enableSharing() {
        try {
            const res = await axios.post(`${BACKEND_URL}/api/v1/brain/share`, { share: true }, {
                headers: { Authorization: localStorage.getItem("token") || "" }
            });
            setIsShared(true);
            setCurrentHash(res.data.hash);
        } catch (e) {
            alert("Failed to enable sharing");
        }
    }

    async function disableSharing() {
        try {
            await axios.post(`${BACKEND_URL}/api/v1/brain/share`, { share: false }, {
                headers: { Authorization: localStorage.getItem("token") || "" }
            });
            setIsShared(false);
            setCurrentHash(null);
        } catch (e) {
            alert("Failed to disable sharing");
        }
    }

    function copyLink() {
        if (!shareLink) return;
        navigator.clipboard.writeText(shareLink);
        alert("Share link copied.");
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50 transition-all duration-300 ease-in-out">
            <div className="bg-white w-full max-w-md border-2 rounded-lg p-6 flex flex-col gap-6 items-stretch shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="text-xl font-semibold">Share Brain</div>
                    <CrossIcon onClick={onClose} />
                </div>

                <div className="flex flex-col gap-3">
                    {isShared ? (
                        <>
                            <div className="text-green-700 font-medium">Sharing is enabled.</div>
                            <div className="text-sm break-all border rounded p-2 bg-gray-50">{shareLink}</div>
                            <div className="flex gap-3">
                                <Button variant="secondary" size="md" title="Copy Link" onClick={copyLink} />
                                <Button variant="danger" size="md" title="Disable Sharing" onClick={disableSharing} />
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="text-gray-700">Sharing is disabled.</div>
                            <Button variant="primary" size="md" title="Enable Sharing" onClick={enableSharing} />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}


