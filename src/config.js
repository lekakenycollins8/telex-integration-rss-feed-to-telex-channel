const dotenv = require('dotenv');
dotenv.config();

const config = {
    feeds: [
        {
            url: 'https://techcrunch.com/feed/',
            category: 'Tech'
        },
        {
            url: 'https://www.bloomberg.com/feeds/technology.rss',
            category: 'Finance'
        },
        {
            url: 'https://krebsonsecurity.com/feed/',
            category: 'Cybersecurity'
        }
    ],
    updateInterval: process.env.UPDATE_INTERVAL || 1800000,
    telexToken: process.env.TELEX_TOKEN,
    channelId: process.env.TELEX_CHANNEL_ID
};