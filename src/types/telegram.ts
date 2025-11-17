type TelegramContext = {
    callbackQuery: {
        message: {
            reply_markup: {
                inline_keyboard: {
                    text: string
                }[][]
            }
        }
    }
}

export {
    TelegramContext
}