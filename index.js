const { Client, GatewayIntentBits, Collection, EmbedBuilder, ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config');
const Logger = require('./utils/logger');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.name, command);
    Logger.info(`Loaded command: ${command.name}`);
}

client.once('ready', () => {
    Logger.success(`Bot is ready! Logged in as ${client.user.tag}`);
    Logger.info(`Bot is in ${client.guilds.cache.size} servers`);
    
    const statusType = config.botStatus.type === 'STREAMING' ? ActivityType.Streaming :
                      config.botStatus.type === 'PLAYING' ? ActivityType.Playing :
                      config.botStatus.type === 'LISTENING' ? ActivityType.Listening :
                      ActivityType.Watching;
    
    const activityOptions = {
        type: statusType,
        name: config.botStatus.name
    };
    
    if (config.botStatus.type === 'STREAMING' && config.botStatus.url) {
        activityOptions.url = config.botStatus.url;
    }
    
    client.user.setActivity(activityOptions);
    Logger.info(`Bot status set to: ${config.botStatus.type} - ${config.botStatus.name}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;
    
    const args = message.content.slice(config.prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = client.commands.get(commandName);
    if (!command) return;
    
    try {
        Logger.info(`${message.author.tag} used command: ${commandName}`);
        await command.execute(message, args);
    } catch (error) {
        Logger.error(`Error executing command ${commandName}: ${error.message}`);
        
        const errorEmbed = new EmbedBuilder()
            .setTitle('â Ø®Ø·Ø£ ÙÙ ØªÙÙÙØ° Ø§ÙØ£ÙØ±')
            .setDescription('Ø­Ø¯Ø« Ø®Ø·Ø£ Ø£Ø«ÙØ§Ø¡ ØªÙÙÙØ° Ø§ÙØ£ÙØ±. ÙØ±Ø¬Ù Ø§ÙÙØ­Ø§ÙÙØ© ÙØ±Ø© Ø£Ø®Ø±Ù.')
            .setColor('#ff0000')
            .setTimestamp();
        
        try {
            await message.reply({ embeds: [errorEmbed] });
        } catch (replyError) {
            Logger.error(`Failed to send error message: ${replyError.message}`);
        }
    }
});

client.on('error', (error) => {
    Logger.error(`Discord client error: ${error.message}`);
});

client.on('warn', (warning) => {
    Logger.warn(`Discord client warning: ${warning}`);
});

process.on('unhandledRejection', (error) => {
    Logger.error(`Unhandled promise rejection: ${error.message}`);
});

process.on('uncaughtException', (error) => {
    Logger.error(`Uncaught exception: ${error.message}`);
    process.exit(1);
});

process.on('SIGINT', () => {
    Logger.info('Received SIGINT, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    Logger.info('Received SIGTERM, shutting down gracefully...');
    client.destroy();
    process.exit(0);
});

if (!config.token) {
    Logger.error('Discord token not found! Please set DISCORD_TOKEN in .env file');
    process.exit(1);
}

client.login(config.token).catch((error) => {
    Logger.error(`Failed to login: ${error.message}`);
    process.exit(1);
});
