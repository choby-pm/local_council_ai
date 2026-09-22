export { cn } from "cn"

export function daysSince(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24)))
}
