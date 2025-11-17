import { Markup, Telegraf } from 'telegraf'
import 'dotenv/config'

const botToken = process.env.TELEGRAM_BOT_TOKEN || ''
const telegramChatId = process.env.TELEGRAM_CHAT_ID || ''

const bot = new Telegraf(
    botToken,
    { telegram: { webhookReply: false } }
)

bot.use(Telegraf.log())

async function sendTelegramMessage(message: string, url: string) {
    return await bot.telegram.sendMessage(
        telegramChatId,
        message,
        Markup.inlineKeyboard([
            [
                Markup.button.callback(`Not watching (${url})`, 'not_watching'),
            ]
        ])
    )
}

export {
    bot,
    sendTelegramMessage
}