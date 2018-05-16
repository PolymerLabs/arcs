/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';
import IconStyle from '../../components/icons.css.js';

const StyleSheet = Xen.html`
<style>
  ${IconStyle}
  :host {
    --bar-max-width: 400px;
    --bar-max-height: 50vh;
    --bar-hint-height: 160px;
    --bar-over-height: 56px;
    --bar-peek-height: 16px;
    --bar-touch-height: 32px;
    --bar-space-height: 48px;
    --avatar-size: 24px;
    --large-avatar-size: 40px;
  }
  :host {
    display: block;
  }
  a {
    color: currentColor;
    text-decoration: none;
  }
  [scrim] {
    position: fixed;
    top: 0;
    right: 0;
    left: 0;
    height: 100vh;
    opacity: 0;
    background-color: white;
    z-index: -1;
    pointer-events: none;
    transition: opacity 200ms ease-in;
  }
  [glowable]::before {
    position: absolute;
    content: '';
    top: 0;
    left: 0;
    right: 0;
    z-index: -1;
    height: 100%;
    width: 100%;
    margin: 0 auto;
    filter: blur(12px);
    background: rgba(0,0,0,.15);
    animation: stopGlow 1.5s ease 1;
  }
  [glowable][glowing]::before {
    filter: blur(20px);
    background: rgba(94,213,227,1);
    animation: animateGlow 1.5s ease infinite;
  }
  [glowable][glowing][state="open"]::before {
    background: rgba(94,213,227,.5);
  }
  [scrim][open] {
    z-index: 9000;
    pointer-events: auto;
    opacity: 0.8;
  }
  [barSpacer] {
    height: var(--bar-space-height);
  }
  [touchbar] {
    margin-top: calc(var(--bar-touch-height) * -1);
    height: var(--bar-touch-height);
    background-color: transparent;
  }
  [bar] {
    display: flex;
    flex-direction: column;
    position: fixed;
    z-index: 10000;
    right: 0;
    bottom: 0;
    left: 0;
    margin: 0 auto;
    box-sizing: border-box;
    height: var(--bar-max-height);
    width: 90vw;
    max-width: var(--bar-max-width);
    max-height: var(--bar-hint-height);
    color: black;
    background-color: white;
    box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
    transition: transform 200ms ease-out;
  }
  [bar] > * {
    flex-shrink: 0;
  }
  [bar][state="peek"] {
    transform: translate3d(0, calc(100% - var(--bar-peek-height)), 0);
  }
  [bar][state="hint"] {
    transform: translate3d(0, 0, 0);
  }
  [bar][state="over"] {
    transform: translate3d(0, calc(100% - var(--bar-over-height)), 0);
  }
  [bar][state="open"] {
    max-height: var(--bar-max-height);
    transform: translate3d(0, 0, 0);
  }
  [toolbars] {
    display: inline-block;
    white-space: nowrap;
    height: 57px;
    width: 100%;
    overflow: hidden;
    box-sizing: border-box;
    border-bottom: 1px solid rgba(0,0,0,0.05);
    background-color: white;
  }
  [toolbar] {
    display: inline-flex;
    align-items: center;
    height: 56px;
    width: 100%;
    padding-left: 6px;
    padding-right: 6px;
    box-sizing: border-box;
  }
  [toolbar] > *:not(span):not(input) {
    margin: 16px 10px;
    height: 24px;
  }
  [toolbar] > span {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  [main][toolbar]:not([open]) {
    transform: translate3d(-100%, 0, 0);
  }
  [main][toolbar][title] {
    text-indent: 4px;
  }
  /* TODO(sjmiles): where are these extra px coming from? */
  [search][toolbar][open] {
    transform: translate3d(calc(-100% - 4px), 0, 0);
  }
  [toolbar] input {
    flex: 1;
    width: 0;
    outline: none;
    font-family: "Google Sans", sans-serif;
    font-size: 18px;
    border: none;
    /*line-height: 24px;*/
  }
  [settings][toolbar][open] {
    transform: translate3d(calc(-200% - 7px), 0, 0);
  }
  [contents] {
    flex: 1;
    display: inline-block;
    white-space: nowrap;
    width: 100%;
    overflow: hidden;
    background-color: white;
  }
  [bar][state="open"] [contents] {
    overflow-y: auto;
  }
  [content] {
    display: inline-block;
    width: 100%;
    vertical-align: top;
  }
  [content]:not([open]) {
    height: 0px;
    overflow: hidden;
  }
  [suggestions][content]:not([open]) {
    transform: translate3d(-100%, 0, 0);
  }
  [settings][content][open] {
    transform: translate3d(calc(-100% - 3px), 0, 0);
  }
  [modal] {
    padding: 32px;
    border: 1px solid orange;
    z-index: 0;
  }
  [modal]:hover {
    position: relative;
    z-index: 0;
  }
  ::slotted([slotid=modal]) {
    position: fixed;
    top: 0;
    bottom: 0;
    max-width: var(--max-width);
    width: 100vw;
    margin: 0 auto;
    padding-bottom: var(--bar-space-width);
    box-sizing: border-box;
    pointer-events: none;
    color: black;
  }
  ::slotted([slotid=suggestions]) {
    display: flex;
    flex-direction: column;
    padding: 10px;
  }
  [tools] {
    position: fixed;
    right: 0;
    width: 80vw;
    top: 0;
    bottom: 0;
    box-shadow: 0px 0px 32px 3px rgba(0,0,0,0.13);
    transform: translate3d(120%, 0, 0);
    transition: transform 200ms ease-in-out;
    overflow: auto;
    color: black;
    background-color: white;
  }
  [tools][open] {
    z-index: 10000;
    transform: translate3d(0,0,0);
  }
  [state="open"] {
    --suggestion-wrap: normal;
  }
  avatar {
    display: inline-block;
    height: var(--avatar-size);
    width: var(--avatar-size);
    min-width: var(--avatar-size);
    border-radius: 100%;
    border: 1px solid whitesmoke;
    background: gray center no-repeat;
    background-size: cover;
  }
  @keyframes animateGlow {
    0%  {
      filter: blur(20px);
      opacity: 1;
      -webkit-animation-timing-function: ease-in;
    }
    50% {
      filter: blur(12px);
      opacity: .5;
      -webkit-animation-timing-function: linear;
    }
    100% {
      opacity: 1;
      filter: blur(20px);
      -webkit-animation-timing-function: ease-out;
    }
  }
  @keyframes stopGlow {
    0%  {
      filter: blur(20px);
      opacity: 1;
      background: rgba(94,213,227,.5);
      -webkit-animation-timing-function: ease-in;
    }
    50% {
      filter: blur(12px);
      opacity: .5;
      -webkit-animation-timing-function: linear;
    }
    100% {
      filter: blur(12px);
      background: rgba(0,0,0,.15);
      opacity: 1;
      -webkit-animation-timing-function: ease-out;
    }
  }
</style>
`;

export {StyleSheet};
