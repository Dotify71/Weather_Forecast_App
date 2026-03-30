// Retrieve DOM elements
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const locationBtn = document.getElementById('location-btn');

const loaderContainer = document.getElementById('loader-container');
const loaderText = document.getElementById('loader-text');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

const weatherDisplay = document.getElementById('weather-display');

const temperatureEl = document.getElementById('temperature');
const cityNameEl = document.getElementById('city-name');
const weatherConditionEl = document.getElementById('weather-condition');
const smartSuggestionEl = document.getElementById('smart-suggestion');
const humidityEl = document.getElementById('humidity-value');
const windEl = document.getElementById('wind-value');
const dateTimeDisplay = document.getElementById('date-time-display');

const dynamicIcon = document.getElementById('dynamic-icon');
const forecastContainer = document.getElementById('forecast-container');

// State tracking handling consecutive searches
let isFetching = false;

// Continuously update date & time UI
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    dateTimeDisplay.textContent = now.toLocaleDateString('en-US', options);
}

updateDateTime();
setInterval(updateDateTime, 60000);

// Seamless background layout switcher
function updateThemeClass(weatherMain) {
    document.body.className = '';
    const condition = weatherMain.toLowerCase();

    if (condition.includes('clear')) {
        document.body.classList.add('theme-sunny');
    } else if (condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm')) {
        document.body.classList.add('theme-rainy');
    } else if (condition.includes('cloud') || condition.includes('fog')) {
        document.body.classList.add('theme-cloudy');
    } else if (condition.includes('snow')) {
        document.body.classList.add('theme-snowy');
    } else {
        document.body.classList.add('theme-cloudy');
    }
}

// Logic engine for Hackathon "Unique Feature" Wear/Mood Suggestion
function generateSmartSuggestion(temp, conditionMain) {
    const condition = conditionMain.toLowerCase();
    const isRain = condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm');
    const isSnow = condition.includes('snow');
    const isClear = condition.includes('clear');

    if (isSnow) {
        return '⛄ Bundle up! A heavy coat and gloves are recommended.';
    } else if (isRain) {
        return '☔ Grab an umbrella and wear a waterproof jacket.';
    } else if (temp < 10) {
        return '❄️ Quite cold outside. Grab a warm winter coat!';
    } else if (temp >= 10 && temp < 18) {
        return '🧥 Chilly weather. A light jacket or cozy sweater is perfect.';
    } else if (temp >= 18 && temp < 25) {
        if (isClear) {
            return '☀️ Vivid and beautiful! Perfect day for a walk outside.';
        } else {
            return '⛅ Mild weather. Wear a comfy t-shirt and jeans.';
        }
    } else if (temp >= 25 && temp < 30) {
        return '😎 Warm outside! Shorts and sunglasses recommended.';
    } else {
        return '🔥 Very hot! Stay hydrated and wear light breathable clothing.';
    }
}

// Map WMO Weather Codes to OpenWeatherMap Icon Codes
function getIconCode(wmoCode, isDay = true) {
    const time = isDay ? 'd' : 'n';
    if (wmoCode === 0) return `01${time}`; // Clear sky
    if (wmoCode === 1) return `02${time}`; // Mainly clear
    if (wmoCode === 2) return `03${time}`; // Partly cloudy
    if (wmoCode === 3) return `04${time}`; // Overcast
    if ([45, 48].includes(wmoCode)) return `50${time}`; // Fog
    if ([51, 53, 55, 56, 57].includes(wmoCode)) return `09${time}`; // Drizzle
    if ([61, 63, 65, 66, 67].includes(wmoCode)) return `10${time}`; // Rain
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return `13${time}`; // Snow
    if ([80, 81, 82].includes(wmoCode)) return `09${time}`; // Rain showers
    if ([95, 96, 99].includes(wmoCode)) return `11${time}`; // Thunderstorm
    return `01${time}`;
}

