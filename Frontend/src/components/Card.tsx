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
}

export function Card(props: CardProps) {
    const [shareModalOpen, setShareModalOpen] = useState(false);
    
    return (
        <div className="flex flex-wrap flex-col gap-4 border-1 border-gray-200 shadow-xl h-fit w-72 rounded-md p-4">
            {/* Header with Icon and Actions */}
            <div className="flex justify-between w-full font-medium text-gray-600">
                <div className="flex items-center gap-2">
                    {icon[props.type]}
                    {props.title}
                </div>
                {!props.readOnly && (
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setShareModalOpen(true);
                            }}
                            className="text-gray-600 hover:text-gray-900"
                            title="Share this content"
                        >
                            <ShareIcon size={4} color={"gray-600"} />
                        </button>
                        {props.onDelete && (
                            <DeleteIcon Id={props._id} onDelete={() => props.onDelete && props.onDelete(props._id)} />
                        )}
                    </div>
                )}
            </div>
            
            {/* Share Item Modal */}
            <ShareItemModal
                open={shareModalOpen}
                onClose={() => setShareModalOpen(false)}
                itemId={props._id.toString()}
                itemTitle={props.title}
            />

            {/* Content Section */}
            <div className="w-full">
                {props.type === "youtube" && <YouTubeEmbed link={props.link} />}
                {props.type === "twitter" && <EmbedTweet tweetLink={props.link} />}
                
                {props.type === "link" && (
                    <div>
                        <a
                            className="text-violet-500 break-words block"
                            target="_blank"
                            rel="noopener noreferrer"
                            href={props.link}
                        >
                            {props.link}
                        </a>
                    </div>
                )}

                {/* ✅ Fixed PDF Viewer */}
                {props.type === "document" && (
                    <div className="w-full flex flex-col gap-2">
                        <iframe
                            src={props.link}
                            className="w-full h-64 border rounded-md"
                        />
                        <a
                            href={props.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                        >
                            Open PDF
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
