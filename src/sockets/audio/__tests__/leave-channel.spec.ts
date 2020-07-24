import leaveChannelSocket from '../leave-channel'
import {
  TypedMockChow,
  createServer,
  mocked,
  createRegistration,
  Registration,
} from '../../../test-utils'

let chow: TypedMockChow
let attendee: Registration

beforeEach(() => {
  chow = createServer()
  attendee = createRegistration(['attendee'])
  leaveChannelSocket(chow)
})

describe('@leave-channel(sessionId', () => {
  it('should remove that user from the channel', async () => {
    const socket = chow.io()

    mocked(chow.users.registrationForSocket).mockResolvedValue(attendee)

    await socket.emit('leave-channel', '001', 'fr')

    expect(socket.leave).toBeCalledWith('channel-001-fr')
  })
})
