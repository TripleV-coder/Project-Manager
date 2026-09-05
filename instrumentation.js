// Next.js runs register() once when the server boots.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertEnvValid } = await import('@/lib/envValidation');
    assertEnvValid();
  }
}
