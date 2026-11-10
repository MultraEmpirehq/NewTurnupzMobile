declare module "@env" {
  export const BASE_URL: string;
  export const USER_AUTH_STORAGE_ID: string;
  export const USER_AUTH_STORAGE_KEY: string;
  /** Google OAuth web client: the audience the backend verifies ID tokens for. */
  export const GOOGLE_WEB_CLIENT_ID: string;
  /** Google OAuth iOS client; empty until one exists, which hides Google sign-in on iOS. */
  export const GOOGLE_IOS_CLIENT_ID: string;
  /** The web app's address; sign-up links in emails open its register page. */
  export const WEB_APP_URL: string;
  /** OneSignal app for phone notifications; empty turns push off. */
  export const ONESIGNAL_APP_ID: string;
}
