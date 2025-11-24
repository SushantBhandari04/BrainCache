import { Button } from "./button";
import { CrossIcon, DocumentIcon } from "./icons";
import { TypeInput } from "./TypeInput";
import { Dispatch, SetStateAction, useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Type } from "../pages/dashboard";
import { ObjectId } from "mongodb";

export function AddContentModal({ 
    setOpen, 
    setContent,
    spaceId,
    spaceName
}: { 
    setOpen: (prop: boolean) => void, 
    setContent: Dispatch<SetStateAction<{ title: string; link?: string; type: Type; _id: ObjectId; body?: string }[]>>,
    spaceId: string | null,
    spaceName?: string
}) {
    const titleRef = useRef<HTMLInputElement | null>(null);
    const linkRef = useRef<HTMLInputElement | null>(null);
    const bodyRef = useRef<HTMLTextAreaElement | null>(null);
    const typeRef = useRef<HTMLSelectElement | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState("");
    const [dragOver, setDragOver] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        setSelectedType(typeRef.current?.value || "");
    }, []);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFile(event.target.files[0]);
        }
    };

    const handleClose = useCallback(() => {
        // Reset form when closing
        if (titleRef.current) titleRef.current.value = "";
        if (linkRef.current) linkRef.current.value = "";
        if (bodyRef.current) bodyRef.current.value = "";
        if (typeRef.current) typeRef.current.value = "youtube";
        setSelectedType("youtube");
        setFile(null);
        setErrorMessage(null);
        setOpen(false);
    }, [setOpen]);

    const closeOnEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") {
            if (titleRef.current) titleRef.current.value = "";
            if (linkRef.current) linkRef.current.value = "";
            if (bodyRef.current) bodyRef.current.value = "";
            if (typeRef.current) typeRef.current.value = "youtube";
            setSelectedType("youtube");
            setFile(null);
            setErrorMessage(null);
            setOpen(false);
        }
    }, [setOpen]);

    useEffect(() => {
        document.addEventListener("keydown", closeOnEsc);
        return () => document.removeEventListener("keydown", closeOnEsc);
    }, [closeOnEsc]);

    // Autofocus title when modal opens
    useEffect(() => {
        titleRef.current?.focus();
    }, []);

    function validate(): boolean {
        setErrorMessage(null);
        const title = titleRef.current?.value?.trim();
        const body = bodyRef.current?.value?.trim();

        const isValidUrl = (u?: string) => {
            if (!u) return false;
            try { new URL(u); return true; } catch { return false; }
        };

        if (!selectedType) {
            setErrorMessage("Please select a content type.");
            return false;
        }
        if (!title) {
            setErrorMessage("Please enter a title.");
            return false;
        }
        if (selectedType === "document") {
            if (!file) {
                setErrorMessage("Please upload a PDF.");
                return false;
            }
        } else if (selectedType === "note") {
            if (!body) {
                setErrorMessage("Please enter note content.");
                return false;
            }
        } else {
            const link = linkRef.current?.value?.trim();
            if (!link) {
                setErrorMessage("Please provide a link.");
                return false;
            }
            if (link && !isValidUrl(link)) {
                setErrorMessage("Please provide a valid URL.");
                return false;
            }
        }
        if (file && file.type !== 'application/pdf') {
            setErrorMessage("Only PDF files are allowed.");
            return false;
        }
        // 10 MB size cap (adjust as needed)
        if (file && file.size > 10 * 1024 * 1024) {
            setErrorMessage("PDF size must be less than 10 MB.");
            return false;
        }
        return true;
    }

    async function submit() {
        if (!validate()) return;

        if(!spaceId){
            setErrorMessage("No space selected. Please pick a space before adding content.");
            return;
        }

        setSubmitting(true);
        try {
            let linkValue: string | undefined;
            let bodyValue: string | undefined;

            if (selectedType === "document") {
                if (!file) {
                    setErrorMessage("Please upload a PDF.");
                    return;
                }

                const formData = new FormData();
                formData.append("pdf", file);

                setUploading(true);
                try {
                    const uploadRes = await axios.post(`${BACKEND_URL}/api/v1/upload`, formData, {
                        headers: {
                            "Content-Type": "multipart/form-data",
                            Authorization: localStorage.getItem("token") || "",
                        },
                    });
                    linkValue = uploadRes.data.url;
                } catch (error: any) {
                    console.error("Upload failed", error);
                    let message: string | null = null;
                    if (axios.isAxiosError(error) && error.response) {
                        const data: any = error.response.data || {};
                        message = data.error || data.message || null;
                    }
                    setErrorMessage(message || "Failed to upload PDF. Please try again.");
                    return;
                } finally {
                    setUploading(false);
                }
            } else if (selectedType === "note") {
                bodyValue = bodyRef.current?.value?.trim() || undefined;
            } else {
                linkValue = linkRef.current?.value?.trim() || undefined;
            }

            const payload: any = {
                title: titleRef.current?.value?.trim() || file?.name,
                type: selectedType,
                spaceId
            };

            if (linkValue) {
                payload.link = linkValue;
            }
            if (bodyValue) {
                payload.body = bodyValue;
            }

            const response = await axios.post(`${BACKEND_URL}/api/v1/content`, payload, {
                headers: {
                    Authorization: localStorage.getItem("token") || "",
                },
            });

            setContent(prev => [...prev, response.data.content]);

            // Reset form
            if (titleRef.current) titleRef.current.value = "";
            if (linkRef.current) linkRef.current.value = "";
            if (bodyRef.current) bodyRef.current.value = "";
            if (typeRef.current) typeRef.current.value = "youtube";
            setSelectedType("youtube");
            setFile(null);
            setErrorMessage(null);
            setOpen(false);
        } catch (error: any) {
            console.error("Error saving content", error);
            let message: string | null = null;
            if (axios.isAxiosError(error) && error.response) {
                const data: any = error.response.data || {};
                message = data.message || data.error || null;
            }
            setErrorMessage(message || "Failed to save content. Please try again.");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center z-50 px-4 animate-in fade-in" onClick={handleClose}>
            <div 
                role="dialog" 
                aria-modal="true" 
                aria-labelledby="add-content-title" 
                className="bg-white w-full max-w-2xl border-2 border-gray-200 rounded-3xl p-8 shadow-2xl animate-in slide-in-from-bottom-4 max-h-[90vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => { 
                    if (e.key === 'Escape') handleClose();
                    if (e.key === 'Enter' && !(uploading || submitting)) submit(); 
                }}
            >
                {(uploading || submitting) && (
                    <div className="mb-6 h-1.5 w-full bg-gray-100 overflow-hidden rounded-full">
                        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 animate-pulse rounded-full" style={{ width: '60%' }} />
                    </div>
                )}
                
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 id="add-content-title" className="text-3xl font-bold text-gray-900 mb-2">Add Content</h2>
                        <p className="text-sm text-gray-500">Embed links, upload PDFs, or save web content to your space.</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                        aria-label="Close modal"
                    >
                        <CrossIcon onClick={() => {}} />
                    </button>
                </div>

                <div className="mb-6 px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200">
                    <div className="text-xs font-semibold text-violet-600 uppercase tracking-wider mb-1">Saving to</div>
                    <div className="text-sm font-semibold text-gray-900">{spaceName || "No space selected"}</div>
                </div>

                <div className="flex flex-col gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            ref={titleRef}
                            type="text"
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                            placeholder="e.g. React Best Practices, Important Article..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Content Type <span className="text-red-500">*</span>
                        </label>
                        <TypeInput 
                            reference={typeRef}
                            onChange={(e) => setSelectedType(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-2">
                            Choose the type of content you're adding to help organize your space.
                        </p>
                    </div>

                    {selectedType !== "document" && selectedType !== "note" && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Link <span className="text-red-500">*</span>
                            </label>
                            <input
                                ref={linkRef}
                                type="text"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all"
                                placeholder={
                                    selectedType === 'youtube'
                                        ? "https://www.youtube.com/watch?v=..."
                                        : selectedType === 'twitter'
                                        ? "https://twitter.com/username/status/..."
                                        : "https://example.com/article"
                                }
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                {`Paste a valid ${selectedType === 'youtube' ? 'YouTube' : selectedType === 'twitter' ? 'Twitter/X' : 'web'} URL.`}
                            </p>
                        </div>
                    )}

                    {selectedType === 'note' && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Note Body <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                ref={bodyRef}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all resize-none"
                                placeholder="Write your note here..."
                                rows={5}
                            />
                            <p className="text-xs text-gray-500 mt-2">
                                Capture your own thoughts, summaries, or takeaways. Notes are stored directly in BrainCache.
                            </p>
                        </div>
                    )}

                    {selectedType === "document" && (
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Upload PDF <span className="text-gray-400 text-xs font-normal">(Max 10MB)</span>
                            </label>
                            <div
                                className={`mt-2 border-2 ${dragOver ? 'border-violet-500 bg-violet-50' : 'border-dashed border-gray-300'} rounded-xl p-8 text-center cursor-pointer transition-all hover:border-violet-400 hover:bg-violet-50/50`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
                                onClick={() => document.getElementById('pdf-input')?.click()}
                            >
                                {!file ? (
                                    <>
                                        <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center">
                                            <DocumentIcon className="size-8 text-violet-600" />
                                        </div>
                                        <div className="text-sm font-medium text-gray-700 mb-1">Drag & drop your PDF here</div>
                                        <div className="text-xs text-gray-500">or click to browse</div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center">
                                            <DocumentIcon className="size-8 text-green-600" />
                                        </div>
                                        <div className="text-sm font-semibold text-gray-800 truncate max-w-full">{file.name}</div>
                                        <div className="text-xs text-gray-500">{Math.round(file.size / 1024)} KB</div>
                                        <button 
                                            className="text-sm text-violet-600 hover:text-violet-700 font-medium underline" 
                                            type="button" 
                                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                        >
                                            Remove file
                                        </button>
                                    </div>
                                )}
                            </div>
                            <input
                                id="pdf-input"
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                                disabled={uploading || submitting}
                            />
                        </div>
                    )}

                    {errorMessage && (
                        <div className="text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded-lg p-4 shadow-sm">
                            <div className="flex items-center gap-2">
                                <span className="text-red-500 font-semibold">⚠</span>
                                <span>{errorMessage}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-gray-200">
                    <Button 
                        title="Cancel" 
                        variant="secondary" 
                        size="md" 
                        onClick={handleClose} 
                        disabled={uploading || submitting} 
                    />
                    <Button 
                        title={uploading ? "Uploading..." : submitting ? "Saving..." : "Add Content"} 
                        variant="primary" 
                        size="md" 
                        onClick={submit} 
                        disabled={uploading || submitting}
                    />
                </div>
            </div>
        </div>
    );
}
