// `window.firebase` may contain configuration and other non-active ingredients, but
// `window.firebase.firebase` only has a value if the (optional) firebase library is linked in.
const firebase = window.firebase ? window.firebase.firebase : null;
export {firebase};
