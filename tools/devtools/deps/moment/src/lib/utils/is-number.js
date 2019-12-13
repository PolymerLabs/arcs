/// BareSpecifier=moment\src\lib\utils\is-number
export default function isNumber(input) {
    return typeof input === 'number' || Object.prototype.toString.call(input) === '[object Number]';
}