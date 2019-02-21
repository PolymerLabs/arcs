console.log('WORKER');
setTimeout(() => postMessage({message: 'This is a debug message'}), 500);
//debugger;
