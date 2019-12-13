/// BareSpecifier=moment\src\lib\utils\is-function
export default function isFunction(input) {
    return input instanceof Function || Object.prototype.toString.call(input) === '[object Function]';
}