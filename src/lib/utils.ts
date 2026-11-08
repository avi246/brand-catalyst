export { cn } from "cn"

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** True for a well-formed UUID. Check IDs from the URL before querying, so bad links 404 instead of erroring. */
export const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value)
