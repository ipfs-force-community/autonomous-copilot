// import { Bot } from "grammy";

import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { addMessage, getUserMessages } from './store.ts'

// todo get api key from env
const bot = new Telegraf("8081908735:AAFMcc6v29hNrNFlBYbU5Ctt8McJ7sOo304")



bot.command('start', async (ctx) => {
    let welcomeMessage = `Hello ${ctx.from.first_name}!
Every message you send will be collected as a note store into autodrive, a secure place for your files.
You can ask any question with command /q.`
    await ctx.reply(welcomeMessage)
})

bot.command('q', async (ctx) => {

    // get the question from the user
    let question = ctx.message.text.split(' ')[1]

    if (question == undefined) {
        await ctx.reply('Please fallow the command with a question, example: /q What is the meaning of life?')
        return
    }

    let msg_history = getUserMessages(ctx.from.id)

    let reply = `Question: ${question}
History: ${msg_history.map((m: string) => m).join('\n')}`

    // send the question to the user
    await ctx.reply(reply)
})


bot.on(message('text'), async (ctx) => {
    let user_id = ctx.message.from.id;

    addMessage(user_id, ctx.message.text)
    // Using context shortcut
    await ctx.reply(`store with cid ( ): ${ctx.message.text}`)
})

bot.use((ctx, next) => {
    console.log(ctx)
    return next()
})


bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))