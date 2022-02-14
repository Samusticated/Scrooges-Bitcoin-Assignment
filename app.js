// Restricts start and end date to pass the current date
document.getElementById("startDate").max = new Date().toISOString().split("T")[0];
document.getElementById("endDate").max = new Date().toISOString().split("T")[0];

// Create API URL for data fetch.
function createURL() {

    // Initializing startDate and endDate.
    let startDate = document.getElementById("startDate");
    let endDate = document.getElementById("endDate");

    // startdDate and endDate are now Strings, so we transform them to Unix time stamps for URL
    // Hour is set to 23 to be as close to midnight as possible.
    const getUnixDate = (dateString) => {

        let dateArray = dateString.split("-");

        // API uses UTC time
        let date = new Date(Date.UTC(dateArray[0], (dateArray[1] - 1),
            dateArray[2], '23', '00', '00'));

        // Date to unix time stamp
        let unixDate = Math.round(date.getTime() / 1000);

        return unixDate;
    }

    // Start date to unixDate startDate
    let startDateUnix = getUnixDate(startDate.value);

    // Adds extra 3600 seconds to endDate value to make sure we get the data from the last day also.
    let endDateUnix = getUnixDate(endDate.value) + 3600;

    // Return apiURL
    let apiURL = "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=eur&from=" +
        startDateUnix + "&to=" + endDateUnix;

    return apiURL;
}

// apiDataObject to hold data from API response.
let apiDataObject = {};

// In this case we use XMLHttpRequest to fetch data
async function getData() {

    // API URL with desired time period.
    let apiURL = createURL();

    // Promise response data as an object
    let dataPromise = new Promise(function (resolve) {

        // Fetching data using XMLHttpRequest()
        let xmlhttp = new XMLHttpRequest();
        xmlhttp.open('GET', apiURL, true);
     
        xmlhttp.onreadystatechange = function () {

            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {

                resolve(JSON.parse(xmlhttp.responseText));
            }
        };

        xmlhttp.send();
    });

    // After resolved, data is saved to apiDataObject
    apiDataObject = await dataPromise;
}

/*
    The apiDataObject holds the API data:
        ApiDataObject.prices Array (2) [UNIXTIMESTAMP, BITCOINPRICE]
        ApiDataObject.market_caps Array (2) [UNIXTIMESTAMP, MARKET_CAPS]
        ApiDataObject.total_volumes Array (2) [UNIXTIMESTAMP, TOTAL_VOLUMES]
*/
// Correct price datapoint(close to midnight) for each day.
function getValidPriceDatapoints() {

    let obj = apiDataObject.prices;
    let dateArr = [];
    let priceArr = [];

    for (let i = 0; i < obj.length; i++) {

        let price = obj[i][1];
        let date = new Date(obj[i][0]);

        // Last point is the correct datapoint for last day.
        if (i === (obj.length - 1)) {
            dateArr.push(date);
            priceArr.push(price);
        } else if ((i + 1) <= (obj.length - 1)) {

            let dateNext = new Date(obj[i + 1][0]);

            // If current date is different from nextDate,
            // current date is correct datapoint.
            if (date.getUTCDay() !== dateNext.getUTCDay()) {
                dateArr.push(date);
                priceArr.push(price);
            }
        }
    }
    // dpObj holds the dates and prices of datapoints.
    let dpObj = {
        dateArr,
        priceArr
    };

    // Returns the object with correct datapoints.
    return dpObj;
}
//function for getting date data without time
function getISOdate(date) {
    return date.toISOString().substring(0, 10);
}

// The most  days in a row where price is going down.
function dwTrend() {

    let resultsDiv = document.getElementById("resultsDiv");

    let dpObj = getValidPriceDatapoints();
    let dateArr = dpObj.dateArr;
    let priceArr = dpObj.priceArr;

    // Array to hold the longest downward trend indexes.
    let dwArr = [];
    // Array for comparing stretches.
    let arr = [];
    // Array for prices in the trenc.
    let dwPriceArr = [];
    // Array for dates in the trend.
    let dwDateArr = [];

    for (let i = 1; i < priceArr.length; i++) {

        let price = priceArr[i];
        let priceYd = priceArr[i - 1];

        if (price > priceYd && arr.length > dwArr.length) {
            dwArr = arr;
            arr = [];
        } else if (price > priceYd) {
            arr = [];
        } else {
            arr.push(i);
        }
    }

    // If no downward trend is found, return.
    if (dwArr.length === 0) {
        resultsDiv.innerHTML = "<span class='optionHeadline'>There was no downward trend for the given time interval.</span>"
        //return;
    }

    // Getting required values from dwArr to dwPriceArr[] and dwDateArr[].
    for (let i = 0; i < dwArr.length; i++) {

        let j = dwArr[i];

        dwPriceArr.push(priceArr[j]);
        dwDateArr.push(dateArr[j]);
    }

    // dwObj holds dates and prices of the longest downward
    let dwObj = {
        dwDateArr,
        dwPriceArr
    };

    return dwObj;
}

