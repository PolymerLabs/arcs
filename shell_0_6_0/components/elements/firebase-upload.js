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
      const percent =
          Math.floor((snapshot.bytesTransferred / snapshot.totalBytes) * 100.0);
      log(`Upload progress [percent=${percent}%, state=${snapshot.state}].`);
      this.value = percent;
      this._fire('progress');
    };
    const error = error => {
      logError('Error uploading', error);
      this.value = error;
      this._fire('error');
    };
    const complete = () => this._uploadComplete(file, imageRef);
    imageRef.put(file).on(
        firebase.storage.TaskEvent.STATE_CHANGED, {next, error, complete});
  }
  async _getImageDimensions(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({width: image.width, height: image.height});
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject({});
      };
      image.src = url;
    });
  }
  async _uploadComplete(file, ref) {
    try {
      const url = await ref.getDownloadURL();
      const {width, height} = await this._getImageDimensions(file);
      log(`Image dimensions [width=${width}, height=${height}].`);
      this.value = {width, height, url};
      this._fire('upload');
    } catch (error) {
      logError('Error getting download url', error);
      this.value = error;
      this._fire('error');
    }
  }
}
customElements.define('firebase-upload', FirebaseUpload);
