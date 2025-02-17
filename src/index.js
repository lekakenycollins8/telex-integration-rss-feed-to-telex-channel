const RSSFetcher = require('./RSSFetcher');
const config = require('./config');

class TelexRSSIntegration {
    constructor() {
        this.rssFetcher = new RSSFetcher(config);
        this.interval = null;
    }

    async start() {
        console.log('Starting Telex RSS Integration...');

        // initial fetch
        await this.fetchAndSend();

        // setup interval to fetch feeds
        this.interval = setInterval(
            () => this.fetchAndSend(),
            config.updateInterval
        );
    }

    async fetchAndSend() {
        try {
            const feedItems = await this.rssFetcher.fetchFeeds();

            for (const item of feedItems) {
                await this.rssFetcher.sendToTelex(item.formattedMessage);
                // Add a small delay between messages to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error('Error fetching and sending cycles', error);
        }
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('Telex RSS Integration stopped');
        }
    }
}

// Start the integration
const integration = new TelexRSSIntegration();
integration.start().catch(error => {
    console.error('Error starting integration', error);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, stopping Telex RSS Integration...');
    integration.stop();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, stopping Telex RSS Integration...');
    integration.stop();
    process.exit(0);
});
