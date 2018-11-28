export default `
  icon {
    font-family: "Material Icons";
    font-size: 24px;
    font-style: normal;
    -webkit-font-feature-settings: "liga";
    -webkit-font-smoothing: antialiased;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
    /* partial FOUC prevention */
    display: inline-block;
    width: 24px;
    height: 24px;
    overflow: hidden;
  }
  icon[hidden] {
    /* required because of display rule above,
    display rule required for overflow: hidden */
    display: none;
  }
`;