// Map WMO Weather Codes to Text Descriptions
function getWeatherDesc(wmoCode) {
    if (wmoCode === 0) return 'Clear sky';
    if (wmoCode === 1) return 'Mainly clear';
    if (wmoCode === 2) return 'Partly cloudy';
    if (wmoCode === 3) return 'Overcast';
    if ([45, 48].includes(wmoCode)) return 'Fog';
    if ([51, 53, 55, 56, 57].includes(wmoCode)) return 'Drizzle';
    if ([61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return 'Snow';
    if ([95, 96, 99].includes(wmoCode)) return 'Thunderstorm';
    return 'Clear';
}

function getWeatherMain(wmoCode) {
    if (wmoCode === 0) return 'Clear';
    if ([1, 2, 3].includes(wmoCode)) return 'Clouds';
    if ([45, 48].includes(wmoCode)) return 'Fog';
    if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(wmoCode)) return 'Rain';
    if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return 'Snow';
    if ([95, 96, 99].includes(wmoCode)) return 'Thunderstorm';
    return 'Clear';
}

// Visual State Handlers for UI (Loader vs Error vs Display logic)
function showLoading(text) {
    loaderText.textContent = text;
    errorContainer.style.display = 'none';
    weatherDisplay.style.display = 'none';
    loaderContainer.style.display = 'flex';
}

function showError(text) {
    errorMessage.textContent = text;
    loaderContainer.style.display = 'none';
    weatherDisplay.style.display = 'none';
    errorContainer.style.display = 'flex';
}

function showWeather() {
    loaderContainer.style.display = 'none';
    errorContainer.style.display = 'none';
    weatherDisplay.style.display = 'block';

    weatherDisplay.classList.remove('slide-up');
    void weatherDisplay.offsetWidth;
    weatherDisplay.classList.add('slide-up');
}

// Fetch APIs via Text search strings
async function fetchWeather(city) {
    if (isFetching) return;
    isFetching = true;
    showLoading('Locating city...');

    try {
        // Geocode city text to lat/lon using Open-Meteo
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
        const geoRes = await fetch(geoUrl);
        if (!geoRes.ok) throw new Error('Failed to reach geocoding service.');

        const geoData = await geoRes.json();
        if (!geoData.results || geoData.results.length === 0) {
            throw new Error('City not found. Please check spelling.');
        }

        const geo = geoData.results[0];
        const lat = geo.latitude;
        const lon = geo.longitude;
        const cityName = geo.country_code ? `${geo.name}, ${geo.country_code}` : geo.name;

        await handleFetch(lat, lon, cityName);
    } catch (error) {
        showError(error.message);
        isFetching = false;
    }
}

// Fetch APIs via Lat/Lon Geocodes
async function fetchWeatherByLocation(lat, lon) {
    if (isFetching) return;
    isFetching = true;
    showLoading('Fetching location details...');

    try {
        // Reverse Geocode lat/lon to city name using BigDataCloud
        const reverseGeoUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`;
        const reverseGeoRes = await fetch(reverseGeoUrl);

        let cityName = 'Unknown Location';
        if (reverseGeoRes.ok) {
            const reverseGeoData = await reverseGeoRes.json();
            const city = reverseGeoData.city || reverseGeoData.locality || 'Unknown Area';
            const countryCode = reverseGeoData.countryCode || '';
            cityName = countryCode ? `${city}, ${countryCode}` : city;
        }

        await handleFetch(lat, lon, cityName);
    } catch (error) {
        showError('Failed to determine location name.');
        isFetching = false;
    }
}

// Core wrapper for resolving and parsing requests
async function handleFetch(lat, lon, cityName) {
    showLoading('Fetching your weather...');

    // Open-Meteo Current & Daily Forecast API
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;

    try {
        const weatherRes = await fetch(weatherUrl);
        if (!weatherRes.ok) {
            throw new Error('An error occurred loading weather data.');
        }

        const weatherData = await weatherRes.json();

        updateWeatherUI(weatherData, cityName);
        updateForecastUI(weatherData);

        showWeather();
    } catch (error) {
        showError(error.message);
    } finally {
        isFetching = false;
    }
}

// Map parsed weather details to DOM hooks
function updateWeatherUI(data, cityName) {
    const current = data.current;
    if (!current) throw new Error('Invalid weather data structure.');

    const currentTemp = current.temperature_2m;
    const wmoCode = current.weather_code;
    const isDay = current.is_day === 1;

    // Convert WMO to Main Condition for UI Theme/Logic
    const conditionMain = getWeatherMain(wmoCode);

    // Convert WMO to detailed description
    const weatherDesc = getWeatherDesc(wmoCode);

    // Get Icon Code
    const iconCode = getIconCode(wmoCode, isDay);

    temperatureEl.innerHTML = `${Math.round(currentTemp)}°<span>C</span>`;
    cityNameEl.textContent = cityName;
    weatherConditionEl.textContent = weatherDesc;
    humidityEl.textContent = `${current.relative_humidity_2m}%`;
    windEl.textContent = `${(current.wind_speed_10m / 3.6).toFixed(1)} m/s`;

    // Mount the Smart Suggestion Feature dynamically
    smartSuggestionEl.textContent = generateSmartSuggestion(currentTemp, conditionMain);
    smartSuggestionEl.style.display = 'inline-flex';

    dynamicIcon.src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    dynamicIcon.style.display = 'block';

    updateThemeClass(conditionMain);
}

// Parse continuous list items and map to horizontal cards
function updateForecastUI(data) {
    forecastContainer.innerHTML = '';

    // Open-Meteo provides pre-grouped daily data.
    const daily = data.daily;
    if (!daily || !daily.time) return;

    // Use the next 5 days
    const loopLimit = Math.min(5, daily.time.length);

    for (let i = 0; i < loopLimit; i++) {
        const dateStr = daily.time[i] + "T00:00:00";
        const date = new Date(dateStr);
        let dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

        if (i === 0) dayName = "Today";

        const tempMax = Math.round(daily.temperature_2m_max[i]);
        const wmoCode = daily.weather_code[i];

        // Use daytime icon for daily forecast
        const iconCode = getIconCode(wmoCode, true);

        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.style.animation = `fadeIn 0.5s ease forwards ${i * 0.12}s`;
        card.style.opacity = '0';

        card.innerHTML = `
            <div class="forecast-day">${dayName}</div>
            <img class="forecast-icon" src="https://openweathermap.org/img/wn/${iconCode}.png" alt="icon" />
            <div class="forecast-temp">${tempMax}°</div>
        `;
        forecastContainer.appendChild(card);
    }
}

// Input driven trigger logic
function handleSearch() {
    const city = searchInput.value.trim();
    if (city === '') {
        showError('Please enter a city name to search.');
        return;
    }
    fetchWeather(city);
    searchInput.value = '';
}

// System driven UI routing
function handleLocation() {
    if (!navigator.geolocation) {
        showError('Geolocation is not supported by your browser.');
        return;
    }

    showLoading('Locating via GPS...');

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            fetchWeatherByLocation(lat, lon);
        },
        (error) => {
            let errorMsg = 'Failed to retrieve location.';
            if (error.code === 1 /* PERMISSION_DENIED */) {
                errorMsg = 'Location permission denied by user.';
            } else if (error.code === 2 /* POSITION_UNAVAILABLE */) {
                errorMsg = 'Location unavailable via GPS.';
            } else if (error.code === 3 /* TIMEOUT */) {
                errorMsg = 'Location request timed out.';
            }
            showError(errorMsg);
        }
    );
}

// Bind hooks at execution
searchBtn.addEventListener('click', handleSearch);
locationBtn.addEventListener('click', handleLocation);
searchInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') handleSearch();
});


