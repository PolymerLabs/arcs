var productStyles = `
<style>
  ${host} > x-list [row] {
    display: flex;
    align-items: center;
  }
  ${host} > x-list [col0] {
    flex: 1;
    overflow: hidden;
    line-height: 115%;
  }
  ${host} > x-list [col0] > * {
    /*
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    */
  }
  ${host} > x-list [col1] {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 148px;
    height: 128px;
    box-sizing: border-box;
    text-align: center;
    background-size: contain;
  }
  ${host} > x-list [col1] > img {
    max-width: 128px;
    max-height: 96px;
  }
  ${host} > x-list [name] {
    font-size: 0.95em;
  }
  ${host} > x-list [category] {
    font-size: 0.7em;
    color: #cccccc;
  }
  ${host} > x-list [price] {
    color: #333333;
  }
  ${host} > x-list [seller] {
    font-size: 0.8em;
    color: #cccccc;
  }
</style>
  `;
