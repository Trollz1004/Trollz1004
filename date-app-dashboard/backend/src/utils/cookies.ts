import { Request } from 'express';

export const getCookie = (req: Request, name: string): string | null => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((cookie) => cookie.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split('=');
    if (key === name && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
};
