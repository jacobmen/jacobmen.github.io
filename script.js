// From DOM
const userInput = document.getElementById("userInput");
const searchBtn = document.getElementById("searchBtn");
const resultsContainer = document.getElementById("results");

const api = "https://jservice-proxy.netlify.com/api/";
// Populated with createCategory() function below and contains all of the category objects the API provides
const categories = [];
// Used for interactions with styling
let categoriesLoaded = false;

/**
 * Upon clicking the button the following things happen:
 * 
 * 1. The input from the search box is checked to see if it's filled and that the categories are loaded
 * 
 * 2. Inside the if statement, the results from a possible previous query are wiped 
 *    and the button is disabled while the query is processed to avoid overloading the server
 * 
 * 3. The searchResults array is filled with category objects that contain a substring
 *    of what the user entered and aren't null
 * 
 * 4. Next the individual questions that are tied to a specific category inside searchResults 
 *    are found using getQuestions(searchResults) and embedded in the html
 * 
 * 5. The search button is enabled and the user can make the next search
 */
searchBtn.addEventListener("click", () => {
    let input = userInput.value;
    const displayCount = 20;
    if (input != "" && categoriesLoaded) {
        resultsContainer.innerHTML = "";
        searchBtn.setAttribute("disabled", "");
        searchBtn.innerText = "Loading...";
        let searchResults = categories.filter(category => {
            return category.title != null && category.title.toLowerCase().includes(input.toLowerCase());
        });
        getQuestions(searchResults).then(clues => {
            clues.slice(0, displayCount).forEach(clue => {
                resultsContainer.innerHTML +=
                    `<div class="result">
                        <div class="question">${clue.question.replace(/\\/g, "")}</div>
                        <div class="answer">${clue.answer.replace(/\\/g, "")}</div>
                        <div class="value">${clue.value}</div>
                    </div>`
            })
            searchBtn.removeAttribute("disabled");
            searchBtn.innerText = "Search";
        })
    }
})

/**
 * Clicks search button on enter key being pressed in input
 */
userInput.addEventListener("keyup", (event) => {
    if (event.keyCode === 13) {
        event.preventDefault();
        searchBtn.click();
    }
})

/**
 * Populates an array with all of the different categories provided by the API
 * to allow for easier searching in the future
 */
async function createCategoryArray() {
    // Button is disabled while categories acquired
    searchBtn.setAttribute("disabled", "");
    // Calculated amount of total categories
    const categoryCount = 18418;
    // How many categories to return for each fetch
    var count = 100;
    // Array of requests in order to call the API for categories faster
    let promises = [];
    // Loop for making requests
    for (let offset = 0; offset < categoryCount; offset += count) {
        promises.push(makeCategoryRequest(count, offset));
    }
    await Promise.all(promises);
    categoriesLoaded = true;
    searchBtn.removeAttribute("disabled");
    searchBtn.innerText = "Search";
}

/**
 * Makes a network request to the API and adds response to the categories array
 * @param {int} count 
 * @param {int} offset 
 */
async function makeCategoryRequest(count, offset) {
    let data = await fetch(`${api}categories?count=${count}&offset=${offset}`).then(response => response.json())
    data.forEach(element => {
        categories.push(element);
    })
}

let time = Date.now();
createCategoryArray().then(() => {
    console.log(categories.length);
    console.log(Date.now() - time);
})

/**
 * Returns an array of questions tied to the categories in the input array
 * @param {Array} categories 
 * @returns {Array} clues
 */
async function getQuestions(categories) {
    let clues = [];
    let promises = [];
    for (i = 0; i < categories.length; i++) {
        promises.push(new Promise((resolve, reject) => {
            fetch(`${api}clues?category=${categories[i].id}`).then(response => response.json()).then(data => {
                data.forEach(element => {
                    clues.push(element);
                })
                resolve();
            })
        }))
    }
    await Promise.all(promises);
    return clues;
}