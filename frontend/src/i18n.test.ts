import { describe, expect, test } from 'vitest';
import i18n from './i18n';

describe('i18n setup', () => {
  test('starts with configured default language', () => {
    expect(i18n.language).toBe('vi');
  });

  test('resolves known keys in both languages', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('layout.logout')).toBe('Logout');

    await i18n.changeLanguage('vi');
    expect(i18n.t('layout.logout')).toBe('Đăng xuất');
  });
});
