import Xen from './xen/xen.js';
import Firebase from './firebase.js';

const html = Xen.Template.html;
const {storage} = Firebase;

const template = html`

  <input type="file" onchange="previewFile()" id="files" name="files[]" multiple>

`;

class FirebaseUpload extends Xen.Base {
  get template() {
    return template;
  }
  previewFile() {
    const file = document.getElementById('files').files[0];
    console.log(file);

    const storageRef = storage.ref();
    const imageRef = storageRef.child('files/' + file.name);

    const upload = imageRef.put(file);

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
    upload.on(storage.TASKEVENT.STATE_CHANGED, {next, error, complete});
  }
}
customElements.define('firebase-upload', FirebaseUpload);