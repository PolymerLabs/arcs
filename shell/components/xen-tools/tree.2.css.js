export default `
ul, ul ul {
list-style: none;
  margin: 0;
  padding: 0;
}
ul ul {
  margin-left: 10px;
}
ul li {
  margin: 0;
  padding: 0 7px;
  line-height: 20px;
  border-left:1px solid rgb(100,100,100);
}
ul li:before {
  position:relative;
  top:-0.3em;
  height:1em;
  width:12px;
  color:white;
  border-bottom:1px solid rgb(100,100,100);
  content:"";
  display:inline-block;
  left:-7px;
}
ul:last-child > li {
  border-left:none;
}
ul:last-child > li:before {
  border-left:1px solid rgb(100,100,100);
}
`;
