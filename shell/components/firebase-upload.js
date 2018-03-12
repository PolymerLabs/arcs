import Xen from './xen/xen.js';
import Firebase from './firebase.js';

const {firebase, storage} = Firebase;

const template = `
  <style>
    ::slotted(*) {
      cursor: pointer;
    }
    input[type="file"] {
      display: none;
    }
  </style>
  <label>
    <slot></slot>
    <input type="file" accept="{{accept}}" multiple="{{multiple}}" on-change="_onFilesChanged">
  </label>
`;

class FirebaseUpload extends Xen.Base {
  get template() {
    return template;
  }
  static get observedAttributes() {
    return ['multiple', 'accept'];
  }
  _render({accept, multiple}) {
    return {
      accept,
      multiple
    };
  }
  _onFilesChanged(e) {
    const input = e.currentTarget;
    const file = input.files[0];
    const random = Math.floor((Math.random()+1)*1e8);
    const path = `files/${random}`;
    console.log('uploading', file.name, 'as', path);
    this._uploadFile(file, path);
  }
  _uploadFile(file, uploadPath) {
    const imageRef = storage.ref().child(uploadPath);
    const next = () => {
    };
    const error = error => {
      console.error('Error uploading', error);
    };
    const complete = () => this._uploadComplete(imageRef);
    imageRef.put(file).on(firebase.storage.TaskEvent.STATE_CHANGED, {next, error, complete});
  }
  async _uploadComplete(ref) {
    try {
      const url = await ref.getDownloadURL();
      this.value = url;
      this._fire('upload');
    } catch (error) {
      console.error('Error getting download url', error);
    };
  }
}
customElements.define('firebase-upload', FirebaseUpload);