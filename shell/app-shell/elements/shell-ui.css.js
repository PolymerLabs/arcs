import Xen from '../../components/xen/xen.js';
import Icons from '../icons.css.js';

export default Xen.html`

<style>
  ${Icons}
  :host {
    --toolbar-height: 56px;
    --footer-height: 34px;
    --toast-affordance-height: 32px;
  }
  :host {
    display: block;
    max-width: var(--max-width);
    min-width: var(--min-width);
    margin: 0 auto;
    background-color: whitesmoke;
    overflow-x: hidden;
  }
  [hidden] {
    display: none;
  }
  app-modal {
    display: none;
    position: fixed;
    width: 100vw;
    max-width: var(--max-width);
    min-width: var(--min-width);
    top: 0;
    bottom: 0;
    padding-top: var(--toolbar-height);
    padding-bottom: var(--footer-height);
    background-color: rgba(0, 0, 0, 0.5);
    overflow: hidden;
  }
  app-modal[shown] {
    display: block;
    z-index: 2000;
  }
  app-dialog {
    display: none;
    width: 85%;
    height: calc(100vh - 300px);
    margin: 64px auto 0;
  }
  app-dialog[open] {
    display: block;
    overflow-x: hidden;
    overflow-y: auto;
  }
  app-main {
    display: block;
    min-height: 100vh;
  }
  toolbar {
    display: block;
    height: var(--toolbar-height);
  }
  app-toolbar {
    position: fixed;
    top: 0;
    width: 100%;
    max-width: var(--max-width);
    height: var(--toolbar-height);
    display: flex;
    align-items: center;
    white-space: nowrap;
    padding-left: 16px;
    box-sizing: border-box;
    background-color: white;
    z-index: 1000;
  }
  app-toolbar > *, app-toolbar > toolbar-buttons > * {
    margin-right: 16px;
  }
  arc-title {
    flex: 1;
    min-height: 0.6em;
    padding-top: 0.1em;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  avatar {
    height: 32px;
    width: 32px;
    min-width: 32px;
    border-radius: 100%;
    border: 1px solid whitesmoke;
    background: gray center no-repeat;
    background-size: cover;
  }
  toolbar-buttons {
    display: flex;
    white-space: nowrap;
    align-items: center;
    padding-right: 0;
  }
  toolbar-buttons > a {
    color: inherit;
    text-decoration: none;
  }
  [launcher] toolbar-buttons {
    display: none;
  }
  footer {
    display: block;
    position: relative;
    height: var(--footer-height);
  }
  arc-footer {
    position: fixed;
    bottom: 0;
    width: 100%;
    max-width: var(--max-width);
    background-color: white;
    color: black;
  }
  [slotid=suggestions] {
    max-height: 356px;
    overflow-y: auto;
    overflow-x: hidden;
  }
  [slotid=modal] {
    position: fixed;
    top: var(--toolbar-height);
    bottom: var(--footer-height)
    width: 100%;
    max-width: var(--max-width);
    margin: 0 auto;
    box-sizing: border-box;
    pointer-events: none;
    color: black;
  }
  app-tools {
    display: none;
    background-color: white;
  }
  /* wider-than-mobile */
  @media (min-width: 500px) {
    :host([expanded]) {
      --max-width: 424px;
      margin: 0;
    }
    :host([expanded]) app-tools {
      display: block;
      position: fixed;
      left: var(--max-width);
      right: 0;
      top: 0;
      bottom: 0;
      overflow: auto;
      border-left: 1px solid silver;
    }
  }
</style>

`;