import axios from 'axios';
import { config } from '../config/env';

let sessionCookie: string | null = null;

export const clearSession = () => {
  sessionCookie = null;
};

// Login encoding must match the portal request observed in DevTools.
// Do not change this without verifying the upstream login request.
const buildLoginRequest = () => {
  const body = new URLSearchParams();
  body.set('email', config.urjaEmail);
  body.set('password', config.urjaPassword);

  return {
    data: body.toString(),
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Origin': config.urjaBaseUrl,
      'Referer': `${config.urjaBaseUrl}/login`,
      'x-sveltekit-action': 'true',
    },
  };
};

const login = async (): Promise<string> => {
  if (!config.urjaEmail || !config.urjaPassword) {
    throw new Error('Missing URJA_EMAIL or URJA_PASSWORD configuration');
  }

  const reqConfig = buildLoginRequest();
  let response;

  try {
    response = await axios.post(
      `${config.urjaBaseUrl}/login`,
      reqConfig.data,
      {
        headers: reqConfig.headers
      }
    );
  } catch (error) {
    console.error(
      '[Urja Auth] Login failed:',
      axios.isAxiosError(error) ? error.response?.status : 'unknown'
    );
    throw error;
  }

  if (
    response.data?.type !== 'redirect' ||
    response.data?.status !== 303 ||
    response.data?.location !== '/meters'
  ) {
    throw new Error('Login failed: Unexpected response format from portal');
  }

  const setCookieHeader = response.headers['set-cookie'];
  if (!setCookieHeader || setCookieHeader.length === 0) {
    throw new Error('No set-cookie header found in login response');
  }

  let token = '';
  for (const cookieStr of setCookieHeader) {
    if (cookieStr.includes('__Secure-better-auth.session_token=')) {
      const match = cookieStr.match(/__Secure-better-auth\.session_token=([^;]+)/);
      if (match) {
        token = match[1];
        break;
      }
    }
  }

  if (!token) {
    throw new Error('Could not find session token in login cookies');
  }

  sessionCookie = `__Secure-better-auth.session_token=${token}`;

  console.log('[Urja Auth] Login status:', response.status);
  console.log('[Urja Auth] Session cookie received:', Boolean(sessionCookie));

  return sessionCookie;
};

export const getSessionCookie = async (): Promise<string> => {
  if (sessionCookie) {
    return sessionCookie;
  }
  return login();
};
