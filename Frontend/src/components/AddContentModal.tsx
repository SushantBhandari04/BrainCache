import { Input } from "./Input";
import { Button } from "./button";
import { CrossIcon } from "./icons";
import { TypeInput } from "./TypeInput";
import { Dispatch, SetStateAction, useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { Type } from "../pages/dashboard";
import { ObjectId } from "mongodb";

export function AddContentModal({ 
    setOpen, 
    setContent 
}: { 
    setOpen: (prop: boolean) => void, 
    setContent: Dispatch<SetStateAction<{ title: string; link: string; type: Type; _id: ObjectId }[]>>
}) {
    const titleRef = useRef<HTMLInputElement | null>(null);
    const linkRef = useRef<HTMLInputElement | null>(null);
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

    const closeOnEsc = useCallback((e: KeyboardEvent) => {
        if (e.key === "Escape") setOpen(false);
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
        const link = linkRef.current?.value?.trim();

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
        if (selectedType === "document" && !file && !link) {
            setErrorMessage("Upload a PDF or provide a link.");
            return false;
        }
        if (selectedType !== "document" && !link) {
            setErrorMessage("Please provide a link.");
            return false;
        }
        if (selectedType !== "document" && link && !isValidUrl(link)) {
            setErrorMessage("Please provide a valid URL.");
            return false;
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

        let fileUrl = linkRef.current?.value?.trim() || "";

        setSubmitting(true);
        if (selectedType === "document" && file) {
            const formData = new FormData();
            formData.append("pdf", file);

            setUploading(true);
            try {
                const uploadRes = await axios.post(`${BACKEND_URL}/api/v1/upload`, formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: localStorage.getItem("token"),
                    },
                });

                fileUrl = uploadRes.data.url; // ✅ Use backend response URL
            } catch (error) {
                console.error("Upload failed", error);
                setErrorMessage("Failed to upload PDF. Please try again.");
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        // Save Content (PDF or Link)
        try {
            const response = await axios.post(`${BACKEND_URL}/api/v1/content`, {
                title: titleRef.current?.value?.trim() || file?.name,
                link: fileUrl,
                type: selectedType
            }, {
                headers: {
                    Authorization: localStorage.getItem("token")
                }
            });

            setContent(prev => [...prev, response.data.content]);
            setOpen(false);
        } catch (error) {
            console.error("Error saving content", error);
            setErrorMessage("Failed to save content. Please try again.");
        }
        setSubmitting(false);
    }

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex justify-center items-center z-50 px-4" onClick={() => setOpen(false)}>
            <div role="dialog" aria-modal="true" aria-labelledby="add-content-title" className="bg-white w-full max-w-lg border rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => { if (e.key === 'Enter' && !(uploading || submitting)) submit(); }}>
                {(uploading || submitting) && (
                    <div className="mb-4 h-1 w-full bg-gray-100 overflow-hidden rounded">
                        <div className="h-full w-1/3 bg-violet-500 animate-pulse rounded" />
                    </div>
                )}
                <div className="flex items-start justify-between mb-4">
                    <div className="mb-8">
                        <div id="add-content-title" className="text-xl font-semibold">Add Content</div>
                        <div className="text-xs text-gray-500 mt-1">Embed a link or upload a PDF.</div>
                    </div>
                    <CrossIcon onClick={() => setOpen(false)} />
                </div>

                <div className="mt-4 flex flex-col gap-6">
                    <Input reference={titleRef} placeholder="Add a clear title" title="Title : " />

                    <div className="flex flex-col gap-2">
                        <TypeInput 
                            reference={typeRef}
                            onChange={(e) => setSelectedType(e.target.value)}
                        />
                        {/* <div className="text-[11px] text-gray-500">Choose the type of content you are adding.</div> */}
                    </div>

                    <div className="flex flex-col gap-1 mb-6">
                        <Input 
                            reference={linkRef} 
                            placeholder={selectedType === 'document' ? "Optional: paste a document URL" : "Paste a link (YouTube, tweet, webpage)"} 
                            title="Link : " 
                        />
                        {/* <div className="text-[11px] text-gray-500 pl-1">{selectedType === 'document' ? 'You can upload a PDF or provide its URL.' : 'Paste a valid URL for the selected type.'}</div> */}
                    </div>

                    {selectedType === "document" && (
                        <div>
                            <label className="text-gray-700 font-medium">Upload PDF</label>
                            <div
                                className={`mt-2 border-2 ${dragOver ? 'border-violet-400 bg-violet-50' : 'border-dashed border-gray-300'} rounded-xl p-5 text-center cursor-pointer transition-colors`}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files && e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
                                onClick={() => document.getElementById('pdf-input')?.click()}
                            >
                                <div className="text-sm text-gray-600">Drag & drop your PDF here, or click to browse</div>
                                {file && (
                                    <div className="mt-3 flex items-center justify-center gap-3 text-sm">
                                        <span className="truncate max-w-[220px] text-gray-800">{file.name}</span>
                                        <span className="text-gray-400">·</span>
                                        <span className="text-gray-600">{Math.round(file.size / 1024)} KB</span>
                                        <button className="text-violet-600 underline" type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }}>Remove</button>
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
                            <div className="text-[11px] text-gray-500 mt-2">PDF files only.</div>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">{errorMessage}</div>
                    )}
                </div>

                <div className="mt-5 flex justify-end gap-3">
                    <Button title="Cancel" variant="secondary" size="md" onClick={() => setOpen(false)} disabled={uploading || submitting} />
                    <Button 
                        title={uploading || submitting ? "Saving..." : "Add"} 
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
