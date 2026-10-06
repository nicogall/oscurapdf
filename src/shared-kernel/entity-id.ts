/** Opaque identifier, unique per session. Random; never derived from document content. */
export type EntityId<Brand extends string> = string & { readonly __entity: Brand };

export const newEntityId = <Brand extends string>(): EntityId<Brand> => crypto.randomUUID() as EntityId<Brand>;
