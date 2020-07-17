import createDebug = require('debug')
import dotenv = require('dotenv')
import socketIo = require('socket.io')
import socketIoRedis = require('socket.io-redis')

import { createTerminus } from '@godaddy/terminus'
import { Chow, BaseContext, Chowish } from '@robb_j/chowchow'

import { createEnv, Env } from './env'

import { RedisService, createRedisService } from './services/redis'
import { ScheduleService, createScheduleService } from './services/schedule'
import { JwtService, createJwtService } from './services/jwt'
import { UrlService, createUrlService } from './services/url'
import { UsersService, createUsersService } from './services/users'

import homeRoute from './routes/home'
import emailRequestRoute from './routes/auth/email-request'
import emailCallbackRoute from './routes/auth/email-callback'
import getSlotsRoute from './routes/schedule/get-slots'
import getEventsRoute from './routes/schedule/get-events'

import authSocket from './sockets/auth'

import emailEvent from './events/email'
import { SockChowish, SockChow, SockContext } from './sockchow'

const debug = createDebug('api:server')

export interface Context extends SockContext<Env> {
  redis: RedisService
  schedule: ScheduleService
  jwt: JwtService
  url: UrlService
  users: UsersService
}

export type TypedChow = SockChowish<Env, Context> & Chowish<Env, Context>

export function setupServer(chow: TypedChow) {
  //
  // Register events
  //
  chow.apply(emailEvent)

  //
  // Register routes
  //
  chow.apply(
    homeRoute,
    emailRequestRoute,
    emailCallbackRoute,
    getSlotsRoute,
    getEventsRoute
  )

  //
  // Register sockets
  //
  chow.apply(authSocket)
}

export function setupSockets(
  io: socketIo.Server,
  redis: RedisService,
  env: Env
) {
  //
  // todo
  //
}

export async function runServer() {
  //
  // Load variables from environment variables
  //
  dotenv.config()

  //
  // Create our custom environment
  //
  const env = createEnv(process.env)

  //
  // Setup services
  //
  const redis = createRedisService(env.REDIS_URL)
  const schedule = createScheduleService()
  const jwt = createJwtService(env.JWT_SECRET)
  const url = createUrlService(env.SELF_URL, env.WEB_URL)
  const users = createUsersService()

  //
  // Create our chow instance
  //
  const ctxFactory: (ctx: SockContext<Env>) => Context = (base) => ({
    ...base,
    redis,
    schedule,
    jwt,
    url,
    users,
  })
  const chow = new SockChow(ctxFactory, env)
  setupServer(chow)

  //
  // Setup socket.io server
  //
  const io = socketIo(chow.server)
  io.adapter(socketIoRedis(env.REDIS_URL))
  setupSockets(io, redis, env)

  //
  // Start our server
  //
  await chow.start({
    port: 3000,
    trustProxy: true,
    jsonBody: true,
    urlEncodedBody: true,
    corsHosts: env.CORS_HOSTS,
    handle404s: true,
    outputUrl: true,
  })

  //
  // Make sure the server shuts down consistently
  //
  createTerminus(chow.server, {
    healthChecks: {
      '/healthz': async () => {
        debug('GET /healthz')
        await redis.ping()
      },
    },
    signals: ['SIGINT', 'SIGTERM'],
    onSignal: async () => {
      debug('onSignal')
      await redis.quit()
    },
    beforeShutdown: () => {
      debug('beforeShutdown')
      if (env.NODE_ENV === 'development') return Promise.resolve()
      return new Promise((resolve) => setTimeout(resolve, 5000))
    },
  })
}
