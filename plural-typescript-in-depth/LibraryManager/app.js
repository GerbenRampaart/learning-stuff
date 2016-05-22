/**
 * (description)
 *
 * @class SayHello
 */
var SayHello = (function () {
    /**
     * Creates an instance of SayHello.
     *
     * @param {string} value (description)
     */
    function SayHello(value) {
        this.value = value;
    }
    /**
     * (description)
     */
    SayHello.prototype.Say = function () {
        console.log("Hello " + this.value);
    };
    SayHello.prototype.Test = function () {
        return 123;
    };
    return SayHello;
}());
var hw = new SayHello("World");
hw.Say();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUNBOzs7O0dBSUc7QUFDSDtJQUNJOzs7O09BSUc7SUFDSCxrQkFBbUIsS0FBYTtRQUFiLFVBQUssR0FBTCxLQUFLLENBQVE7SUFHaEMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsc0JBQUcsR0FBSDtRQUNJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQsdUJBQUksR0FBSjtRQUNJLE1BQU0sQ0FBQyxHQUFHLENBQUM7SUFDZixDQUFDO0lBQ0wsZUFBQztBQUFELENBQUMsQUFyQkQsSUFxQkM7QUFFRCxJQUFJLEVBQUUsR0FBRyxJQUFJLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUUvQixFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMifQ==