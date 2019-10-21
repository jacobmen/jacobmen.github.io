// From DOM
const userInput = document.getElementById("userInput");
const searchBtn = document.getElementById("searchBtn");
const resultsTable = document.getElementById("results-table");
const coll = document.getElementsByClassName("collapsible");
const categorySearch = document.getElementById("myInput");
const dropdown = document.getElementById("myDropdown");
const dropdownContainer = document.getElementById("drop-container");
const valueSelect = document.getElementById("value-select");


const api = "https://jservice-proxy.netlify.com/api/";
// Populated with createCategoryArray() function below and contains all of the category objects the API provides
const categories = [];
// Used for interactions with styling
let categoriesLoaded = false;
// Variable used to store the category selected by the user in the category search option
let selectedCategory = 0;
// Variable used to store value selected by user in value select option
let selectedValue = 0;
// Var stores start date for calendar
let startDate = null;
// Var stores end date for calendar
let endDate = null;

// This is the calendar object that initiates a search when a start and end date are selected
flatpickr("#datepicker", {
    mode: "range",
    dateFormat: "m/d/Y",
    onChange: (selectedDates, dateStr) => {
        if (selectedDates.length == 2) {
            startDate = selectedDates[0];
            endDate = selectedDates[1];
            search();
        } else {
            startDate = null;
            endDate = null;
        }
    }
});

// Set search parameters to default value on page load
userInput.value = "";
categorySearch.value = "";
valueSelect.value = "0";

// Checks to see if user clicks anywhere in window in order to close dropdowns
window.addEventListener("click", () => {
    clearDropdown();
})

// Prevents a click on the dropdown list from closing the dropdown menu
dropdown.addEventListener("click", e => e.stopPropagation());

// Called when search button clicked
searchBtn.addEventListener("click", search);

/**
 * Upon calling the funtion the following things happen:
 * 
 * 1. The input from the search box is checked to see if it's filled and that the categories are loaded
 * 
 * 2. Inside the if statement, the results from a possible previous query are wiped 
 *    and the button is disabled while the query is processed to avoid overloading
 * 
 * 3. The searchResults array is filled with category objects that contain a substring
 *    of what the user entered and aren't null if the user hasn't selected a category
 * 
 * 4. Next the individual questions that are tied to a specific category inside searchResults 
 *    are found using getQuestions(searchResults) and embedded in the html
 * 
 * 5. The search button is enabled and the user can make the next search
 */
function search() {
    let input = userInput.value;
    const displayCount = 20;
    if (input != "" && categoriesLoaded) {
        // Creates top row for table
        resultsTable.innerHTML = `<tr>
                                    <th>Question</th>
                                    <th>Answer</th>
                                    <th>Value</th>
                                    <th>Air Date</th>
                                  </tr>`;
        searchBtn.setAttribute("disabled", "");
        searchBtn.innerText = "Loading...";
        let searchResults = categories.filter(category => {
            return category.title != null && category.title.toLowerCase().includes(input.toLowerCase());
        }).map(category => category.id);;
        if (selectedCategory != 0) {
            searchResults = searchResults.filter(value => value == selectedCategory);
        }
        getQuestions(searchResults).then(clues => {
            clues.slice(0, displayCount).forEach(clue => {
                // Regex used to remove backslashes sometimes found in text
                resultsTable.innerHTML +=
                    `<tr>
                        <td>${clue.question.replace(/\\/g, "")}</td>
                        <td>${clue.answer.replace(/\\/g, "")}</td>
                        <td>${clue.value}</td>
                        <td>${new Date(clue.airdate).toLocaleDateString()}</td>
                    </tr>`
            })
            searchBtn.removeAttribute("disabled");
            searchBtn.innerText = "Search";
        })
    }
} 

/**
 * 1. The category search starts only when the amount of keys entered is greater than 3
 *    to avoid too many queries for large amounts of value.
 * 
 * 2. The dropdown is cleared from any previous queries
 * 
 * 3. The categories array is filtered for category titles that contain the search input
 *    as a substring. Also checked to not be null to avoid any future errors
 * 
 * 4. The amount of results is limited by the maxDropDownAmount variable to avoid a 
 *    very large dropdown menu
 * 
 * 5. Each result is added to the dropdown container as an anchor tag for the styles associated
 *    and to add an event listener for a click
 */
categorySearch.addEventListener("keyup", () => {
    let input = categorySearch.value;
    // Resets selected category upon new search
    selectedCategory = 0;
    // Wipes dropdown upon each search
    clearDropdown();
    if (categorySearch.value.length >= 3) {
        let searchResults = categories.filter(category => {
            return category.title != null && category.title.toLowerCase().includes(input.toLowerCase());
        })
        let maxDropDownAmount = 10;
        searchResults.slice(0, maxDropDownAmount).forEach(result => {
            let element = document.createElement("a");
            element.innerText = result.title;
            element.addEventListener("click", () => {
                selectedCategory = result.id;
                categorySearch.value = result.title;
                clearDropdown();
                search();
            })
            dropdownContainer.append(element)
        })
        dropdownContainer.style.display = "block";
    }
})

valueSelect.addEventListener("change", () => {
    selectedValue = valueSelect.options[valueSelect.selectedIndex].value;
    search();
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
 * Populates categories array with all of the different categories provided by the API
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
 * @param {int} count amount of categories for each fetch
 * @param {int} offset offset so we don't get the same returns each time
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
 * with additional options collapsible added if user modified them
 * @param {Array} categoryIDs 
 * @returns {Array} clues
 */
async function getQuestions(categoryIDs) {
    let clues = [];
    let promises = [];
    let url = `${api}clues?`
    if (selectedValue != 0) {
        url += `value=${selectedValue}&`;
    }
    if (startDate != null && endDate != null) {
        url += `min_date=${startDate.toISOString()}&`
        url += `max_date=${endDate.toISOString()}&`
    }
    for (let i = 0; i < categoryIDs.length; i++) {
        promises.push(new Promise((resolve, reject) => {
            fetch(`${url}category=${categoryIDs[i]}`).then(response => response.json()).then(data => {
                data.forEach(element => {
                    if (element.question && element.answer && element.value) {
                        clues.push(element);
                    }
                })
                resolve();
            })
        }))
    }
    await Promise.all(promises);
    return clues;
}

function clearDropdown() {
    dropdownContainer.innerHTML = "";
    dropdownContainer.style.display = "none";
}

// Code for working with collapsible
for (let i = 0; i < coll.length; i++) {
    coll[i].addEventListener("click", function () {
        this.classList.toggle("active");
        var content = this.nextElementSibling;
        if (content.style.maxHeight) {
            content.style.maxHeight = null;
        } else {
            content.style.maxHeight = content.scrollHeight + "px";
        }
    });
}