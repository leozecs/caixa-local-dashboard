const COMMON_PASSWORDS = new Set([
  "123456",
  "12345678",
  "123456789",
  "senha123",
  "password",
  "qwerty123",
  "caixalocal",
  "admin123",
  "11111111",
]);

export const GENERIC_LOGIN_ERROR = "Credenciais invalidas.";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePasswordStrength(password: string): string | null {
  const normalized = password.trim().toLowerCase();

  if (password.length < 10) return "Use uma senha com pelo menos 10 caracteres.";
  if (COMMON_PASSWORDS.has(normalized)) return "Use uma senha menos comum.";
  if (!/[a-z]/.test(password)) return "Inclua pelo menos uma letra minuscula.";
  if (!/[A-Z]/.test(password)) return "Inclua pelo menos uma letra maiuscula.";
  if (!/\d/.test(password)) return "Inclua pelo menos um numero.";
  if (!/[^A-Za-z0-9]/.test(password)) return "Inclua pelo menos um caractere especial.";

  return null;
}

export function sanitizeText(value: unknown, maxLength = 240) {
  return String(value || "")
    .split("")
    .map((char) => {
      const code = char.charCodeAt(0);
      return code < 32 || code === 127 ? " " : char;
    })
    .join("")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
