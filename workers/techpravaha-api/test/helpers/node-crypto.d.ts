// Minimal typing for the one Node API the tests use, so the Worker program does not pull in @types/node.
declare module 'node:crypto' {
  export function createHmac(algorithm: string, key: string): {
    update(data: string): { digest(encoding: 'hex'): string };
  };
}
