import { TypedChow } from '../../server'
import { ChannelStruct, isStruct } from '../../structs'
import createDebug = require('debug')
import {
  setupInterpretation,
  getPacketKey,
  getActiveKey,
  getInterpretRoom,
  getChannelRoom,
} from './interpret-utils'
import { emit } from 'process'
import { LogEvent } from '../../events/log'

const debug = createDebug('api:socket:start-interpret')

// Store keys for longer then they'd ever need to interpret for
// but expire so as not to clog up redis
const sixHoursInSeconds = 6 * 60 * 60
const fiveMinsInSeconds = 5 * 60

export default function startInterpret(chow: TypedChow) {
  //
  // @start-interpret(sessionId, channel)
  //
  chow.socket('start-interpret', async (ctx, sessionId, channel) => {
    const { socket, redis, schedule, emitToRoom, emit } = ctx
    debug(`socket="${socket.id}" sessionId="${sessionId}" channel="${channel}"`)

    //
    // Check auth and get the session
    //
    const { authToken, session } = await setupInterpretation(
      socket.id,
      sessionId,
      channel,
      ctx
    )

    const translator = await schedule.findTranslator(authToken.sub)
    if (!translator) throw new Error('Bad authentication')

    const interpretRoom = getInterpretRoom(sessionId, channel)
    const channelRoom = getChannelRoom(sessionId, channel)

    const activeKey = getActiveKey(session.id, channel)
    const packetKey = getPacketKey(socket.id)

    //
    // Check for an existing translator and boot them
    //
    const activeInterpreter = await redis.get(activeKey)
    if (activeInterpreter && activeInterpreter !== socket.id) {
      debug(`kick translator "${activeInterpreter}"`)
      await redis.del(packetKey)
      emitToRoom(activeInterpreter, 'interpret-takeover', translator)
    }

    //
    // Store the socket id of the translator for this session-channel
    //
    await redis.setAndExpire(activeKey, socket.id, fiveMinsInSeconds)

    //
    // Store a packet to quickly know which session to broadcast to
    //
    const packet = [session.id, channel].join(';')
    await redis.setAndExpire(packetKey, packet, sixHoursInSeconds)

    //
    // Let interpreters know who's in charge
    //
    emitToRoom(interpretRoom, 'interpret-started', translator)

    //
    // Let attendees know somethings happening
    //
    emitToRoom(channelRoom, 'channel-started')

    //
    // Log an event
    //
    emit<LogEvent>('log', {
      action: 'start-interpret',
      socket: socket.id,
      data: {
        sessionId,
        channel,
      },
    })
  })
}
