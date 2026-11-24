// Mirrors the API contract in docs/PLAN.md. Duplicated from the backend on purpose
// (the two apps share no code); keep both in sync with the contract.

export interface Rating {
  /** Average score, 0–5. */
  readonly rate: number;
  /** Number of ratings behind the average. */
  readonly count: number;
}

export interface Product {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly category: string;
  readonly price: number;
  readonly imageUrl: string;
  readonly rating: Rating;
}

/** GET /api/categories/:category/products */
export interface ProductsByCategory {
  readonly topRated: readonly Product[];
  readonly others: readonly Product[];
}

/** POST /api/enquiries body. */
export interface EnquiryInput {
  readonly productId: number;
  readonly name: string;
  readonly email: string;
  readonly phone?: string;
  readonly message: string;
}

/** POST /api/enquiries success body. */
export interface EnquiryAccepted {
  readonly ok: true;
}

/** One field-level problem in a 400 response's `details`. */
export interface ApiErrorDetail {
  readonly path: string;
  readonly message: string;
}

/** Every backend error body: `{ error: { code, message, details? } }`. */
export interface ApiErrorBody {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly details?: unknown;
  };
}
