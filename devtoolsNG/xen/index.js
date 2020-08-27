import './elements/object-explorer.js';
import './elements/filter-input.js';

const {oe, log} = window; // extract DOM elements

const dom = (tag, props, parent) => parent.appendChild(Object.assign(document.createElement(tag), props));
const entry = object => dom('object-explorer', {object}, log);

let entries = [
  "I just",
  ["want", "to", {show: ['that many', 'different']}],
  {types: {of: true, objects: false}},
  String.raw`can\nbe\ndisplayed`,
  "<b>safe if not bold!</b>",
  42
];

const randomEntry = () => entries[Math.floor(Math.random()*entries.length)];

let object = [];
for (let j=0; j<500; j++) {
  object.push(randomEntry());
}

//let i = 0;
// const receive = () => {
//   entry(randomEntry());
//   //
//   object.push(randomEntry());
//   // TODO(sjmiles): by default, object-properties are treated as immutable, so create a new object
//   oe.object = [...object];
//   //
//   if (++i < 30) {
//     setTimeout(receive, 1000 + Math.floor(Math.random()*2000));
//   }
// };

let i = 0;
const receive = () => {
  const data = entries[i];
  data.timestamp = Date.now();
  entry(data);
  //
  object.push(data);
  // TODO(sjmiles): by default, object-properties are treated as immutable, so create a new object
  oe.object = [...object];
  //
  if (++i < entries.length) {
    setTimeout(receive, 1000 + Math.floor(Math.random()*2000));
  }
};

const load = async () => {
  const res = await fetch('./messages_8_5_2020.json');
  const json = await res.json();
  entries = json;
};

(async () => {
  await load();
  receive();
})();

//oe.object = entries[2];
