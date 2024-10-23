require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const ethers = require('ethers');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const cron = require('node-cron');

// Environment variables
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TARGET_ADDRESS = '0x974caa59e49682cda0ad2bbe82983419a2ecc400';
const TELEGRAM_CHAT_TWO_ID = '-1002455714279';

// Initialize Telegram bot
const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });


// Express app setup
const app = express();
const PORT = process.env.PORT || 8021;

// Middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({ origin: '*', credentials: true }));

// Initialize ETH price cache
let ethPriceUSD = 0;

async function getEthPrice() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        ethPriceUSD = response.data.ethereum.usd;
    } catch (error) {
        console.error('Error fetching ETH price:', error.message);
    }
}

async function monitorTransactions() {
    try {
        // Update ETH price
        await getEthPrice();

        // Get transactions from Etherscan API
        const response = await axios.get(`https://api.etherscan.io/api`, {
            params: {
                module: 'account',
                action: 'txlist',
                address: TARGET_ADDRESS,
                startblock: 0,
                endblock: 99999999,
                page: 1,
                offset: 10,
                sort: 'desc',
                apikey: ETHERSCAN_API_KEY
            }
        });

        if (response.data.status === '1' && response.data.result.length > 0) {
            for (const tx of response.data.result) {
                // Only process transactions with value > 0.38 ETH
                const ethValue = parseFloat(ethers.formatEther(tx.value));
                if (ethValue >= 0.38 && tx.to !== TARGET_ADDRESS) {
                    const usdValue = (ethValue * ethPriceUSD).toFixed(2);
                    
                    // Format message
                    const message = `
${tx.to}

$${usdValue}

🦖
`;
// Send to Telegram
await bot.sendMessage(TELEGRAM_CHAT_ID, message);
await bot.sendMessage(TELEGRAM_CHAT_TWO_ID, message);
console.log(message)
                    // console.log(botMess)
                }
            }
        }
    } catch (error) {
        // console.log(error)
        console.error('Error monitoring transactions:', error.message);
    }
}


// Run every 1 minute
setInterval(monitorTransactions, 60000);

// Initial run
monitorTransactions();

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    
});


cron.schedule('0 * * * *', ()=> {
    monitorTransactions();
})

console.log('Bot started successfully!');