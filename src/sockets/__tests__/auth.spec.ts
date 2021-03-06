import { TypedMockChow, createServer, mocked } from '../../test-utils'
import authSocket from '../auth'
import { AuthJwt } from '../../services/jwt'
import jwt = require('jsonwebtoken')

let chow: TypedMockChow
let logSpy: jest.Mock

beforeEach(() => {
  chow = createServer()
  authSocket(chow)

  logSpy = chow.spyEvent('log')
})

describe('@auth(token)', () => {
  it('should store the auth in redis', async () => {
    const socket = chow.io()

    const auth: AuthJwt = {
      typ: 'auth',
      sub: 'user@example.com',
      user_roles: ['attendee'],
      user_lang: 'en',
    }
    const token = jwt.sign(auth, chow.env.JWT_SECRET)

    await socket.emit('auth', token)

    expect(chow.redis.setAndExpire).toBeCalledWith(
      `auth_${socket.id}`,
      JSON.stringify(jwt.decode(token)),
      expect.any(Number)
    )
  })

  it('should send an error for invalid jwt', async () => {
    const socket = chow.io()
    mocked(socket.sendError).mockImplementation(() => {})

    const token = 'no_a_jwt'

    await socket.emit('auth', token)

    expect(socket.sendError).toBeCalledWith('Bad auth')
  })
})
