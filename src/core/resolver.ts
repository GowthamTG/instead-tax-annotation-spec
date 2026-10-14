import type { Binding, Diagnostic, Field } from '../schema/types.js';
import { error } from './diagnostics.js';
export type Resolution =
  | { status: 'value'; value: string | number | boolean }
  | { status: 'missing' | 'null' | 'empty' | 'invalid' };
const syntax = /^(?:\/(?:[^~/]|~[01])*)*$/;
export function resolvePointer(root: unknown, pointer: string, context?: unknown): Resolution {
  let current = root;
  if (pointer.startsWith('./')) {
    current = context;
    pointer = pointer.slice(1);
  }
  if (!syntax.test(pointer)) return { status: 'invalid' };
  for (const raw of pointer === '' ? [] : pointer.slice(1).split('/')) {
    const token = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (current === null || current === undefined) return { status: 'missing' };
    if (typeof current !== 'object') return { status: 'invalid' };
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/.test(token)) return { status: 'invalid' };
    if (!Object.prototype.hasOwnProperty.call(current, token)) return { status: 'missing' };
    current = (current as Record<string, unknown>)[token];
  }
  if (current === undefined) return { status: 'missing' };
  if (current === null) return { status: 'null' };
  if (current === '') return { status: 'empty' };
  if (
    typeof current === 'string' ||
    typeof current === 'boolean' ||
    (typeof current === 'number' && Number.isFinite(current))
  )
    return { status: 'value', value: current };
  return { status: 'invalid' };
}
export function resolveBinding(root: unknown, binding: Binding, context?: unknown): Resolution {
  if (typeof binding === 'string') return resolvePointer(root, binding, context);
  const resolved = binding.parts.map((p) => resolvePointer(root, p, context));
  if (resolved.some((r) => r.status === 'invalid')) return { status: 'invalid' };
  const parts = resolved.flatMap((r) => (r.status === 'value' ? [String(r.value)] : []));
  return parts.length
    ? { status: 'value', value: parts.join(binding.separator ?? ' ') }
    : { status: 'missing' };
}
// Array groups resolve to collections, unlike scalar field bindings.
export function resolveArray(root: unknown, pointer: string): unknown[] | undefined {
  if (!syntax.test(pointer)) return undefined;
  let current = root;
  for (const raw of pointer === '' ? [] : pointer.slice(1).split('/')) {
    const token = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (
      !current ||
      typeof current !== 'object' ||
      !Object.prototype.hasOwnProperty.call(current, token)
    )
      return undefined;
    if (Array.isArray(current) && !/^(0|[1-9]\d*)$/.test(token)) return undefined;
    current = (current as Record<string, unknown>)[token];
  }
  return Array.isArray(current) ? current : undefined;
}
export function resolutionDiagnostics(result: Resolution, field: Field): Diagnostic[] {
  const sourcePath = typeof field.binding === 'string' ? field.binding : undefined;
  if (result.status === 'invalid')
    return [
      {
        ...error(
          'E_BINDING',
          'resolution',
          'Binding is invalid or does not resolve to a scalar.',
          field,
        ),
        sourcePath,
      },
    ];
  if (result.status !== 'value' && field.required)
    return [
      {
        ...error('E_REQUIRED', 'resolution', 'Required field has no nonempty value.', field),
        sourcePath,
      },
    ];
  if (result.status !== 'value')
    return [
      {
        code: 'I_BLANK',
        severity: 'info',
        stage: 'resolution',
        message: `Optional field resolves to ${result.status}.`,
        fieldId: field.id,
        page: field.page,
        sourcePath,
      },
    ];
  return [];
}
