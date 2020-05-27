
/* Replacing WebAssembly methods with instrumented versions */
var ogWaI = WebAssembly.instantiate;
var ogWaIS = WebAssembly.instantiateStreaming;

WebAssembly.instantiate = function (buff, imp) {
    if(buff instanceof WebAssembly.Module){
        //buff is a Module, so cannot use Wabt or generate hash string
        var encoder = new TextEncoder();
        itemToDigestForHash = encoder.encode(buff.toString());
    } else {
        itemToDigestForHash = buff;
    }

    //Get the hash of the Wasm file for logging
    return crypto.subtle.digest('SHA-256', itemToDigestForHash)
    .then(wasmHash => {
        //Get the hash as a hex string
        const wasmHashString = Array.from(new Uint8Array(wasmHash)).map(b => b.toString(16).padStart(2, '0')).join('');
        console.log('!!! Found using WASM !!!', wasmHashString)
        
        //Call the original .instantiate function to get the Result Object 
        return ogWaI(buff, imp)
            .then(function (re) {
            return re
            });
    })

};

WebAssembly.instantiateStreaming = function (source, imp) {
    return source.then( sourceResponse => {
        return sourceResponse.arrayBuffer()
        .then(arrayBuffer => {
            return crypto.subtle.digest('SHA-256', arrayBuffer)
            .then(wasmHash => {
                const wasmHashString = Array.from(new Uint8Array(wasmHash)).map(b => b.toString(16).padStart(2, '0')).join('');
               
                console.log('!!! Found using WASM !!!', wasmHashString)

                
                return ogWaI(arrayBuffer, imp)
                    .then(function (re){
                        return re
                    });
            })
        });
    });

};

console.log('WebAssembly instrumented!')