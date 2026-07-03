// Registration is CLOSED unless explicitly opted in, mirroring the demo gate's
// positive non-prod assertion. Unset / '' / 'false' / anything != 'true' => closed.
// Read process.env at call time (per request) so tests can flip it.
export function isRegistrationEnabled(): boolean {
  return process.env.REGISTRATION_ENABLED === 'true';
}
