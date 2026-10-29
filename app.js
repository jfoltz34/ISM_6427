// Simple weather app using the free Open-Meteo API (no API key needed).
const DEFAULT_PLACE = { name: 'Boca Raton', region: 'Florida', lat: 26.3683, lon: -80.1289 };

// Open-Meteo weather codes → label, icon, background theme
const CODES = {
  0: ['Clear', '☀️', 'clear'],
  1: ['Mostly Clear', '🌤️', 'clear'],
  2: ['Partly Cloudy', '⛅', 'cloudy'],
  3: ['Cloudy', '☁️', 'cloudy'],
  45: ['Fog', '🌫️', 'cloudy'],
  48: ['Fog', '🌫️', 'cloudy'],
  51: ['Light Drizzle', '🌦️', 'rain'],
  53: ['Drizzle', '🌦️', 'rain'],
  55: ['Heavy Drizzle', '🌧️', 'rain'],
  61: ['Light Rain', '🌦️', 'rain'],
  63: ['Rain', '🌧️', 'rain'],
  65: ['Heavy Rain', '🌧️', 'rain'],
  71: ['Light Snow', '🌨️', 'snow'],
  73: ['Snow', '🌨️', 'snow'],
  75: ['Heavy Snow', '❄️', 'snow'],
  80: ['Showers', '🌦️', 'rain'],
  81: ['Showers', '🌧️', 'rain'],
  82: ['Heavy Showers', '🌧️', 'rain'],
  95: ['Thunderstorm', '⛈️', 'storm'],
  96: ['Thunderstorm', '⛈️', 'storm'],
  99: ['Thunderstorm', '⛈️', 'storm'],
};
const describe = (code) => CODES[code] || ['Unknown', '🌡️', 'cloudy'];
// Show a moon instead of a sun for clear skies at night
const icon = (code, isDay) => (!isDay && code <= 1 ? '🌙' : !isDay && code === 2 ? '☁️' : describe(code)[1]);

const $ = (id) => document.getElementById(id);

async function loadWeather(place) {
  $('place').textContent = place.name;
  $('condition').textContent = 'Loading…';

  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${place.lat}&longitude=${place.lon}`
    + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
    + '&hourly=temperature_2m,weather_code,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max'
    + '&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto&forecast_days=7';

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    render(await res.json());
  } catch (err) {
    $('condition').textContent = 'Couldn’t load weather. Try again.';
    console.error(err);
  }
}

function render(data) {
  const c = data.current;
  const d = data.daily;
  const [label, , theme] = describe(c.weather_code);

  $('temp').textContent = `${Math.round(c.temperature_2m)}°`;
  $('condition').textContent = label;
  $('range').textContent = `H:${Math.round(d.temperature_2m_max[0])}°  L:${Math.round(d.temperature_2m_min[0])}°`;
  $('feels').textContent = `${Math.round(c.apparent_temperature)}°`;
  $('humidity').textContent = `${c.relative_humidity_2m}%`;
  $('wind').textContent = `${Math.round(c.wind_speed_10m)} mph`;
  $('uv').textContent = Math.round(d.uv_index_max[0]);

  document.body.className = theme === 'clear' ? (c.is_day ? 'clear-day' : 'clear-night') : theme;

  // Next 12 hours, starting from the current hour
  const start = data.hourly.time.findIndex((t) => t >= c.time.slice(0, 13));
  $('hourly').innerHTML = data.hourly.time.slice(start, start + 12).map((t, i) => {
    const idx = start + i;
    const hour = i === 0 ? 'Now' : new Date(t).toLocaleTimeString([], { hour: 'numeric' });
    return `<div class="hour"><span>${hour}</span><span class="icon">${icon(data.hourly.weather_code[idx], data.hourly.is_day[idx])}</span><span>${Math.round(data.hourly.temperature_2m[idx])}°</span></div>`;
  }).join('');

  $('daily').innerHTML = d.time.map((t, i) => {
    const day = i === 0 ? 'Today' : new Date(`${t}T12:00`).toLocaleDateString([], { weekday: 'short' });
    return `<li><span>${day}</span><span class="icon">${describe(d.weather_code[i])[1]}</span><span class="temps"><span class="lo">${Math.round(d.temperature_2m_min[i])}°</span><span>${Math.round(d.temperature_2m_max[i])}°</span></span></li>`;
  }).join('');
}

// City search using Open-Meteo's free geocoding API
$('search').addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = $('city').value.trim();
  if (!query) return;

  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
    const { results } = await res.json();
    if (!results || !results.length) {
      $('condition').textContent = `No match for “${query}”`;
      return;
    }
    const r = results[0];
    loadWeather({ name: r.name, lat: r.latitude, lon: r.longitude });
    $('city').value = '';
  } catch (err) {
    $('condition').textContent = 'Search failed. Try again.';
    console.error(err);
  }
});

loadWeather(DEFAULT_PLACE);
