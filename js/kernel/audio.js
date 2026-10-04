// Test tone.
import {set} from './state.js';

let ac;
export function beep(){ac=ac||new(window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain();g.gain.value=set.mute?0:set.vol/100*.25;o.frequency.value=660;o.connect(g);g.connect(ac.destination);o.start();o.stop(ac.currentTime+.18)}
