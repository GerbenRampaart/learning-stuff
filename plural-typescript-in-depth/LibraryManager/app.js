function GetAllBooks() {
    var books = [
        {
            title: 'Ulysses',
            author: 'James Joyce',
            available: true
        },
        {
            title: 'A Farewell to Arms',
            author: 'Ernest Hemingway',
            available: false
        },
        {
            title: 'I know Why the Caged Bird Sings',
            author: 'Maya Angelou',
            available: true
        },
        {
            title: 'Moby Dick',
            author: 'Herman Melville',
            available: true
        }
    ];
    return books;
}
function LogFirstAvailable(books) {
    var numberOfBooks = books.length;
    var firstAvailable = '';
    for (var _i = 0, books_1 = books; _i < books_1.length; _i++) {
        var currentBook = books_1[_i];
        if (currentBook.available) {
            firstAvailable = currentBook.title;
            break;
        }
    }
    console.log('Total Books: ' + numberOfBooks);
    console.log('First Available: ' + firstAvailable);
}
var allBooks = GetAllBooks();
LogFirstAvailable(allBooks);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBwLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYXBwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0lBRUksSUFBSSxLQUFLLEdBQUc7UUFDUjtZQUNJLEtBQUssRUFBRSxTQUFTO1lBQ2hCLE1BQU0sRUFBRSxhQUFhO1lBQ3JCLFNBQVMsRUFBRSxJQUFJO1NBQ2xCO1FBQ0Q7WUFDSSxLQUFLLEVBQUUsb0JBQW9CO1lBQzNCLE1BQU0sRUFBRSxrQkFBa0I7WUFDMUIsU0FBUyxFQUFFLEtBQUs7U0FDbkI7UUFDRDtZQUNJLEtBQUssRUFBRSxpQ0FBaUM7WUFDeEMsTUFBTSxFQUFFLGNBQWM7WUFDdEIsU0FBUyxFQUFFLElBQUk7U0FDbEI7UUFDRDtZQUNJLEtBQUssRUFBRSxXQUFXO1lBQ2xCLE1BQU0sRUFBRSxpQkFBaUI7WUFDekIsU0FBUyxFQUFFLElBQUk7U0FDbEI7S0FDSixDQUFDO0lBRUYsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUNqQixDQUFDO0FBRUQsMkJBQTJCLEtBQUs7SUFFNUIsSUFBSSxhQUFhLEdBQVksS0FBSyxDQUFDLE1BQU0sQ0FBQztJQUMxQyxJQUFJLGNBQWMsR0FBWSxFQUFFLENBQUM7SUFFakMsR0FBRyxDQUFBLENBQW9CLFVBQUssRUFBTCxlQUFLLEVBQUwsbUJBQUssRUFBTCxJQUFLLENBQUM7UUFBekIsSUFBSSxXQUFXLGNBQUE7UUFFZixFQUFFLENBQUEsQ0FBQyxXQUFXLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUN2QixjQUFjLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQztZQUNuQyxLQUFLLENBQUM7UUFDVixDQUFDO0tBQ0o7SUFFRCxPQUFPLENBQUMsR0FBRyxDQUFDLGVBQWUsR0FBRyxhQUFhLENBQUMsQ0FBQztJQUM3QyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixHQUFHLGNBQWMsQ0FBQyxDQUFDO0FBQ3RELENBQUM7QUFFRCxJQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQztBQUMvQixpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQyJ9