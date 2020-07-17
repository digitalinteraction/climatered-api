import { TypedChow } from '../../server'
import { HttpRedirect } from '@robb_j/chowchow'
import { AuthJwt, LoginJwt } from '../../services/jwt'

export default function emailCallback(chow: TypedChow) {
  chow.route(
    'get',
    '/login/email/callback',
    async ({ request, url, jwt, users }) => {
      try {
        const genericFail = () => new Error('Bad token')
        //
        // Get the token passed back from their email
        //
        const rawToken = request.query.token
        if (!rawToken) throw genericFail()

        //
        // Attempt to decode it as a LoginJwt
        //
        const login = jwt.verify(rawToken) as LoginJwt
        if (typeof login !== 'object') throw genericFail()
        if (login.typ !== 'login') throw genericFail()

        //
        // Try to associate the token with a registration
        //
        const registration = await users.getRegistration(login.sub)
        if (!registration) throw genericFail()

        //
        // Create an authentication token
        // and generate a link for the webapp to capture it
        //
        const auth: AuthJwt = {
          typ: 'auth',
          sub: login.sub,
          user_roles: registration.roles,
          user_lang: registration.language,
        }
        const link = url.forWeb('/_token')
        link.searchParams.set('token', jwt.sign(auth))

        //
        // Return a redirection to the webapp
        //
        return new HttpRedirect(link.toString())
      } catch (error) {
        //
        // If an error occured, redirect them back to the webapp
        //
        const link = url.forWeb('/error')
        link.searchParams.set('message', error.message)
        return new HttpRedirect(link.toString())
      }
    }
  )
}
