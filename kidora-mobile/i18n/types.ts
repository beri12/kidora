export type DeepPartial<T> = { [K in keyof T]?: T[K] extends string ? string : DeepPartial<T[K]> };

type Join<K extends string, P extends string> = `${K}.${P}`;

/** 'a.b.c' paths to every string leaf of T. */
export type LeafPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : Join<K, LeafPaths<T[K]>>;
}[keyof T & string];

export type TranslationParams = Record<string, string | number>;
