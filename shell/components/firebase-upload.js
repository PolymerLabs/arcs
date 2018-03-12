import Xen from './xen/xen.js';
import Firebase from './firebase.js';

const {firebase, storage} = Firebase;

const template = `

  <input type="file" on-change="_onFilesChanged" multiple="{{multiple}}">

`;

class FirebaseUpload extends Xen.Base {
  get template() {
    return template;
  }
  static get observedAttributes() {
    return ['multiple'];
  }
  _render({multiple}) {
    return {
      multiple
    };
  }
  _onFilesChanged(e) {
    const input = e.currentTarget;
    //console.log(input.value, input.files);
    const file = input.files[0];
    const rando = Math.floor((Math.random()+1)*1e8);
    const path = `files/${rando}`;
    console.log(file.name, 'as', path);
    this._uploadFile(file, path);
  }
  _uploadFile(file, uploadPath) {
    const imageRef = storage.ref().child(uploadPath);
    const next = () => {
    };
    const error = error => {
      console.error('Error uploading: ' + error);
    };
    const complete = snapshot => {
      console.log('Uploaded a blob or file!');
      imageRef.getDownloadURL().then(function(url) {
        console.log(url);
      }).catch(function(error) {
        console.error('Error getting download url: ' + error);
      });
    };
    imageRef.put(file).on(firebase.storage.TaskEvent.STATE_CHANGED, {next, error, complete});
  }
}
customElements.define('firebase-upload', FirebaseUpload);