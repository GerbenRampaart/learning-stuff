
/**
 * (description)
 * 
 * @class SayHello
 */
class SayHello {
    /**
     * Creates an instance of SayHello.
     * 
     * @param {string} value (description)
     */
    constructor(public value: string) {
        
        
    }
    
    /**
     * (description)
     */
    Say() {
        console.log("Hello " + this.value);
    }
    
    Test() : number {
        return 123;
    }
}

var hw = new SayHello("World");

hw.Say();