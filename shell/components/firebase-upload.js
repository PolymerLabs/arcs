import Firebase from './firebase.js';
import Xen from './xen/xen.js';

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

const preamble = ['FirebaseUpload', '#ff69b4'];
const log = Xen.logFactory(...preamble);
const logError = Xen.logFactory(...preamble, 'error');

class FirebaseUpload extends Xen.Base {
  get template() {
    return template;
  }
  static get observedAttributes() {
    return ['multiple', 'accept'];
  }
  _render({accept, multiple}) {
    return {accept, multiple};
  }
  _onFilesChanged(e) {
    // TODO(wkorman): Handle multiple files if present.
    const input = e.currentTarget;
    const file = input.files[0];
    const random = Math.floor((Math.random() + 1) * 1e8);
    const path = `files/${random}`;
    log(`Uploading file [name=${file.name}, size=${
        Math.floor(file.size / 1024)} KB, path=${path}].`);
    this._uploadFile(file, path);
  }
  _uploadFile(file, uploadPath) {
    const imageRef = storage.ref().child(uploadPath);
    const next = snapshot => {
      const percentProgress = (snapshot.bytesTransferred / snapshot.totalBytes);
      log(`Upload progress [percent=${
          Math.floor(percentProgress * 100.0)}%, state=${snapshot.state}].`);
      // TODO(wkorman): Report progress update to client.
    };
    const error = error => {
      logError('Error uploading', error);
      // TODO(wkorman): Report error to client.
    };
    const complete = () => this._uploadComplete(imageRef);
    imageRef.put(file).on(
        firebase.storage.TaskEvent.STATE_CHANGED, {next, error, complete});
  }
  async _uploadComplete(ref) {
    try {
      const url = await ref.getDownloadURL();
      this.value = url;
      this._fire('upload');
    } catch (error) {
      logError('Error getting download url', error);
    }
  }
}
customElements.define('firebase-upload', FirebaseUpload);
