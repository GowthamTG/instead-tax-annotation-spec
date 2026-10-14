import type { Diagnostic, Field, Stage } from '../schema/types.js';
// Messages are static: user data and exception strings never enter diagnostics.
export function error(code: string, stage: Stage, message: string, field?: Field): Diagnostic {
  return {
    code,
    severity: 'error',
    stage,
    message,
    ...(field ? { fieldId: field.id, page: field.page } : {}),
  };
}
