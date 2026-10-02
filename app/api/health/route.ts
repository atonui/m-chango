export const dynamic='force-dynamic';
/** Process liveness only; deliberately excludes secrets and database contents. */
export function GET(){return Response.json({status:'ok'},{headers:{'Cache-Control':'no-store'}})}
