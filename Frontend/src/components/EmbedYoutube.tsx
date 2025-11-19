import React from "react";

type YouTubeEmbedProps = {
  link: string;
};

const YouTubeEmbed: React.FC<YouTubeEmbedProps> = ({ link }) => {
  // Extract the video ID from the link
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([^&]+)|youtu\.be\/([^?&]+)/);
    return match ? match[1] || match[2] : null;
  };

  const videoId = getYouTubeVideoId(link);

  if (!videoId) {
    return <div>Invalid YouTube link</div>;
  }

  return (
    <div className="youtube-embed w-full rounded-lg overflow-hidden">
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-lg"
          src={`https://www.youtube.com/embed/${videoId}`}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
};

export default YouTubeEmbed
