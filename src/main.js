import { Telegraf, session } from "telegraf"
import { message } from "telegraf/filters"
import { code } from "telegraf/format"
import config from "config"
import { ogg } from "./ogg.js"
import { openai } from "./openai.js"

console.log(config.get("TEST_ENV"))

const INITIAL_SESSION = {
  messages: [],
}

const bot = new Telegraf(config.get("TELEGRAM_TOKEN"))

bot.use(session())

bot.command("new", async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply("Жду вашего голосового или текствого сообщения...")
})

bot.command("start", async (ctx) => {
  ctx.session = INITIAL_SESSION
  await ctx.reply("Жду вашего голосового или текствого сообщения...")
})
///////////////////////////////////////////////////////////////////////////////////
bot.on(message("voice"), async (cxt) => {
  cxt.session ??= INITIAL_SESSION
  try {
    await cxt.reply(code("Сообщение принято. Жду ответ от нейросети..."))
    const link = await cxt.telegram.getFileLink(cxt.message.voice.file_id)
    const userId = String(cxt.message.from.id)
    const oggPath = await ogg.create(link.href, userId)
    const mp3Path = await ogg.toMp3(oggPath, userId)

    const text = await openai.transcription(mp3Path)

    cxt.session.messages.push({ role: openai.roles.USER, content: text })

    const response = await openai.chat(cxt.session.messages)

    cxt.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    })

    await cxt.reply(code(`Ваш запрос: ${text}`))

    await cxt.reply(response.content)
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})
////////////////////////////////////////////////////////////////////////////////

bot.on(message("text"), async (cxt) => {
  cxt.session ??= INITIAL_SESSION
  try {
    await cxt.reply(code("Сообщение принято. Жду ответ от нейросети..."))
    // const link = await cxt.telegram.getFileLink(cxt.message.voice.file_id)
    // const userId = String(cxt.message.from.id)
    // const oggPath = await ogg.create(link.href, userId)
    // const mp3Path = await ogg.toMp3(oggPath, userId)

    // const text = await openai.transcription()

    cxt.session.messages.push({
      role: openai.roles.USER,
      content: cxt.message.text,
    })

    const response = await openai.chat(cxt.session.messages)

    cxt.session.messages.push({
      role: openai.roles.ASSISTANT,
      content: response.content,
    })

    await cxt.reply(response.content)
  } catch (e) {
    console.log(`Error while voice message`, e.message)
  }
})
///////////////////////////////////////////////////////////////////////
bot.launch()

process.once("SIGINT", () => bot.stop("SIGINT"))
process.once("SIGTERM", () => bot.stop("SIGTERM"))
