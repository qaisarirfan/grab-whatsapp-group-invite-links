import { isValidURL } from '../utils';

test('valid url', () => {
  expect(isValidURL('https://github.com')).not.toBe(false);
});
