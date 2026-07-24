import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendEmail } from '../email';

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe('sendEmail', () => {
  it('uses an offline mock in explicit test env when RESEND_API_KEY is missing', async () => {
    process.env.APP_ENV = 'test';
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: 'guardian@test.local',
      subject: 'Guardian approval',
      html: '<p>hello</p>',
    });

    expect(result.success).toBe(true);
    expect((result.data as { id: string }).id).toMatch(/^mock_/);
  });

  it('fails closed outside dev/test when RESEND_API_KEY is missing', async () => {
    process.env.APP_ENV = 'production';
    delete process.env.RESEND_API_KEY;

    const result = await sendEmail({
      to: 'guardian@test.local',
      subject: 'Guardian approval',
      html: '<p>hello</p>',
    });

    expect(result.success).toBe(false);
  });

  it('sends through Resend when configured', async () => {
    process.env.APP_ENV = 'production';
    process.env.RESEND_API_KEY = 're_test_key';
    process.env.EMAIL_FROM = 'HERS365 <hello@hers365.com>';
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ id: 'email_123' }),
    } as Response);

    const result = await sendEmail({
      to: 'guardian@test.local',
      subject: 'Guardian approval',
      html: '<p>hello</p>',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 'email_123' });
    expect(fetchMock).toHaveBeenCalledWith('https://api.resend.com/emails', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer re_test_key' }),
    }));
  });
});
