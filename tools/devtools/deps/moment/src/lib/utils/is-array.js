/// BareSpecifier=moment\src\lib\utils\is-array
export default function isArray(input) {
    return input instanceof Array || Object.prototype.toString.call(input) === '[object Array]';
}