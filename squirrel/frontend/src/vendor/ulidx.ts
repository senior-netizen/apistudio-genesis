const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export function ulid(date = Date.now()): string {
  let time = date;
  let output = '';
  for (let i = 0; i < 10; i += 1) {
    const mod = time % 32;
    output = ENCODING[mod] + output;
    time = Math.floor(time / 32);
  }
  for (let i = 0; i < 16; i += 1) {
    output += ENCODING[Math.floor(Math.random() * 32)];
  }
  return output;
}

export type UlidLike = string;
