const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const rateLimiter = require('../utils/rateLimiter');
const Logger = require('../utils/logger');

class BroadcastStats {
    constructor() {
        this.reset();
    }
    
    reset() {
        this.total = 0;
        this.successful = 0;
        this.failed = 0;
        this.failedUsers = [];
        this.startTime = null;
        this.endTime = null;
    }
    
    addSuccess() {
        this.successful++;
    }
    
    addFailure(user, reason) {
        this.failed++;
        this.failedUsers.push({ user: user.tag, id: user.id, reason });
    }
    
    setTotal(count) {
        this.total = count;
        this.startTime = new Date();
    }
    
    finish() {
        this.endTime = new Date();
    }
    
    getDuration() {
        if (!this.startTime || !this.endTime) return 0;
        return Math.round((this.endTime - this.startTime) / 1000);
    }
    
    getSuccessRate() {
        if (this.total === 0) return 0;
        return Math.round((this.successful / this.total) * 100);
    }
}

const broadcastStats = new BroadcastStats();

module.exports = {
    name: 'send',
    description: 'إرسال رسالة لجميع أعضاء السيرفر في الخاص',
    usage: '-send <message>',
    
    async execute(message, args) {
        if (message.author.id !== config.ownerId && !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ ليس لديك صلاحية لاستخدام هذا الأمر!');
        }
        
        if (args.length === 0) {
            return message.reply('❌ يرجى كتابة الرسالة التي تريد إرسالها!\nمثال: `-send مرحباً بكم جميعاً`');
        }
        
        const broadcastMessage = args.join(' ');
        
        if (broadcastMessage.length > config.maxMessageLength) {
            return message.reply(`❌ الرسالة طويلة جداً! الحد الأقصى ${config.maxMessageLength} حرف.`);
        }
        
        if (rateLimiter.isCurrentlyProcessing()) {
            return message.reply('⏳ يتم حالياً إرسال رسائل أخرى. يرجى الانتظار حتى الانتهاء.');
        }
        
        try {
            await message.guild.members.fetch();
            const members = message.guild.members.cache.filter(member => !member.user.bot);
            
            if (members.size === 0) {
                return message.reply('❌ لا يوجد أعضاء في السيرفر لإرسال الرسائل إليهم!');
            }
            
            broadcastStats.reset();
            broadcastStats.setTotal(members.size);
            const statusEmbed = new EmbedBuilder()
                .setTitle('📡 جاري إرسال الرسائل...')
                .setDescription(`**الرسالة:** ${broadcastMessage.substring(0, 100)}${broadcastMessage.length > 100 ? '...' : ''}`)
                .addFields(
                    { name: '👥 إجمالي الأعضاء', value: members.size.toString(), inline: true },
                    { name: '✅ تم الإرسال', value: '0', inline: true },
                    { name: '❌ فشل الإرسال', value: '0', inline: true },
                    { name: '⏳ الحالة', value: 'جاري البدء...', inline: false }
                )
                .setColor(config.embedColor)
                .setTimestamp();
            
            const statusMessage = await message.reply({ embeds: [statusEmbed] });
            
            Logger.info(`Starting broadcast to ${members.size} members`);
            
            let processed = 0;
            const updateInterval = setInterval(async () => {
                if (processed >= members.size) {
                    clearInterval(updateInterval);
                    return;
                }
                
                const updatedEmbed = new EmbedBuilder()
                    .setTitle('📡 جاري إرسال الرسائل...')
                    .setDescription(`**الرسالة:** ${broadcastMessage.substring(0, 100)}${broadcastMessage.length > 100 ? '...' : ''}`)
                    .addFields(
                        { name: '👥 إجمالي الأعضاء', value: members.size.toString(), inline: true },
                        { name: '✅ تم الإرسال', value: broadcastStats.successful.toString(), inline: true },
                        { name: '❌ فشل الإرسال', value: broadcastStats.failed.toString(), inline: true },
                        { name: '⏳ الحالة', value: `معالجة ${processed}/${members.size}`, inline: false },
                        { name: '📊 معدل النجاح', value: `${broadcastStats.getSuccessRate()}%`, inline: true }
                    )
                    .setColor('#ffaa00')
                    .setTimestamp();
                
                try {
                    await statusMessage.edit({ embeds: [updatedEmbed] });
                } catch (error) {
                    Logger.error('Failed to update status message');
                }
            }, 5000);
            
            for (const [, member] of members) {
                rateLimiter.addTask(async () => {
                    try {
                        await member.send(broadcastMessage);
                        broadcastStats.addSuccess();
                        Logger.info(`Message sent to ${member.user.tag}`);
                    } catch (error) {
                        let reason = 'خطأ غير معروف';
                        if (error.code === 50007) {
                            reason = 'الرسائل الخاصة مغلقة';
                        } else if (error.code === 50013) {
                            reason = 'ليس لدى البوت صلاحية';
                        } else if (error.code === 10013) {
                            reason = 'المستخدم غير موجود';
                        }
                        
                        broadcastStats.addFailure(member.user, reason);
                        Logger.warn(`Failed to send message to ${member.user.tag}: ${reason}`);
                    }
                    
                    processed++;
                    if (processed >= members.size) {
                        clearInterval(updateInterval);
                        broadcastStats.finish();
                        
                        const resultsEmbed = new EmbedBuilder()
                            .setTitle(' تقرير إرسال الرسائل')
                            .setDescription(`**الرسالة:** ${broadcastMessage.substring(0, 100)}${broadcastMessage.length > 100 ? '...' : ''}`)
                            .addFields(
                                { name: '👥 إجمالي الأعضاء', value: broadcastStats.total.toString(), inline: true },
                                { name: '✅ تم الإرسال بنجاح', value: broadcastStats.successful.toString(), inline: true },
                                { name: '❌ فشل الإرسال', value: broadcastStats.failed.toString(), inline: true },
                                { name: '📊 معدل النجاح', value: `${broadcastStats.getSuccessRate()}%`, inline: true },
                                { name: '⏱️ المدة الزمنية', value: `${broadcastStats.getDuration()} ثانية`, inline: true },
                                { name: '📈 الحالة', value: '✅ اكتمل', inline: true }
                            )
                            .setColor(broadcastStats.getSuccessRate() > 80 ? '#00ff00' : '#ff6600')
                            .setTimestamp();
                        
                        if (broadcastStats.failedUsers.length > 0) {
                            const failedList = broadcastStats.failedUsers
                                .slice(0, 10)
                                .map(f => `• ${f.user}: ${f.reason}`)
                                .join('\n');
                            
                            resultsEmbed.addFields({
                                name: `❌ الأعضاء الذين فشل إرسال الرسالة إليهم (${Math.min(10, broadcastStats.failedUsers.length)}/${broadcastStats.failedUsers.length})`,
                                value: failedList || 'لا يوجد',
                                inline: false
                            });
                        }
                        
                        try {
                            await statusMessage.edit({ embeds: [resultsEmbed] });
                            Logger.success(`Broadcast completed: ${broadcastStats.successful}/${broadcastStats.total} successful`);
                        } catch (error) {
                            Logger.error('Failed to send final results');
                        }
                    }
                });
            }
            
        } catch (error) {
            Logger.error(`Broadcast error: ${error.message}`);
            message.reply('❌ حدث خطأ أثناء إرسال الرسائل. يرجى المحاولة مرة أخرى.');
        }
    }
};
