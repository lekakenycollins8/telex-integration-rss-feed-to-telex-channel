const express = require('express');
const { WebhookRSSIntegration } = require('./WebhookRSSIntegration');
const integrationSpecs = require('./integration-spec');

const app = express();
const port = process.env.PORT || 3000;
const integration = new WebhookRSSIntegration();

app.use(express.json());

// Endpoint to manually trigger feed fetching and sending
app.post('/tick', async (req, res) => {
    try {
        await integration.fetchAndSend();
        res.json({ status: 'success', message: 'Feeds fetched and sent successfully' });
    } catch (error) {
        console.error('Error in /tick:', error);
        res.status(500).json({ status: 'error', message: 'Failed to fetch and send feeds' });
    }
});

// Endpoint to retrieve integration configuration
app.get('/integration.json', (req, res) => {
    res.json(integrationSpecs);
});

// Start the integration service
integration.start().catch(error => {
    console.error('Error starting integration:', error);
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
