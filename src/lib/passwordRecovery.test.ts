import { beforeEach, describe, expect, it } from 'vitest';
import {
  capturePasswordRecoveryCallback,
  hasPasswordRecoveryCallbackError,
  hasPendingPasswordRecovery,
  isPasswordResetRateLimitError,
} from './passwordRecovery';

describe('password recovery callback helpers', () => {
  beforeEach(() => {
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  it('captures recovery intent from the auth callback before routing', () => {
    window.history.replaceState({}, '', '/#access_token=test&type=recovery');

    capturePasswordRecoveryCallback();

    expect(hasPendingPasswordRecovery()).toBe(true);
    expect(hasPasswordRecoveryCallbackError()).toBe(false);
  });

  it('remembers an invalid recovery callback for a clear expired-link screen', () => {
    window.history.replaceState(
      {},
      '',
      '/reset-password#error=access_denied&error_code=otp_expired',
    );

    capturePasswordRecoveryCallback();

    expect(hasPasswordRecoveryCallbackError()).toBe(true);
  });

  it('recognizes Supabase email throttling without exposing its raw message', () => {
    const error = Object.assign(new Error('email rate limit exceeded'), {
      code: 'over_email_send_rate_limit',
      status: 429,
    });

    expect(isPasswordResetRateLimitError(error)).toBe(true);
  });
});
