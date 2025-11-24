import { useState } from "react";
import { Type } from "../pages/dashboard"
import EmbedTweet from "./EmbedTweet"
import YouTubeEmbed from "./EmbedYoutube"
import { CardProps } from "./enum"
import { DeleteIcon, DocumentIcon, LinkIcon, ShareIcon, TwitterIcon, YoutubeIcon } from "./icons"
import { ShareItemModal } from "./ShareItemModal"

const icon:{[key in Type]:JSX.Element} = {
    "youtube": <YoutubeIcon/>,
    "twitter": <TwitterIcon/>,
    "document": <DocumentIcon/>,
    "link": <LinkIcon/>,
    "article": <DocumentIcon/>,
    "note": <DocumentIcon/>,
}

export function Card(props: CardProps) {
    const [shareModalOpen, setShareModalOpen] = useState(false);
    const [isNoteExpanded, setIsNoteExpanded] = useState(false);
    
    return (
        <div className="group flex flex-col gap-3 border-2 border-gray-200 shadow-md h-full w-full rounded-lg p-3 md:p-4 bg-white hover:shadow-lg hover:border-violet-300 transition-all duration-300">
            {/* Header with Icon and Actions */}
            <div className="flex justify-between items-start w-full">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                        {icon[props.type]}
                    </div>
                    <h3 className="font-semibold text-sm md:text-base text-gray-900 break-words line-clamp-2 group-hover:text-violet-600 transition-colors">
                        {props.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {props.onReport && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                await props.onReport?.(props._id);
                            }}
                            className="text-xs text-red-500 hover:text-red-600 px-2 py-1 rounded-md hover:bg-red-50 transition-colors"
                            title="Report this content"
                            type="button"
                        >
                            Report
                        </button>
                    )}
                    {!props.readOnly && (
                        <>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShareModalOpen(true);
                                }}
                                className="text-gray-500 hover:text-violet-600 transition-colors p-1 rounded-md hover:bg-violet-50"
                                title="Share this content"
                            >
                                <ShareIcon size={4} color={"gray-600"} />
                            </button>
                            {props.onDelete && (
                                <div className="p-1 rounded-md hover:bg-red-50 transition-colors">
                                    <DeleteIcon Id={props._id} onDelete={() => props.onDelete && props.onDelete(props._id)} />
                                </div>
                            )}
                        </>
                    )}
                    {/* Share Item Modal */}
                    <ShareItemModal
                        open={shareModalOpen}
                        onClose={() => setShareModalOpen(false)}
                        itemId={props._id.toString()}
                        itemTitle={props.title}
                    />
                </div>
            </div>
            
            

            {/* Content Section */}
            <div className="w-full flex-1 flex flex-col min-h-0">
                {props.type === "youtube" && props.link && (
                    <div className="flex-1 min-h-0">
                        <YouTubeEmbed link={props.link} />
                    </div>
                )}
                {props.type === "twitter" && props.link && (
                    <div className="flex-1 min-h-0">
                        <EmbedTweet tweetLink={props.link} />
                    </div>
                )}
                
                {props.type === "link" && (
                    <div className="p-3 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-md border border-violet-200 flex-1 flex items-center">
                        <a
                            className="text-violet-600 break-words block hover:text-violet-700 hover:underline font-medium text-xs md:text-sm w-full"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={props.link}
                        >
                            {props.link}
                        </a>
                    </div>
                )}

                {props.type === "article" && (
                    <div className="p-3 bg-gradient-to-br from-violet-50 to-indigo-50 rounded-md border border-violet-200 flex-1 flex flex-col gap-2">
                        <a
                            className="text-violet-600 break-words block hover:text-violet-700 hover:underline font-medium text-xs md:text-sm w-full"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={props.link}
                        >
                            {props.link}
                        </a>
                        {props.body && (
                            <p className="text-xs text-gray-600 line-clamp-3 whitespace-pre-wrap break-words">
                                {props.body}
                            </p>
                        )}
                    </div>
                )}

                {/* ✅ Fixed PDF Viewer */}
                {props.type === "document" && (
                    <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
                        <div className="flex-1 min-h-0">
                            <iframe
                                src={props.link}
                                className="w-full h-full min-h-[200px] md:min-h-[250px] border border-gray-200 rounded-md shadow-sm"
                            />
                        </div>
                        <a
                            href={props.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-700 font-medium text-xs md:text-sm inline-flex items-center gap-1.5 hover:underline"
                        >
                            <DocumentIcon />
                            <span>Open PDF</span>
                        </a>
                    </div>
                )}

                {props.type === "note" && (
                    <div className="w-full flex flex-col gap-2 flex-1 min-h-0">
                        <div className="flex-1 min-h-0">
                            {props.body ? (
                                <>
                                    <p
                                        className={`text-xs md:text-sm text-gray-700 whitespace-pre-wrap break-words ${
                                            isNoteExpanded ? "" : "line-clamp-4"
                                        }`}
                                    >
                                        {props.body}
                                    </p>
                                    {props.body.length > 180 && (
                                        <button
                                            type="button"
                                            onClick={() => setIsNoteExpanded(!isNoteExpanded)}
                                            className="mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                                        >
                                            {isNoteExpanded ? "Show less" : "Show more"}
                                        </button>
                                    )}
                                </>
                            ) : (
                                <p className="text-xs md:text-sm text-gray-400 italic">
                                    No content
                                </p>
                            )}
                        </div>
                        {props.link && (
                            <a
                                href={props.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-violet-600 hover:text-violet-700 font-medium text-xs md:text-sm inline-flex items-center gap-1.5 hover:underline"
                            >
                                <LinkIcon />
                                <span>Open link</span>
                            </a>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
