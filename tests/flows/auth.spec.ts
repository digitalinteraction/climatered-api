import { createServer, mocked } from '../../src/test-utils'
import { setupRoutes } from '../../src/server'
import supertest = require('supertest')
import jwt = require('jsonwebtoken')

// ref: https://www.regextester.com/105777
function getJwtFromEmail(emailText: string): any {
  const regex = /token=([A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*)/
  const match = regex.exec(emailText)
  return match && match[1]
}

function getJwtFromRedirect(location: string): any {
  const url = new URL(location)
  return url.searchParams.get('token')
}

// Hide EventNotHandledError for now
jest.spyOn(console, 'error').mockImplementation(() => {})

test('Authentication flow', async () => {
  const chow = createServer()
  const { SELF_URL, WEB_URL, JWT_SECRET } = chow.env

  setupRoutes(chow)

  const agent = supertest(chow.app)

  const email = 'user@example.com'
  const loginLink = `${SELF_URL}/login/email/callback?token=`
  const authLink = `${WEB_URL}/_token?token=`

  //
  // [1] Test requesting an email code
  //  - It sends them an email
  //  - It returns a http/200
  //  - It has a valid login token
  //
  const emailRequest = await agent.get('/login/email').query({ email })
  const loginToken = getJwtFromEmail(
    mocked<any>(chow.emit).mock.calls[0][1].text
  )

  expect(emailRequest.status).toEqual(200)
  expect(chow.emit).toBeCalledWith('email', {
    to: 'user@example.com',
    subject: expect.any(String),
    text: expect.stringContaining(loginLink),
  })
  expect(jwt.verify(loginToken, JWT_SECRET)).toEqual({
    iat: expect.any(Number),
    typ: 'login',
    sub: 'user@example.com',
    exp: Math.floor(Date.now() / 1000) + 30 * 60,
  })

  //
  // [2] Test validating a jwt to get an auth token
  //
  const emailCallback = await agent
    .get('/login/email/callback')
    .query({ token: loginToken })
  const authToken = getJwtFromRedirect(emailCallback.header.location)

  expect(emailCallback.status).toEqual(302)
  expect(emailCallback.header.location).toEqual(
    expect.stringContaining(authLink)
  )
  expect(jwt.verify(authToken, JWT_SECRET)).toEqual({
    iat: expect.any(Number),
    typ: 'auth',
    sub: 'user@example.com',
    user_roles: ['attendee'],
    user_lang: 'en',
  })
})
