export type ActionErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "VALIDATION"
  | "CONFLICT"
  | "NOT_FOUND"
  | "BUSINESS";

export class ActionError extends Error {
  code: ActionErrorCode;

  constructor(message: string, code: ActionErrorCode = "BUSINESS") {
    super(message);
    this.name = "ActionError";
    this.code = code;
  }
}

export type ActionResult =
  | {
      ok: true;
      message?: string;
      id?: string;
    }
  | {
      ok: false;
      error: string;
      code?: ActionErrorCode;
      fieldErrors?: Record<string, string[]>;
    };
