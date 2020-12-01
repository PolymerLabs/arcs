/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export default `
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
`;
