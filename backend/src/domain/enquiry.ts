/** A customer's enquiry about one product. Input is already validated and trimmed. */
export interface Enquiry {
  readonly productId: number;
  readonly name: string;
  readonly email: string;
  readonly phone: string | undefined;
  readonly message: string;
}
