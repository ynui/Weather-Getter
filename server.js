const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const server = express();
const PORT = process.env.PORT || 3000;

const BASE_URL = "https://www.accuweather.com/"

const MINUTE = 60 * 1000;
const RELEVANT_TIME = 5 * MINUTE;

let urlMap = new Map();
let dataMap = new Map();


server.get('/', (request, response) => {
    response.sendFile(path.join(__dirname + '/index.html'));
});

server.get('/style.css', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/style.css'));
});

server.get('/bootstrap.min.css', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/bootstrap.min.css'));
});

server.get('/background.jpg', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/background.jpg'));
});

server.get('/index.js', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/index.js'));
});

server.get('/jquery-3.4.1.min.js', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/jquery-3.4.1.min.js'));
});

server.get('/favicon.ico', (request, response) => {
    response.sendFile(path.join(__dirname + '/src/favicon.png'));
});

server.listen(PORT, () => {
    console.log('Server started at port:', PORT);
});

server.get('/getWeatherData', (request, response) => {
    response.setHeader('Content-Type', 'application/json');
    const cityName = request.param('cityName').toLowerCase();
    console.log('Received request:', cityName);
    if (urlMap.has(cityName)) {
        console.log('Procceced url (from database): ', urlMap.get(cityName));
        getDataFromExistingURL(urlMap.get(cityName), response)
    } else {
        getRequiredURL(cityName, response);
    }
});

async function getDataFromExistingURL(URL, response){
    if (isDataRelevant(URL)) {
        console.log('Procceced data (from database):\n', dataMap.get(URL));
        response.json(dataMap.get(URL));
    }
    else {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
        try {
            await page.goto(URL, { waitUntil: 'domcontentloaded' })
            await page.waitForSelector('.weather-icon.icon');
        } catch(ex){
            sendError("Connection Error....", ex, response);
            return;
        }
        getDataFromURL(browser, page, URL, response);
    }
}

async function getDataFromURL(browser, page, URL, response) {
    const timestramp = Date.now();
    await page.waitForSelector('.weather-icon.icon');
    try {
        const data = await page.evaluate(() => {
            let location = document.querySelector('.recent-location-display-label').firstElementChild.innerText;
            let country = document.querySelector('.recent-locations-label').innerText
            country = country.split('\n')[0].replace('Weather', '');
            let date = document.querySelectorAll('.date')[1].innerText;
            let tempList = document.querySelector('.temperatures').children;
            let temp = tempList[0].innerText;
            temp = temp.replace('°', '');
            let tempFeels = tempList[1].innerText;
            tempFeels = tempFeels.replace('°', '');
            tempFeels = tempFeels.split(' ')[1];
            let statePhrase = document.querySelector('.phrase').innerText;
            let infoList = document.querySelector('.list').children;
            let uvIndex = infoList[0].innerText;
            uvIndex = uvIndex.replace('UV Index:', '')
            let windspeed = infoList[1].innerText;
            windspeed = windspeed.replace('Wind:', '');
            let humidity = infoList[3].innerText;
            humidity = humidity.replace('Humidity:', '').replace('%', '');
            let pressure = infoList[5].innerText;
            pressure = pressure.replace('Pressure:', '');
            let cloudCover = infoList[6].innerText;
            cloudCover = cloudCover.replace('Cloud Cover:', '').replace('%', '');
            let visibility = infoList[7].innerText;
            visibility = visibility.replace('Visibility:', '');
            let sunrise = document.querySelector('.rise>.section-content').innerText;
            let sunset = document.querySelector('.set>.section-content').innerText;
            let maxTemp = document.querySelector('.panel-1>.half-day-card>.accordion-item>.accordion-item-header-container>.conditions-card>.temp-icon-wrapper>.temperatures>.value').innerText;
            let minTemp = document.querySelector('.panel-2>.half-day-card>.accordion-item>.accordion-item-header-container>.conditions-card>.temp-icon-wrapper>.temperatures>.value').innerText;
            maxTemp = maxTemp.split('\n')[0].replace('°', '');
            minTemp = minTemp.split('\n')[0].replace('°', '');
            let icon = document.querySelector('.weather-icon.icon').src
            return {
                location, temp, tempFeels, country,
                date, statePhrase, uvIndex, windspeed,
                humidity, pressure, cloudCover,
                visibility, sunrise, sunset,
                minTemp, maxTemp, icon
            }
        })
        data.URL = URL;
        data.TIME = timestramp;
        console.log('Data collected:\n', data);
        dataMap.set(URL, data);
        response.json(data);
        await browser.close();
    } catch (ex) {
        sendError('Error occured while getting data from ' + URL, ex, response);
        await browser.close();
        return;
    }
}

async function getRequiredURL(cityName, response) {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36');
    try {
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('input[class="search-input"]');
        await page.click('input[class="search-input"]');
        await page.type('input[class="search-input"]', cityName);
        await page.keyboard.press('Enter');
        await page.waitForNavigation();
    } catch (ex) {
        sendError("Connection Error....", ex, response);
        return;
    }
    try {
        await page.evaluate(() => {
            if (document.querySelector('.search-results').childElementCount > 0) {
                document.querySelector('.search-results').firstElementChild.click();
            }
        });
        await page.waitForSelector('.panel.panel-fade-in.card');
        await page.evaluate(() => {
            document.querySelector('.panel.panel-fade-in.card').click();
        });
        await page.waitForNavigation();
        let URL = page.url()
        console.log('Procceced url: ', URL);
        urlMap.set(cityName, URL);
        if (isDataRelevant(URL)) {
            console.log('Procceced data (from database):\n', dataMap.get(URL));
            response.json(dataMap.get(URL));
        }
        else {
            getDataFromURL(browser, page, URL, response);
        }
    } catch (ex) {
        sendError(cityName + " was not found", ex, response);
        await browser.close();
    }
}

function sendError(msg, ex, response) {
    console.log(msg);
    console.log(ex);
    response.status(500).send();
}

//data is considered relevant if it was taken in the last "RELEVANT_TIME"
function isDataRelevant(URL) {
    if (!dataMap.has(URL)) return false;
    let timePassedSinceLastUpdate = Date.now() - dataMap.get(URL).TIME;
    if (timePassedSinceLastUpdate < RELEVANT_TIME) return true;
    else return false;
}