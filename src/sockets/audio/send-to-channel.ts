import { TypedChow } from '../../server'
import createDebug = require('debug')

const debug = createDebug('api:socket:send-to-channel')

export default function sendToChannel(chow: TypedChow) {
  //
  // @send-to-channel(rawData)
  //
  chow.socket('send-to-channel', async (ctx, rawData) => {
    const { sendError, emitToRoom, socket, redis } = ctx

    debug(`socket="${socket.id}"`)

    //
    // Get their translator packet to check they are allowed to broadcast
    // and to tell them who to broadcast to
    //
    const packet = await redis.get(`translator_${socket.id}`)
    if (!packet) return sendError('Bad auth')

    //
    // Reconstruct the key to emit to based on the packet
    //
    const [eventId, channel] = packet.split(';')
    const key = `channel-${eventId}-${channel}`
    debug(`room="${key}"`)

    //
    // Emit the raw data to the room
    //
    emitToRoom(key, rawData)
  })
}