// Process data and returns the right answer as String
function dwResults() {

    // Get the longest downward trend.
    let dwObj = dwTrend()

    let dwPrices = dwObj.dwPriceArr;
    let dwDates = dwObj.dwDateArr;

    // dwEndDate index:
    let j = dwDates.length - 1;

    // In case datapoints are 0:00 UTC, we refer them as -1
    let dwStartDate = dwDates[0];
    let dwEndDate = dwDates[j];
    let correctStartDate = new Date(dwStartDate);
    let correctEndDate = new Date(dwEndDate);

    correctStartDate.setDate(correctStartDate.getDate() - 1);
    correctEndDate.setDate(correctEndDate.getDate() - 1);

    // dwDates but the time (h:m:s) data is parsed out with getISOdate since we don't need it.
    if (dwStartDate.getUTCHours === 0) {

        dwStartDate = getISOdate(correctStartDate);
    } else {

        dwStartDate = getISOdate(dwStartDate);
    }

    if (dwEndDate.getUTCHours === 0) {

        dwEndDate = getISOdate(correctEndDate);
    } else {

        dwEndDate = getISOdate(dwEndDate);
    }

    // Rounding prices.
    let dwFirstPrice = dwPrices[0].toFixed(2);
    let dwLastPrice = dwPrices[j].toFixed(2);
    let valueDrop = (dwPrices[0] - dwPrices[j]).toFixed(2);

    let dwPrint = "";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}<span class='optionHeadline'>The longest downward trend of bitcoin:</span>`
    dwPrint = `${dwPrint}<br><br>`;
    dwPrint = `${dwPrint}Length of the downward trend: <b>` + dwDates.length + "</b> day(s)";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}First day of downward: <b>` + dwStartDate + "</b>";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}Last day of downward: <b>` + dwEndDate + "</b>";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}Price on first day: <b>` + dwFirstPrice + " €</b>";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}Price on last day: <b>` + dwLastPrice + " €</b>";
    dwPrint = `${dwPrint}<br>`;
    dwPrint = `${dwPrint}The drop in value: <span class='redText'><b>` + valueDrop + "</span> €</b>";
    dwPrint = `${dwPrint}<br>`;

    return dwPrint;
}

/*  
    The apiDataObject holds the API data:
        apiDataObject.prices Array (2) [UNIXTIMESTAMP, BITCOINPRICE]
        apiDataObject.market_caps Array (2) [UNIXTIMESTAMP, MARKET_CAPS]
        apiDataObject.total_volumes Array (2) [UNIXTIMESTAMP, TOTAL_VOLUMES]
*/

// Correct total_volumes datapoint for each day.
function getValidVolumeDatapoints() {

    let dateArr = [];
    let volumeArr = [];
    let obj = apiDataObject.total_volumes;

    for (let i = 0; i < obj.length; i++) {

        let date = new Date(obj[i][0]);
        let volume = obj[i][1];

        // Last datapoint is the correct datapoint for last day.
        if (i === (obj.length - 1)) {
            dateArr.push(date);
            volumeArr.push(volume);
        } else if ((i + 1) <= (obj.length - 1)) {

            let dateNext = new Date(obj[i + 1][0]);

            // If current date is different than nextDate,
            // current date is correct datapoint (closest to midnight)
            if (date.getUTCDay() !== dateNext.getUTCDay()) {
                dateArr.push(date);
                volumeArr.push(volume);
            }
        }
    }
    // dpObj holds the dates and prices of datapoints.
    let dpObj = {
        dateArr,
        volumeArr
    };

    // Returns the object with correct datapoints.
    return dpObj;
}

// Which date has the biggest trading volume in euros.
function highestVolume() {

    let dpObj = getValidVolumeDatapoints();

    let dateArr = dpObj.dateArr;
    let volumeArr = dpObj.volumeArr;

    // highestVolume array, index 0 is date, index 1 is volume in euros.
    let hvArr = [];

    for (let i = 0; i < dateArr.length; i++) {

        let date = dateArr[i];
        let volume = volumeArr[i];

        // Store first date and volume to the highestVolume array
        if (i === 0) {

            hvArr.push(date);
            hvArr.push(volume);
        } else {

            // If found volume is bigger, replace
            if (volume > hvArr[1]) {

                hvArr = [];
                hvArr.push(date);
                hvArr.push(volume);
            }
        }
    }

    return hvArr;
}

// Returns the date and trading volume of that date as a string.
function hvResults() {

    // Get the date of the highest trading volume and volume itself.
    let hvArr = highestVolume();

    // In case datapoints are 0:00 UTC, we refer them as -1
    let date = hvArr[0];
    let correctDate = new Date(date);

    correctDate.setDate(correctDate.getDate() - 1);

    if (date.getUTCHours() === 0) {

        date = getISOdate(correctDate);
    } else {

        date = getISOdate(date);
    }

    // Total trading volume rounded.
    let volume = hvArr[1].toFixed(2);

    let hvPrint = "";
    hvPrint = `${hvPrint} <br>`;
    hvPrint = `${hvPrint} <span class='optionHeadline'>The highest trading volume (in euros) of bitcoin:</span>`;
    hvPrint = `${hvPrint} <br><br>`;
    hvPrint = `${hvPrint} The date: <b>` + date + "</b>";
    hvPrint = `${hvPrint} <br>`;
    hvPrint = `${hvPrint} Total volume (€): <b>` + volume + " €</b>";
    hvPrint = `${hvPrint} <br>`;

    return hvPrint;
}

// Highest profit: Finds out the best day to buy and sell bitcoin
// For maximum profit
function hProfit() {

    let resultsDiv = document.getElementById("resultsDiv");

    let dpObj = getValidPriceDatapoints();

    let dateArr = dpObj.dateArr;
    let priceArr = dpObj.priceArr;

    let buyDateIndex = 0;
    let sellDateIndex = 0;
    let bestProfit = 0;

    for (let i = 0; i < dateArr.length; i++) {

        // One price / date checked one at a time
        let price = priceArr[i];

        if (dateArr[i + 1] !== undefined) {

            // j starts as i +1 cause only future points is needed.
            for (let j = i + 1; j < dateArr.length; j++) {

                let comparablePrice = priceArr[j];

                // Erasing Price next day (comparablePrice) from price,
                // and multiplying by -1 to show profit as a positive number.
                let profit = (price - comparablePrice) * -1;

                if (profit > bestProfit) {
                    bestProfit = profit;
                    buyDateIndex = i;
                    sellDateIndex = j;
                }
            }
        }
    }

    if (buyDateIndex === 0 && sellDateIndex === 0 && bestProfit === 0) {
        resultsDiv.innerHTML += "<br>For the given time period, there are no best dates to buy or sell,<br>" +
            "because there is no chance to profit.<br>"
    }

    // Get buyDate and sellDate from dateArr on indexes we need.
    let buyDate = dateArr[buyDateIndex];
    let sellDate = dateArr[sellDateIndex];

    // exploitArr holds the buyDate(0), sellDate(1), and profit(2).
    let hProfitArr = [buyDate, sellDate, bestProfit];

    return hProfitArr;
}

// Highest profit as a String
function hpResults() {

    // The buyDate(0), sellDate(1), and profit(2)
    let hProfitArr = hProfit();

    // In case datapoints are 0:00 UTC, we refer them as -1
    let buyDate = hProfitArr[0];
    let sellDate = hProfitArr[1];
    let buyDateCorrect = new Date(buyDate);
    let sellDateCorrect = new Date(sellDate);

    buyDateCorrect.setDate(buyDateCorrect.getDate() - 1);
    sellDateCorrect.setDate(sellDateCorrect.getDate() - 1);

    if (buyDate.getUTCHours() === 0) {

        buyDate = getISOdate(buyDateCorrect);
    } else {

        buyDate = getISOdate(buyDate);
    }

    if (sellDate.getUTCHours() === 0) {

        sellDate = getISOdate(sellDateCorrect);
    } else {

        sellDate = getISOdate(sellDate);
    }

    // Profits with 1 bitcoin
    let _1BCprofit = hProfitArr[2].toFixed(2);

    let hProfitPrint = "";
    hProfitPrint = `${hProfitPrint}<br>`;
    hProfitPrint = `${hProfitPrint}<span class='optionHeadline'>The time machine exploit (highest profit possible):</span>`;
    hProfitPrint = `${hProfitPrint}<br><br>`;
    hProfitPrint = `${hProfitPrint}When to buy: <b>` + buyDate + "</b>";
    hProfitPrint = `${hProfitPrint}<br>`;
    hProfitPrint = `${hProfitPrint}When to sell: <b>` + sellDate + "</b>";
    hProfitPrint = `${hProfitPrint}<br>`;
    hProfitPrint = `${hProfitPrint}Profit with 1 bitcoin (€): <span class='greenText'><b>` + _1BCprofit + "</span> €</b>";
    hProfitPrint = `${hProfitPrint}<br>`;

    return hProfitPrint;
}

// Transforms string to date.
function transformToDate(dateString) {

    let dateArray = dateString.split("-");

    // Make sure to use UTC time.
    let date = new Date(Date.UTC(dateArray[0], (dateArray[1] - 1),
        dateArray[2], '23', '00', '00'));

    return date;
}

// Event listener to the results-button.
document.getElementById("submitBtn").addEventListener("click", async function () {

    let startDateDefault = document.getElementById("startDate").defaultValue;
    let endDateDefault = document.getElementById("startDate").defaultValue;
    let endDateValue = document.getElementById("endDate").value;
    let startDateValue = document.getElementById("startDate").value;
    let startDate = transformToDate(startDateValue);
    let endDate = transformToDate(endDateValue);
    let resultsDiv = document.getElementById("resultsDiv");

    // Empty results before new results are shown:
    resultsDiv.innerHTML = "";

    if (startDate >= endDate) {
        resultsDiv.innerHTML = "<span class='optionHeadline'>Start date cannot be after the End date.</span>";
        return;
    } else if (startDateValue === startDateDefault || endDateValue === endDateDefault) {
        resultsDiv.innerHTML = "<span class='optionHeadline'>Please pick the Start and End dates!</span>";
        return;
    }

    // Get API data
    await getData();

    // Easy access to checkboxes for options.
    let dwTrend = document.getElementById("downwardTrend");
    let htVolume = document.getElementById("highestTradingVolume");
    let hProfit = document.getElementById("highestPossibleProfit");

    // Check which options are checked.
    if (dwTrend.checked === false &&
        htVolume.checked === false &&
        hProfit.checked === false) {

        resultsDiv.innerHTML += "<span class='optionHeadline'>You must choose at least 1 option!</span>";
    } else {

        resultsDiv.innerHTML += "<span class='optionHeadline'>Time interval: <b>" + startDateValue +
            "</b> - <b>" + endDateValue + "</b><br></span>";
    }

    if (dwTrend.checked === true) {

        let dwResult = dwResults();
        resultsDiv.innerHTML += dwResult;
    }

    if (htVolume.checked === true) {
        let hvResult = hvResults();
        console.log(hvResult);
        resultsDiv.innerHTML += hvResult;
    }

    if (hProfit.checked === true) {
        let hResult = hpResults();
        resultsDiv.innerHTML += hResult;
    }
});