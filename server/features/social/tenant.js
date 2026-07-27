// Maps a Clerk user to a Postiz "customer" — Postiz's built-in mechanism
// for isolating many clients on one instance. Stubbed to null (single
// shared space) for now; real per-user customer provisioning is a later phase.
export function resolvePostizCustomer(clerkUserId) {
  return null
}
