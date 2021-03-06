import { RedisService } from '../services/redis'
import { JwtService, createJwtService } from '../services/jwt'
import { ScheduleService } from '../services/schedule'
import {
  createSlot,
  createSession,
  createSpeaker,
  createSessionType,
  createTheme,
  createTrack,
  createTranslator,
} from './fixtures'
import { UrlService, createUrlService } from '../services/url'
import { UsersService, compareEmails } from '../services/users'
import { Registration, ConfigSettings } from '../structs'
import { AuthService, createAuthService } from '../services/auth'
import { PostgresService } from '../services/postgres'
import { I18nService } from '../services/i18n'

//
// redis
//
export function mockRedis(): RedisService {
  const data = new Map<string, string>()

  return {
    ping: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(async (k) => data.get(k) ?? null),
    getJson: jest.fn(async (k, f) =>
      data.has(k) ? JSON.parse(data.get(k)!) : f
    ),
    set: jest.fn(async (k, v) => data.set(k, v) as any),
    setAndExpire: jest.fn(async (k, v) => data.set(k, v) as any),
    expire: jest.fn(),
    del: jest.fn(async (k) => (data.delete(k), 1)),
    setAdd: jest.fn(),
    setRemove: jest.fn(),
    setMembers: jest.fn(),
    setPop: jest.fn(),
    setCardinality: jest.fn(),
    setUnionStore: jest.fn(),
  }
}

//
// jwt
//
export function mockJwt(secretKey: string): JwtService {
  const jwt = createJwtService(secretKey)
  return {
    sign: jest.fn((payload, opts) => jwt.sign(payload, opts)),
    verify: jest.fn((token) => jwt.verify(token)),
  }
}

export function mockSchedule(): ScheduleService {
  const slots = [
    createSlot('001', 12),
    createSlot('002', 13),
    createSlot('003', 14),
  ]

  const sessions = [
    createSession('001', 'plenary', '001', true),
    createSession('002', 'panel', '002', true),
    createSession('003-a', 'session', '003', false),
    createSession('003-b', 'session', '003', false),
    createSession('003-c', 'session', '003', false),
  ]

  const speakers = [
    createSpeaker('Geoff Testington', 'CTO Tech Corp'),
    createSpeaker('Lisa Andrews', 'CFO Industry Ltd'),
    createSpeaker('Sully Mathews', 'CEO Lemon Bros'),
  ]

  const types = [
    createSessionType('plenary'),
    createSessionType('panel'),
    createSessionType('session'),
  ]

  const themes = [
    createTheme('theme-a'),
    createTheme('theme-b'),
    createTheme('theme-c'),
  ]

  const tracks = [
    createTrack('track-a'),
    createTrack('track-b'),
    createTrack('track-c'),
  ]

  const settings: ConfigSettings = {
    scheduleLive: false,
    conferenceIsOver: false,
    schedule: 'ENABLE',
    coffeechat: 'ENABLE',
    explore: 'ENABLE',
    helpdesk: 'ENABLE',
  }

  const translators = [createTranslator('Rob Anderson')]

  return {
    getSlots: jest.fn(async () => slots),
    getSessions: jest.fn(async () => sessions),
    findSession: jest.fn(
      async (id) => sessions.find((e) => e.id === id) ?? null
    ),
    getTracks: jest.fn(async () => tracks),
    getThemes: jest.fn(async () => themes),
    getSpeakers: jest.fn(async () => speakers),
    getTypes: jest.fn(async () => types),
    getSettings: jest.fn(async () => settings),
    getTranslators: jest.fn(async () => translators),
    findTranslator: jest.fn(
      async (email) => translators.find((t) => t.email === email) ?? null
    ),
  }
}

//
// url
//
export function mockUrl(self: string, web: string): UrlService {
  const url = createUrlService(self, web)

  return {
    forSelf: jest.fn((path) => url.forSelf(path)),
    forWeb: jest.fn((path) => url.forWeb(path)),
  }
}

//
// users
//
export function mockUsers(): UsersService {
  const registrations: Record<string, Registration> = {
    'user@example.com': {
      id: 1,
      created: new Date(),
      name: 'Geoff Testington',
      email: 'user@example.com',
      language: 'en',
      country: 'GB',
      verified: true,
      affiliation: 'Open Lab',
      consented: new Date(),
    },
  }
  return {
    getRegistration: jest.fn(async (email) => registrations[email]),
    register: jest.fn(),
    unregister: jest.fn(),
    verify: jest.fn(),
    compareEmails,
    attend: jest.fn(),
    unattend: jest.fn(),
    getAttendance: jest.fn(async () => new Map()),
    getUserAttendance: jest.fn(async () => []),
  }
}

//
// auth
//
export function mockAuth(redis: RedisService, jwt: JwtService): AuthService {
  const auth = createAuthService(redis, jwt)

  return {
    fromRequest: jest.fn((request) => auth.fromRequest(request)),
    fromSocket: jest.fn((id) => auth.fromSocket(id)),
  }
}

//
// postgres
//
export function mockPostgres(): [jest.Mock, PostgresService] {
  const sql = jest.fn()

  const fakeClient = () => ({
    release: jest.fn(),
    sql,
  })

  const svc = {
    run: jest.fn((block) => block(fakeClient())),
    client: jest.fn(),
    close: jest.fn(),
  }

  return [sql, svc]
}

//
// i18n
// - mocks translate and returns a handy string for extra testing
// - string is the form "en:the.key.that.was.passed"
//
export function mockI18n(): I18nService {
  return {
    translate: jest.fn((locale, key) => `${locale}:${key}`),
  }
}
