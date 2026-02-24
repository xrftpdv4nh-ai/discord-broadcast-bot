const { EmbedBuilder } = require('discord.js');
const config = require('../config');

module.exports = {
    name: 'help',
    description: 'عرض قائمة الأوامر المتاحة',
    usage: '-help',
    
    async execute(message, args) {
        const helpEmbed = new EmbedBuilder()
            .setTitle(' قائمة أوامر البوت')
            .setDescription('بوت إرسال الرسائل الجماعية لأعضاء السيرفر')
            .addFields(
                {
                    name: '📡 -send <message>',
                    value: 'إرسال رسالة لجميع أعضاء السيرفر في الخاص\nمثال: `-send مرحباً بكم جميعاً`',
                    inline: false
                },
                {
                    name: '📊 -show',
                    value: 'عرض إحصائيات البوت والسيرفر',
                    inline: false
                },
                {
                    name: '❓ -help',
                    value: 'عرض هذه القائمة',
                    inline: false
                }
            )
            .addFields(
                {
                    name: '⚙️ إعدادات الأمان',
                    value: `• تأخير بين الرسائل: ${config.dmDelay}ms\n• حجم المجموعة: ${config.batchSize} رسائل\n• تأخير بين المجموعات: ${config.batchDelay}ms`,
                    inline: false
                },
                {
                    name: '🔒 الصلاحيات المطلوبة',
                    value: 'يجب أن تكون مالك البوت أو لديك صلاحية Administrator',
                    inline: false
                }
            )
            .setColor(config.embedColor)
            .setFooter({ text: 'Discord Broadcast Bot' })
            .setTimestamp();
        
        await message.reply({ embeds: [helpEmbed] });
    }
};
