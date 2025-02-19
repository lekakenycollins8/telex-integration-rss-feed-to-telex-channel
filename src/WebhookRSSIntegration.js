const Parser = require('rss-parser');
const axios = require('axios');
const { retry } = require('./utils/retry');

class WebhookRSSFetcher {
    constructor(config) {
        if (!config || !config.webhookUrl) {
            throw new Error('Missing required configuration: webhookUrl is required');
        }

        this.parser = new Parser({
            headers: {
                'User-Agent': 'RSS Feed Reader/1.0',
                'Accept': 'application/rss+xml, application/xml'
            },
            timeout: 5000,
            maxRedirects: 3
        });
        
        this.feeds = config.feeds;
        this.lastFetchedItems = new Map();
        this.webhookUrl = config.webhookUrl;

        this.validateFeeds();
    }

    validateFeeds() {
        if (!Array.isArray(this.feeds)) {
            throw new Error('Feeds must be an array');
        }

        this.feeds.forEach((feed, index) => {
            if (!feed.url || !feed.category) {
                throw new Error(`Invalid feed at index ${index}: must have url and category`);
            }

            try {
                new URL(feed.url);
            } catch (e) {
                throw new Error(`Invalid feed URL at index ${index}: ${feed.url}`);
            }
        });
    }

    async fetchFeeds() {
        try {
            console.log('Starting to fetch feeds...');
            
            if (!Array.isArray(this.feeds) || this.feeds.length === 0) {
                console.warn("No feeds configured or feeds is not an array");
                return [];
            }

            const results = await Promise.all(
                this.feeds.map(async (feed) => {
                    try {
                        const items = await this.fetchSingleFeed(feed);
                        console.log(`Successfully fetched ${items.length} items from ${feed.url}`);
                        return items;
                    } catch (error) {
                        console.error(`Failed to fetch feed ${feed.url}:`, error);
                        return [];
                    }
                })
            );

            const flattenedResults = results.flat().filter(Boolean);
            console.log(`Total items fetched: ${flattenedResults.length}`);
            return flattenedResults;
        } catch (error) {
            console.error("Error fetching feeds", error);
            return [];
        }
    }

    async fetchSingleFeed(feed) {
        try {
            const feedContent = await retry(() => this.parser.parseURL(feed.url), {
                maxAttempts: 3,
                delay: 1000000,
                shouldRetry: (error) => {
                    console.log("Feed fetch error:", error);
                    return error.code === 'ECONNRESET' ||
                           error.code === 'ETIMEDOUT' || 
                           (error.response && error.response.status >= 500);
                }
            });
    
            const lastFetchedGuid = this.lastFetchedItems.get(feed.url);
    
            const newItems = feedContent.items
                .filter(item => !lastFetchedGuid || item.guid !== lastFetchedGuid)
                .map((item) => this.formatFeedItem(item, feed.category));
    
            if (newItems.length > 0 && feedContent.items.length > 0) {
                this.lastFetchedItems.set(feed.url, feedContent.items[0].guid);
            }
            return newItems;
        } catch (error) {
            console.error(`Error fetching feed ${feed.url}`, error);
            return [];
        }
    }

    async sendToWebhook(message) {
        if (!message || typeof message !== 'string' || message.length === 0) {
            console.error("Invalid message format:", message);
            throw new Error("Invalid message format");
        }
    
        try {
            // Updated payload including event_name, message, status, and username
            const payload = {
                event_name: "rss_update",  // You can customize this event name if needed
                message: message,
                status: "success",
                username: "collins"
            };
    
            const response = await retry(
                () => axios.post(
                    this.webhookUrl,
                    payload,
                    {
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                ),
                {
                    maxAttempts: 3,
                    delay: 2000000,
                    shouldRetry: (error) => {
                        console.log("Webhook Error Details:", {
                            status: error.response?.status,
                            statusText: error.response?.statusText,
                            data: error.response?.data,
                            message: error.message
                        });
                        
                        return error.code === 'ECONNRESET' ||
                               error.code === 'ETIMEDOUT' ||
                               (error.response && error.response.status >= 500);
                    }
                }
            );
            
            console.log("Successfully sent message to webhook:", {
                status: response.status,
                data: response.data
            });
    
            return response.data;
        } catch (error) {
            console.error("Webhook Error:", {
                error: error.message,
                response: error.response?.data,
                status: error.response?.status,
                message: message
            });
            throw error;
        }
    }
    

    formatFeedItem(item, category) {
        const emoji = this.getCategoryEmoji(category);
        
        const cleanTitle = item.title
            .replace(/[\u2018\u2019]/g, "'")
            .replace(/[\u201C\u201D]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/[^\x20-\x7E\n]/g, '')
            .trim();
        
        const cleanLink = item.link.trim();
        
        const formattedMessage = `${emoji} ${category}: ${cleanTitle}\n\n🔗 Read more: ${cleanLink}`;
        
        const maxLength = 4000;
        const finalMessage = formattedMessage.length > maxLength 
            ? formattedMessage.substring(0, maxLength - 3) + "..."
            : formattedMessage;
        
        return {
            title: cleanTitle,
            link: cleanLink,
            category: category,
            formattedMessage: finalMessage
        };
    }

    getCategoryEmoji(category) {
        const emojiMap = {
            'Tech': '👨‍💻',
            'Finance': '💰',
            'Cybersecurity': '🔒',
            'Business': '💼'
        };
        return emojiMap[category] || '📰';
    }
}

// Updated config.js
const config = {
    feeds: [
        {
            url: 'https://techcrunch.com/category/technology/feed/',
            category: 'Tech'
        },
        {
            url: 'https://www.wired.com/feed/category/business/latest/rss',
            category: 'Business'
        },
        {
            url: 'https://krebsonsecurity.com/feed/',
            category: 'Cybersecurity'
        }
    ],
    updateInterval: process.env.UPDATE_INTERVAL || 1800000,
    webhookUrl: 'https://ping.telex.im/v1/webhooks/019513df-f990-7957-a978-b7601584d872'
};

// Integration class
class WebhookRSSIntegration {
    constructor() {
        this.rssFetcher = new WebhookRSSFetcher(config);
        this.interval = null;
    }

    async start() {
        console.log('Starting Webhook RSS Integration...');
        await this.fetchAndSend();
        this.interval = setInterval(
            () => this.fetchAndSend(),
            config.updateInterval
        );
    }

    async fetchAndSend() {
        try {
            const feedItems = await this.rssFetcher.fetchFeeds();
            console.log(`Fetched ${feedItems.length} new items`);
    
            for (const item of feedItems) {
                try {
                    if (!item.formattedMessage) {
                        console.error('Invalid feed item:', item);
                        continue;
                    }
                    
                    await this.rssFetcher.sendToWebhook(item.formattedMessage);
                    console.log('Successfully sent message:', item.title);
                    
                    await new Promise(resolve => setTimeout(resolve, 1000000));
                } catch (error) {
                    console.error('Error sending individual message:', error);
                    continue;
                }
            }
        } catch (error) {
            console.error('Error in fetch and send cycle:', error);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('Webhook RSS Integration stopped');
        }
    }
}

// Export the classes
module.exports = {
    WebhookRSSFetcher,
    WebhookRSSIntegration
};