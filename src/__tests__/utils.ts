import { isValidURL } from '@src/utils';

test('valid url', () => {
  expect(isValidURL('https://github.com')).not.toBe(false);
});
