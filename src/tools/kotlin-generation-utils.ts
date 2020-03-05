export interface KotlinConstants {
  indent: number;
  lineLength: number;
}

export const KT_BASE: KotlinConstants = {indent: 4, lineLength: 120};

function collectionTemplate(items: string[], indent: number = KT_BASE.indent, collection: string = 'list') {
  const lowered = collection.toLowerCase();
  if (items.length == 0){
    return `empty${lowered[0].toUpperCase()}${lowered.substring(1)}()`;
  }
  return `${lowered}Of(${joinWithinLine(items, indent)})`;
}

export function mapOf(items: string[], indent: number = KT_BASE.indent): string {
  return collectionTemplate(items, indent, 'map');
}

export function listOf(items: string[], indent: number = KT_BASE.indent): string {
  return collectionTemplate(items, indent);
}

export function setOf(items: string[], indent: number = KT_BASE.indent): string {
  return collectionTemplate(items, indent, 'set');
}

export function leftPad(input: string, indent: number, skipFirst: boolean = false) {
  return input
    .split('\n')
    .map((line: string, idx: number) => (idx === 0 && skipFirst) ? line : ' '.repeat(indent) + line)
    .join('\n');
}

export function joinWithinLine(items: string[],
                               startIndent: number,
                               indent: number = KT_BASE.indent,
                               limit: number = KT_BASE.lineLength): string {
  const candidate = items.join(', ');
  if (startIndent + candidate.length <= limit) return candidate;
  return '\n' + leftPad(items.join(',\n' + indent), startIndent) + '\n';
}
