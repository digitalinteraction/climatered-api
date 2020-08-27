import { TypedChow } from '../../server'
import createDebug = require('debug')
import { setupInterpretation, getInterpretRoom } from './interpret-utils'

const debug = createDebug('api:socket:leave-interpret')

export default function leaveInterpret(chow: TypedChow) {
  //
  // leave-interpret
  //
  chow.socket('leave-interpret', async (ctx, sessionId, channel) => {
    const { socket, schedule, emitToRoom } = ctx
    debug(`socket="${socket.id}" sessionId="${sessionId}" channel="${channel}"`)

    //
    // Validate auth and get the target session
    //
    const { authToken, session } = await setupInterpretation(
      socket.id,
      sessionId,
      channel,
      ctx
    )
    const interpretRoom = getInterpretRoom(session.id, channel)

    //
    // Grab the translator who is leaving
    //
    const translator = await schedule.findTranslator(authToken.sub)
    if (!translator) throw new Error('Bad authentication')

    //
    // Leave the interpret room
    //
    socket.leave(interpretRoom)

    //
    // Broadcast the leaving
    //
    emitToRoom(interpretRoom, 'interpret-left', translator)
  })
}
