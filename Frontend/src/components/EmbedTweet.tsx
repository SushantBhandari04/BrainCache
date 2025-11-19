import React from 'react';
import { TwitterTweetEmbed } from 'react-twitter-embed';

interface EmbedTweetProps {
  tweetLink: string;
}

const EmbedTweet: React.FC<EmbedTweetProps> = ({ tweetLink }) => {
  const tweetId = tweetLink.split('/').pop()?.split('?')[0]; // Extract the tweet ID from the link

  if (!tweetId) {
    return (
      <div className="w-full p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Invalid tweet link</p>
      </div>
    );
  }

  return (
    <div className="w-full flex justify-center">
      <div className="w-full max-w-[550px]">
        <TwitterTweetEmbed tweetId={tweetId} />
      </div>
    </div>
  );
};

export default EmbedTweet;
