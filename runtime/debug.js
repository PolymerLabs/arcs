let StackTrace = require('../node_modules/stacktrace-js/stacktrace.js');

export class DLog {
  static trace(object, args) {
    let funName = StackTrace.getSync()[1].functionName;
    DLog.log(object, funName, args);
  }

  static log(object, string, args) {
    let details = '';
    switch (object.constructor.name) {
      case "FirebaseCollection":
      case "FirebaseVariable":
        let key = object.storageKey;
        let keyBits = key.split('://');
        details = keyBits[0];
        if (keyBits[0] == 'firebase') {
          keyBits = keyBits[1].split('/');
          if (keyBits[5] == 'handles') {
            let idBits = keyBits[6].split(':');
            details += ` S${idBits[0]} I${idBits[2]}`;
          } else {
            details += ` ${keyBits.slice(2).join('/')}`;
          }
        }
        details += ` ${object.type}`;
        break;
    }

    if (args && args.length) {
      for (let arg of args) {
        details += ` ${arg}: ${object[arg]}`;
      }
    }

    console.log(`${details} ${string}`);
  }

  static logObject(object, logObj, args) {
    DLog.log(object, '', args);
    console.log(logObj);
  }

  static fullTrace() {
    console.log(StackTrace.getSync().slice(1).map(a => a.toString()).join('\n'));
  }
}