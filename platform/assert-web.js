export default function assert(test, message) {
  if (!test) {
    throw new Error(message);
  }
};
