require('dotenv').config();

module.exports = {
    token: process.env.DISCORD_TOKEN,
    clientId: process.env.CLIENT_ID,
    prefix: process.env.PREFIX || '-',
    ownerId: process.env.OWNER_ID,
    
    dmDelay: parseInt(process.env.DM_DELAY) || 10000,
    batchSize: parseInt(process.env.BATCH_SIZE) || 1,
    batchDelay: parseInt(process.env.BATCH_DELAY) || 0,
    
    embedColor: '#0099ff',
    maxMessageLength: 2000,
    
    botStatus: {
        type: 'STREAMING',
        name: 'HOOK',   // حالة البوت
        url: 'https://twitch.tv/HOOK'
    },
    
    requiredPermissions: ['SendMessages', 'EmbedLinks', 'ReadMessageHistory']
};
