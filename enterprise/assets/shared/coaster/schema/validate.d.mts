// Types of validate.mjs for TypeScript hosts in strict mode (the portal plugin's tile picture, assets/portal/tsconfig.json).

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export function validate(rootSchema: object, value: unknown): ValidationResult;

/** Validates a parsed .coaster document against coaster.schema.json. */
export function validateCoaster(document: unknown): ValidationResult;

export const coasterSchema: object;
