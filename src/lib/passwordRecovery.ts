const PASSWORD_RECOVERY_KEY = 'onespace-password-recovery';
const PASSWORD_RECOVERY_ERROR_KEY = 'onespace-password-recovery-error';

function storageAvailable() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage);
}

function authCallbackParams() {
  if (typeof window === 'undefined') return new URLSearchParams();

  const params = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));

  hashParams.forEach((value, key) => params.set(key, value));
  return params;
}

export function rememberPasswordRecovery() {
  if (!storageAvailable()) return;
  window.sessionStorage.setItem(PASSWORD_RECOVERY_KEY, 'true');
}

export function clearPasswordRecovery() {
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(PASSWORD_RECOVERY_KEY);
  window.sessionStorage.removeItem(PASSWORD_RECOVERY_ERROR_KEY);
}

export function hasPendingPasswordRecovery() {
  if (!storageAvailable()) return false;
  return window.sessionStorage.getItem(PASSWORD_RECOVERY_KEY) === 'true';
}

export function hasPasswordRecoveryCallbackError() {
  if (!storageAvailable()) return false;
  return window.sessionStorage.getItem(PASSWORD_RECOVERY_ERROR_KEY) === 'true';
}

/**
 * Capture the recovery intent before the Supabase client consumes the URL hash.
 * This is necessary when Supabase falls back to the site's root URL instead of
 * the requested /reset-password redirect.
 */
export function capturePasswordRecoveryCallback() {
  if (typeof window === 'undefined') return;

  const params = authCallbackParams();
  const isRecoveryCallback = params.get('type') === 'recovery';

  if (isRecoveryCallback) rememberPasswordRecovery();

  const hasAuthError = Boolean(params.get('error') || params.get('error_code'));
  const isKnownRecoveryAttempt =
    isRecoveryCallback ||
    hasPendingPasswordRecovery() ||
    window.location.pathname === '/reset-password';

  if (hasAuthError && isKnownRecoveryAttempt && storageAvailable()) {
    window.sessionStorage.setItem(PASSWORD_RECOVERY_ERROR_KEY, 'true');
  }
}

export function isPasswordResetRateLimitError(error: Error) {
  const authError = error as Error & { code?: string; status?: number };
  const message = authError.message.toLowerCase();

  return (
    authError.code === 'over_email_send_rate_limit' ||
    authError.status === 429 ||
    message.includes('rate limit') ||
    message.includes('only request this after') ||
    message.includes('too many emails')
  );
}
