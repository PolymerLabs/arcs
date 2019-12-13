/// BareSpecifier=moment\src\lib\create\local
import { createLocalOrUTC } from './from-anything.js';

export function createLocal(input, format, locale, strict) {
    return createLocalOrUTC(input, format, locale, strict, false);
}