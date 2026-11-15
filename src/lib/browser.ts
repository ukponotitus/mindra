/** Whether the page is open inside another app's own browser (Facebook, Instagram, TikTok, LinkedIn, X, Snapchat,
 * Line, WeChat), going by the user agent. Google refuses its sign-in there ("disallowed_useragent"), so the sign-up
 * form leads with email instead. */
export function inAppBrowser(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent): boolean {
  return /FBAN|FBAV|FB_IAB|FB4A|FBIOS|Instagram|musical_ly|BytedanceWebview|TikTok|LinkedInApp|Snapchat|Twitter|Line\/|MicroMessenger/i.test(userAgent);
}
