import React from 'react';
import { TwitterTweetEmbed } from 'react-twitter-embed';

interface EmbedTweetProps {
  tweetLink: string;
}

const EmbedTweet: React.FC<EmbedTweetProps> = ({ tweetLink }) => {
  console.log(tweetLink);
  const tweetId = tweetLink.split('/').pop(); // Extract the tweet ID from the link
  console.log(tweetId)

  if (!tweetId) {
    return <p>Invalid tweet link</p>;
  }

  return (
      <TwitterTweetEmbed tweetId={tweetId} />
  );
};

export default EmbedTweet;
