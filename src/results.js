// Web app URL from deploying docs/google-apps-script.gs (ends in /exec). Leave empty to turn collection off.
export const RESULTS_URL = 'https://script.google.com/macros/s/AKfycbzsxyq57QnoMnojIskrBIXyVr1bVAToHc-hVUJEC70gJcBrsSMjTM9_fqN9HbNDMq_g/exec'

// Sends one finished ranking to the Google Sheet. Only the live site sends, so local test runs
// don't count. Failures are ignored; the result screen never waits on this.
export const sendResult = ({ teams, ranking, neither = [], language }) => {
  if (!RESULTS_URL || !import.meta.env.PROD) return
  const body = JSON.stringify({ time: new Date().toISOString(), teams, ranking, neither, language })
  // text/plain + no-cors avoids a CORS preflight, which Apps Script doesn't answer.
  fetch(RESULTS_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body, keepalive: true }).catch(() => {})
}
