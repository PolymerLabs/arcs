#!/bin/sh
ECHO "> npm i [installing npm modules]"
npm i
ECHO "> tsc [invoking typescript compiler]"
tsc
ECHO "> node pegit [running peg parser builder]"
node pegit
