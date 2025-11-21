import { useState, useEffect, useCallback } from "react";
import { CrossIcon } from "./icons";
import { Button } from "./button";

type CreateSpaceModalProps = {
    open: boolean;
    onClose: () => void;
    onSubmit: (name: string, description: string) => Promise<void>;
    submitting: boolean;
    atLimit: boolean;
};

export function CreateSpaceModal({ open, onClose, onSubmit, submitting, atLimit }: CreateSpaceModalProps) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    const handleClose = useCallback(() => {
        setName("");
        setDescription("");
        onClose();
    }, [onClose]);

    const handleSubmit = async () => {
        if (!name.trim()) return;
        if (atLimit) return;
        await onSubmit(name.trim(), description.trim());
        setName("");
        setDescription("");
    };

    const closeOnEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            handleClose();
        }
    }, [handleClose]);

    useEffect(() => {
        if (open) {
            document.addEventListener("keydown", closeOnEsc);
        }
        return () => {
            document.removeEventListener("keydown", closeOnEsc);
        };
    }, [open, closeOnEsc]);

    if (!open) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 px-4 animate-in fade-in" 
            onClick={handleClose}
        >
            <div 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="create-space-title" 
                className="bg-white w-full max-w-2xl border-2 border-gray-200 rounded-3xl p-6 md:p-8 shadow-2xl animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { 
                    if (e.key === 'Escape') handleClose();
                    if (e.key === 'Enter' && !submitting && name.trim()) handleSubmit(); 
                }}
            >
                {submitting && (
                    <div className="mb-6 h-1.5 w-full bg-gray-100 overflow-hidden rounded-full">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse rounded-full" style={{ width: '60%' }} />
                    </div>
                )}

                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 id="create-space-title" className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Create New Space</h2>
                        <p className="text-sm text-gray-500">Organize your content into dedicated workspaces.</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close modal"
                        disabled={submitting}
                    >
                        <CrossIcon onClick={() => {}} />
                    </button>
                </div>

                {atLimit && (
                    <div className="mb-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
                        <div className="flex items-center gap-2">
                            <span className="font-medium">⚠</span>
                            <span>You've reached the space limit. Upgrade to Pro to create more spaces.</span>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            placeholder="Enter space name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={60}
                            disabled={submitting || atLimit}
                            autoFocus
                        />
                        <p className="text-xs text-gray-500 mt-1.5">{name.length}/60</p>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Description <span className="text-gray-400 text-xs font-normal">(optional)</span>
                        </label>
                        <textarea
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none"
                            placeholder="Add a description for this space"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            maxLength={240}
                            disabled={submitting || atLimit}
                        />
                        <p className="text-xs text-gray-500 mt-1.5">{description.length}/240</p>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button 
                        title="Cancel" 
                        variant="secondary" 
                        size="md" 
                        onClick={handleClose} 
                        disabled={submitting} 
                    />
                    <Button 
                        title={submitting ? "Creating..." : "Create Space"} 
                        variant="primary" 
                        size="md" 
                        onClick={handleSubmit} 
                        disabled={submitting || !name.trim() || atLimit}
                    />
                </div>
            </div>
        </div>
    );
}

