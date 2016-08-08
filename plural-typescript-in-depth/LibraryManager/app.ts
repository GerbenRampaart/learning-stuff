function GetAllBooks() {
    let books = [
        {
            id: 1,
            title: 'Ulysses',
            author: 'James Joyce',
            available: true,
            category: Category.Fiction
        },
        {
            id: 2,
            title: 'A Farewell to Arms',
            author: 'Ernest Hemingway',
            available: false,
            category: Category.Fiction
        },
        {
            id: 3,
            title: 'I know Why the Caged Bird Sings',
            author: 'Maya Angelou',
            available: true,
            category: Category.Poetry
        },
        { 
            id: 4,
            title: 'Moby Dick', 
            author: 'Herman Melville', 
            available: true,
            category: Category.Fiction
        }
    ];
    
    return books;
}
 
function LogFirstAvailable(books = GetAllBooks()) : void {
    
    let numberOfBooks : number = books.length;
    let firstAvailable : string = '';

    for(let currentBook of books) {
        
        if(currentBook.available) {
            firstAvailable = currentBook.title;
            break;
        }
    }
    
    console.log('Total Books: ' + numberOfBooks);
    console.log('First Available: ' + firstAvailable);
}

enum Category { Biography, Poetry, Fiction, History, Children }

function GetBookTitlesByCategory(categoryFilter: Category = Category.Fiction) : Array<string> {
    
    console.log('Getting books in category: ' + Category[categoryFilter]);
    
    const allBooks = GetAllBooks();
    const filteredTitles: string[] = [];
    
    for(let currentBook of allBooks) {
        if(currentBook.category === categoryFilter) {
            filteredTitles.push(currentBook.title);
        }
    }
    
    return filteredTitles;
}

function LogBookTitles(titles: string[]) : void {
    for(let title of titles) {
        console.log(title);
    }
}

function GetBookByID(id: number) {
    const allBooks = GetAllBooks();
    return allBooks.filter(book => book.id === id)[0];
}

function CreateCustomerID(name: string, id: number) : string {
    return name + id;
}

function CreateCustomer(name: string, age?: number, city?: string) : void {
    console.log('name: ' + name);
    
    if(age) {
        console.log('age: ' + age);
    }
    
    if(city) {
        console.log('city: ' + city);
    }
}

// ******************************



CreateCustomer('name1');
CreateCustomer('name2', 34);
CreateCustomer('name3', 56, 'Roosendaal');

/*
let idGenerator : (chars: string, nums: number) => string;
idGenerator = CreateCustomerID;

let myId: string = idGenerator('test', 123);
console.log(myId);
*/
const fictionBooks = GetBookTitlesByCategory();
fictionBooks.forEach((val, idx, arr) => console.log(++idx + ' - ' + val));
