/// BareSpecifier=moment\src\lib\moment\now
export var now = function () {
    return Date.now ? Date.now() : +new Date();
};