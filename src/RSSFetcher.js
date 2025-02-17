const Parser = require('rss-parser');
const axios = require('axios');
const { text } = require('express');

class RSSFetcher {
    constructor(config) {
        this.parser = new Parser();
        this.feeds = config.feeds;
        this.lastFetchedItems = new Map();
        this.telexToken = config.telexToken;
        this.channelId = config.channelId;
    }

    async fetchFeeds() {
        try {
            const results = await Promise.all(this.feeds.map(feed => this.fetchSingleFeed(feed))
            );
            return results.flat().filter(Boolean);
        } catch (error) {
            console.error("Error fetching feeds", error);
            return [];
        }
    }

    async fetchSingleFeed(feed) {
        try {
            const feedContent = await this.parser.parseURL(feed.url);
            const lastFetchedGuid = this.lastFetchedItems.get(feed.url);

            const newItems = feedContent.items
                .filter(item => !lastFetchedGuid || item.guid !== lastFetchedGuid)
                .map(item => formatFeedItem(item, feed.category));

            if (newItems.length > 0) {
                this.lastFetchedItems.set(feed.url, feedContent.items[0].guid);
            }
            return newItems;
        } catch (error) {
            console.error(`Erro fetching feed ${feed.url}`, error);
            return [];
        }
    }

    formatFeedItem(item, category) {
        const emoji = this.getCategoryEmoji(category);
        return {
            title: item.title,
            link: item.link,
            category: category,
            formattedMessage: `${emoji} ${category}: ${item.title}\n\n🔗 Read more: ${item.link}`
        };
    }

    getCategoryEmoji(category) {
        const emojiMap = {
        'Tech': '🚀',
        'Finance': '💰',
        'Cybersecurity': '🔒'
        };
        return emojiMap[category] || '📰';
    }

    async sendToTelex(message) {
        try {
            const response = await axios.post(`https://api.staging.telex.im/api/v1/${this.channelId}/messages`, {
                text: message
            }, {
                headers: {
                    'Authorization': `Bearer ${this.telexToken}`,
                    'Content-Type': 'application/json',
                }
            });
            return response.data;
        } catch (error) {
            console.error("Error sending message to Telex", error);
            throw error;
        }
    }
}

module.exports = RSSFetcher;