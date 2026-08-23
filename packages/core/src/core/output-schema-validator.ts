// Compile an agent's `outputSchema` (a JSON Schema) into a runtime validator
// used to gate `submit_output` payloads. Failure to compile means the schema
// itself is malformed — surface that at session-open time, not at first turn.

import { Ajv, type ValidateFunction, type ErrorObject } from "ajv";

export interface CompiledOutputSchema {
  validate: ValidateFunction;
}

const ajv = new Ajv({ allErrors: true, strict: false });

export function compileOutputSchema(schema: Record<string, unknown>): CompiledOutputSchema {
  const validate = ajv.compile(schema);
  return { validate };
}

/** Project Ajv errors into a stable string list suitable for echoing back
 *  to the model as part of a tool error result. */
export function formatOutputSchemaErrors(errors: ErrorObject[] | null | undefined): string[] {
  if (!errors || errors.length === 0) return [];
  return errors.map((e) => {
    const path = e.instancePath || "/";
    return `${path} ${e.message ?? "invalid"}`.trim();
  });
}
