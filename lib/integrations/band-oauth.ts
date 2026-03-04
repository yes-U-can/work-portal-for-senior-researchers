import { env } from "@/lib/env";

export function getBandAuthorizeUrl() {
  return env.BAND_AUTHORIZE_URL;
}

export function getBandTokenUrl() {
  return env.BAND_TOKEN_URL;
}

export function getBandScope() {
  return env.BAND_OAUTH_SCOPE;
}

export function getBandClientId() {
  return env.BAND_CLIENT_ID;
}

export function getBandClientSecret() {
  return env.BAND_CLIENT_SECRET;
}
