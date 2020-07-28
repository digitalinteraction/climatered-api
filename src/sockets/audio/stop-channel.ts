import { TypedChow } from '../../server'
import createDebug = require('debug')

const debug = createDebug('api:socket:start-channel')

export default function stopChannel(chow: TypedChow) {
  //
  // @stop-channel()
  //
  chow.socket('stop-channel', async (ctx) => {
    const { socket, sendError, redis, users, schedule } = ctx
    debug(`socket="${socket.id}"`)

    const user = await users.registrationForSocket(socket.id, redis)
    if (!user || !user.roles.includes('translator')) {
      return sendError('Bad auth')
    }

    const translatorKey = `translator_${socket.id}`
    debug(`translatorKey="${translatorKey}"`)

    const packet = await redis.get(translatorKey)
    if (!packet) return sendError('Not broadcasting')

    const [sessionId, channel] = packet.split(';')
    const channelKey = `translator_${sessionId}_${channel}`

    debug(`channelKey="${channelKey}"`)
    await redis.del(channelKey)

    await redis.del(translatorKey)
  })
}