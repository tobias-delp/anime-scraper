import http from 'serverless-http'
import { bot } from '../util/telegram'
import { markAnimeNotWatching } from '../util/db'
import { TelegramContext } from '../types/telegram'

bot.action('not_watching', async (ctx) => {
    await ctx.answerCbQuery();
    console.log('not watching triggered')
    const url = getUrlFromContext(ctx as TelegramContext)

    markAnimeNotWatching(url)

    return await ctx.reply(`Keine Notifications mehr`);
});

function getUrlFromContext(ctx: TelegramContext): string {
    const buttonText = ctx.callbackQuery.message?.reply_markup.inline_keyboard[0][0].text
    const url = buttonText.split('(').pop()?.split(')')[0] || ''
    return url
}

export const handler = http(bot.webhookCallback("/"));