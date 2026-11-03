import { safeRedirect } from './redirect';
import { loginSchema, registerSchema } from './schemas';

const validRegister = {
  displayName: 'Lan',
  email: 'lan@example.com',
  password: 'listen123',
  confirmPassword: 'listen123',
};

describe('loginSchema', () => {
  it('trims email and accepts valid input', () => {
    const r = loginSchema.parse({ email: '  lan@example.com ', password: 'x' });
    expect(r.email).toBe('lan@example.com');
  });
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'lan@', password: 'x' }).success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('accepts valid input', () => {
    expect(registerSchema.safeParse(validRegister).success).toBe(true);
  });
  it.each([
    ['short', 'At least 8 characters'],
    ['12345678', 'Include at least one letter'],
    ['abcdefgh', 'Include at least one number'],
  ])('rejects weak password %s', (password, message) => {
    const r = registerSchema.safeParse({ ...validRegister, password, confirmPassword: password });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.message)).toContain(message);
  });
  it('requires matching confirmation', () => {
    const r = registerSchema.safeParse({ ...validRegister, confirmPassword: 'other123' });
    expect(r.error?.issues[0]?.path).toEqual(['confirmPassword']);
  });
  it('rejects a blank name', () => {
    expect(registerSchema.safeParse({ ...validRegister, displayName: '   ' }).success).toBe(false);
  });
});

describe('safeRedirect', () => {
  it.each([
    ['/vocabulary', '/vocabulary'],
    [encodeURIComponent('/library?lang=zh'), '/library?lang=zh'],
    [null, '/dashboard'],
    ['https://evil.example', '/dashboard'],
    ['//evil.example', '/dashboard'],
    ['/\\evil.example', '/dashboard'],
    ['%E0%A4%A', '/dashboard'],
  ])('%s → %s', (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});
