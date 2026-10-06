/**
 * Constitution VII: a class exposes at most N public methods (default 10).
 * Counts methods, getters and setters that are not `private`/`protected` and not `#private`.
 * Constructors are not counted.
 */
const DEFAULT_MAX = 10;

const isPublicMethod = (member) =>
  member.type === 'MethodDefinition' &&
  member.kind !== 'constructor' &&
  member.key.type !== 'PrivateIdentifier' &&
  member.accessibility !== 'private' &&
  member.accessibility !== 'protected';

/** @type {import('eslint').Rule.RuleModule} */
export const maxPublicMethods = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Limit the number of public methods per class (constitution VII).' },
    schema: [{ type: 'integer', minimum: 1 }],
    messages: {
      tooMany: 'Class has {{count}} public methods; the maximum is {{max}}. Split responsibilities.',
    },
  },
  create(context) {
    const max = context.options[0] ?? DEFAULT_MAX;
    const check = (node) => {
      const count = node.body.body.filter(isPublicMethod).length;
      if (count > max) {
        context.report({ node, messageId: 'tooMany', data: { count: String(count), max: String(max) } });
      }
    };
    return { ClassDeclaration: check, ClassExpression: check };
  },
};

export const localPlugin = { rules: { 'max-public-methods': maxPublicMethods } };
