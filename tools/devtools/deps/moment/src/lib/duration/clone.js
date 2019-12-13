/// BareSpecifier=moment\src\lib\duration\clone
import { createDuration } from './create.js';

export function clone() {
    return createDuration(this);
}