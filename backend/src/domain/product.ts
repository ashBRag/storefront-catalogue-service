/** Our product model. Independent of any upstream: adapters map into this shape. */
export interface Product {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly rating: Rating;
}

export interface Rating {
  /** Average score, 0–5. */
  readonly rate: number;
  /** Number of ratings behind the average. */
  readonly count: number;
}
