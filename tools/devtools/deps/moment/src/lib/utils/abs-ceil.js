/// BareSpecifier=moment\src\lib\utils\abs-ceil
export default function absCeil(number) {
    if (number < 0) {
        return Math.floor(number);
    } else {
        return Math.ceil(number);
    }
}