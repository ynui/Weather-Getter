const PresetCities = ["Tel Aviv", "Los Angeles"];
const WeatherData = [{ preset1 }, { preset2 }, { userRequest }]

const Preset1 = 1, Preset2 = 2, UserRequest = 3;
const MINUTE = 60 * 1000;
const RELEVANT_TIME = 5 * MINUTE;

const DEGREE_SYMBOL = '°'

let userRequestRecall;
let userLastInput;


function showWheatherData(data, position) {
    if (JSON.stringify(data) == JSON.stringify(WeatherData[position - 1])) {
        //console.log('Same data received', data);
        return;
    }
    WeatherData[position - 1] = data;
    document.getElementById('location' + position).innerText = data.location + "\n" + data.country + "\n" + data.date;
    document.getElementById('icon' + position).src = data.icon;
    document.getElementById('temp' + position).innerText = "Temperature: " + data.temp + DEGREE_SYMBOL;
    document.getElementById('tempFeels' + position).innerText = "Feels Like: " + data.tempFeels + DEGREE_SYMBOL;
    document.getElementById('statePhrase' + position).innerText = data.statePhrase;
    document.getElementById('uvIndex' + position).innerText = "UV Index: " + data.uvIndex;
    document.getElementById('pressure' + position).innerText = "Pressure:\n" + data.pressure;
    document.getElementById('windspeed' + position).innerText = "Wind Speed:\n " + data.windspeed;
    document.getElementById('cloudCover' + position).innerText = "Cloud Cover: " + data.cloudCover + "%";
    document.getElementById('humidity' + position).innerText = "Humidity: " + data.humidity + "%";
    document.getElementById('visibility' + position).innerText = "Visibility: " + data.visibility;
    document.getElementById('sunrise' + position).innerText = "Sunrise: " + data.sunrise;
    document.getElementById('sunset' + position).innerText = "Sunset: " + data.sunset;
    document.getElementById('maxTemp' + position).innerText = "Highest: " + data.maxTemp + DEGREE_SYMBOL;
    document.getElementById('minTemp' + position).innerText = "Lowest: " + data.minTemp + DEGREE_SYMBOL;
    setAndShowTermo(position, data.temp);
}

function setAndShowTermo(position, temp) {
    document.getElementById('termo' + position).style.visibility = "visible";
    setTimeout(setAndShowTermoTemp, 888, position, temp);
}

function setRecall(position) {
    if (position == Preset1 || position == Preset2)
        setTimeout(getWeatherData, RELEVANT_TIME, PresetCities[position - 1], position);
    else if (position == UserRequest)
        userRequestRecall = setTimeout(getWeatherData, RELEVANT_TIME, userLastInput, position);
}

function setAndShowTermoTemp(ID, temp) {
    const termoMinTemp = -15;
    const termoMaxTemp = 40;
    const temperature = document.getElementById("temperature" + ID);
    if (temp >= termoMaxTemp) temperature.style.height = 100 + "%";
    else if (temp <= termoMinTemp) temperature.style.height = 0 + "%";
    else temperature.style.height = (temp - termoMinTemp) / (termoMaxTemp - termoMinTemp) * 100 + "%";
    temperature.dataset.value = temp + DEGREE_SYMBOL;
}

function getWeatherData(city, position) {
    showLoader(position);
    $.ajax({
        url: '/getWeatherData',
        method: 'GET',
        data: {
            cityName: city
        },
        success: function (data) {
            showWheatherData(data, position);
            hideLoader(position);
            setRecall(position);
        },
        error: function (err) {
            hideLoader(position);
            handleError(position, city);
        }
    });
}

function userCityInput() {
    clearTimeout(userRequestRecall);
    let cityName = document.getElementById('cityName').value;
    userLastInput = cityName;
    getWeatherData(cityName, UserRequest);
}

function getPresetData() {
    getWeatherData(PresetCities[0], Preset1);
    getWeatherData(PresetCities[1], Preset2);
}

function showLoader(position) {
    let loaderID = 'loader' + position;
    document.getElementById(loaderID).style.visibility = "visible";
}

function hideLoader(position) {
    let loaderID = 'loader' + position;
    document.getElementById(loaderID).style.visibility = "hidden";
}

function handleError(position, errorData) {
    if (position == Preset1 || position == Preset2) {
        getWeatherData(PresetCities[position - 1], position);
    }
    console.log('Error: ' + errorData);
    alert('Could not get ' + errorData);
}

window.onload = function () {
    getPresetData();
}