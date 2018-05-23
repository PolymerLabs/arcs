// code
import Xen from '../../../components/xen/xen.js';
import IconStyle from '../../../components/icons.css.js';

const html = Xen.Template.html;
const template = html`
  <style>
    ${IconStyle}
  </style>
  <icon style="position: absolute; top: 12px; right: 12px; color: red;" hidden$="{{micHidden}}">mic</icon>
  <mic-input on-start="_onMicStart" on-end="_onMicEnd"></mic-input>
`;

const log = Xen.logFactory('VoiceDriver', '#1e22c0');

class VoiceDriver extends Xen.Base {
  get template() {
    return template;
  }
  _getInitialState() {
    return {
      micHidden: true
    };
  }
  _render(props, state) {
    return state;
  }
  _onMicStart() {
    this._setState({micHidden: false});
  }
  _onMicEnd(e, finalTranscript) {
    const lettersOnly = s => s.toLowerCase().replace(/[^A-Za-z0-9 ]/g, '');
    this._setState({micHidden: true});
    finalTranscript = lettersOnly(finalTranscript);
    if (!finalTranscript) {
      return;
    }
    log(`voice trigger: [${finalTranscript}]`);
    // see if `node` is a better match for `search` than `match`
    const findMatch = (node, trigger, search, match) => {
      //log(`node "${node.localName}" has trigger "${trigger}"`);
      if (trigger.includes(search)) {
        const diff = trigger.length - search.length;
        if (!match || match.diff > diff) {
          log(`matched "${trigger}"`);
          match = {diff, node};
        }
      }
      return match;
    };
    // find all nodes with `trigger` attribute
    let nodes = document.querySelectorAll('[trigger]');
    nodes = Array.from(nodes).concat(Array.from(this.host.querySelectorAll('[trigger]')));
    // find the node that contains `finalTranscript` with the least number of non-matching characters
    let match;
    for (const node of nodes) {
      const trigger = lettersOnly(node.getAttribute('trigger'));
      match = findMatch(node, trigger, finalTranscript, match);
    }
    // if we matched, value is the transcript
    if (match) {
      match.value = finalTranscript;
    }
    // if not, look for a prefix-match
    else {
      for (const node of nodes) {
        const trigger = lettersOnly(node.getAttribute('trigger'));
        if (finalTranscript.startsWith(trigger)) {
          match = {
            node,
            value: finalTranscript.slice(trigger.length).trim(),
          };
          log(`matched prefix "${trigger}"`);
          break;
        }
      }
    }
    // if there is a matching node, install value and click it
    if (match) {
      match.node.value = match.value;
      match.node.click();
      return;
    }
    // find a suggestion matching finalTranscript?
    const suggestions = document.querySelectorAll('suggestion-element');
    match = null;
    for (const suggestion of suggestions) {
      const trigger = suggestion.textContent.toLowerCase();
      match = findMatch(suggestion, trigger, finalTranscript, match);
    }
    // if there is a matching suggestion, click it
    if (match) {
      log(`voice: matched suggestion "${match.node.textContent}"`);
      match.node.click();
      return;
    }
    // if all else fails, use finalTranscript as suggestions search
    this._fire('search', finalTranscript);
  }
}
customElements.define('voice-driver', VoiceDriver);

