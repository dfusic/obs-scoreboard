/**
 * A copy without the keys whose value is undefined. Backends reject undefined (Firestore
 * throws without `ignoreUndefinedProperties`), so every partial update goes through this.
 * null is kept: it is a real value (e.g. "no photo").
 */
export function withoutUndefined<T extends object>(fields: T): Partial<T> {
  return Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined)) as Partial<T>;
}
