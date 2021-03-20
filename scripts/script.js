let userInput;        // Requested city name
let fullAddress;      // Destination address including country name
let shortAddress;     // Destination address without country name
let cityGeocode;      // Geodata of all possible cities
let cityOptions;      // DOM elements of all possible cities
let cityName;         // A city name to search
let countryCode;      // A country code ex)CA
let countryName;      // A country name
let locationId;       // Location id for Hotels API (required to get hotel lists)
let checkIn;          // Today (yyyy-mm-dd)
let checkOut;         // Tomorrow (yyyy-mm-dd)
let scrollPosition;

/* ---------- Ajax method start ---------- */
/* Get city name, latitude and longitude of all possible cities with Geocoding API */
function getAllGeocode () {
  $.ajax({
    url: 'https://www.mapquestapi.com/geocoding/v1/address',
    dataType: 'json',
    method: 'GET',
    data: {
      key: config.GEOCODING_KEY,
      location: userInput,
      thumbMaps: true
    }
  })
  .done(function(data) {
    // Select a target city
    selectTargetGeocode(data);
  })
  .fail(function() {
    alert("Sorry, we couldn't find the city you requested. Please try again.");
  });
}

/* Get weather information with OpenWeatherMap API */
function getWeatherInfo(data) { 
  $.ajax({
    url: 'https://api.openweathermap.org/data/2.5/onecall',
    dataType: 'json',
    method: 'GET',
    data: {
      lat: data.displayLatLng.lat,
      lon: data.displayLatLng.lng,
      exclude: 'minutely, hourly',
      appid: config.OPENWEATHERMAP_KEY
    }
  })
  .done(function(data) {
    // Output weather information
    drawWeather(data)
  })
  .fail(function() {
    $('#weather').html("The weather information is temporarily unavailable. Please try again later.");
  });
}

/* Get country details with REST Countries API */
function getCountryDetails () {
  $.ajax({
    url: 'https://restcountries.eu/rest/v2/alpha/' + countryCode,
    dataType: 'json',
    method: 'GET'
  })
  .done(function(data) {
    countryName = data.alpha3Code;

    // Get local news
    getNews();

    // Get a location id of the searched city (required to get a hotel list with Hotels API)
    getDestinationId();

    // Outout a flag, currency and language
    outputCountryDetails(data)
  })
}

/* Get a destination id which is used to get hotel data with Hotels API */
function getDestinationId () {
  $.ajax ({
    url: 'https://hotels4.p.rapidapi.com/locations/search?locale=en_US',
    method: 'GET',
    headers: {
		'x-rapidapi-host': 'hotels4.p.rapidapi.com',
		'x-rapidapi-key': config.HOTELS_KEY
    },   
    data: {
      query: shortAddress
    }
  })
  .done(function(data){
    // If API returns data
    if (data) {
      // If the data contains destination ids
      if (data.suggestions[0].entities.length > 0) {
        locationId = data.suggestions[0].entities[0].destinationId;

        // Get hotel detailed information
        getHotelData();
      } else {
        // Insert an error message
        $('#hotel').html("Sorry, we couldn't find hotels around you destination.");

        // Scroll and display search results
        showResult();      
      } 
    } else {
      // Insert an error message
      $('#hotel').html("Sorry, we couldn't find hotels around you destination. The service may be temporarily unavailable. Please try again later.");

      // Scroll and display search results
      showResult();       
    }
  })
  .fail(function() {
    // Insert an error message
    $('#hotel').html("Sorry, we couldn't find hotels around you destination. The service may be temporarily unavailable. Please try again later.");

    // Scroll and display search results
    showResult();
  })
}

/* Get hotel data with Hotels API */
function getHotelData () {
  $.ajax ({
    url: 'https://hotels4.p.rapidapi.com/properties/list?currency=USD&locale=en_US',
    method: 'GET',
    headers: {
      'x-rapidapi-host': 'hotels4.p.rapidapi.com',
      'x-rapidapi-key': config.HOTELS_KEY
    },
    data: {
      sortOrder: 'PRICE',
      destinationId : locationId,
      // checkIn: checkIn,
      // checkOut: checkOut,
      /* Note: This API frequently fails to return data if recent dates are set as checkIn/checkOut dates. */
      checkIn: '2021-12-01',  
      checkOut: '2021-12-03',
      pageNumber: 1,
      pageSize: 5,
      adults1: 1
    }
  })
  .done(function(data) {
    // Output a hotel list
    outputHotelData(data);
  })
  .fail(function() {
    // Insert an error message
    $('#hotel').html("Sorry, we couldn't find hotels around you destination. The service may be temporarily unavailable. Please try again later.");

    // Scroll and display search results
    showResult();
  })
}

/* News API */
function getNews () {
  $.ajax({
    url: 'https://gnews.io/api/v3/search?',
    method: 'GET',
    dataType: 'json',
    data: {
      token: config.NEWS_TOKEN,
      lang: 'en',
      max: 5,
      q: cityName,
      image: 'required'
    }
  })
  .done(function(data) {
    // Output local news
    outputNews(data);
  })
  .fail(function() {
    // Insert an error message
    $('#news').html("Failed to get data from the server. Please try another city.");
  })
}
/* ---------- Ajax method end ---------- */

/* Get user input */
function getUserInput () {
  // Clear search data
  userInput = '';
  fullAddress ='';
  shortAddress = '';
  cityGeocode = [];
  cityOptions = [];
  cityName = '';
  countryCode = '';
  countryName = '';
  locationId = '';
  checkIn = '';
  checkOut = '';
  $('.reset').empty();

  // Get search date
  let today = new Date();
  let tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  checkIn = formatDate(today);
  checkOut = formatDate(tomorrow);

  // pass the user input to getAllGeocode()
  if (!$('#input-location').val()) {
    alert('Please type a city name');
  } else {
    userInput = $('#input-location').val();
    getAllGeocode();
  }
}

/* Select a target city */
function selectTargetGeocode (data) {
  let index = 0;

  // Look through each location data
  for (let i = 0, max = data.results[0].locations.length; i < max; i++) {
    // Get only city data
    if (data.results[0].locations[i].geocodeQuality == 'CITY') {
      let cityData = data.results[0].locations[i];
      const fullAddressTmp = [];
      const shortAddressTmp = [];

      // Insert the city data to an array
      cityGeocode.push(cityData);

      // Combine city, county, state and country name
      fullAddressTmp.push(cityData.adminArea5, cityData.adminArea4, cityData.adminArea3, cityData.adminArea1);
      shortAddressTmp.push(cityData.adminArea5, cityData.adminArea4, cityData.adminArea3);

      // Format the combined address
      let fullAddressCombined = fullAddressTmp.filter(Boolean).join(', ');
      let shortAddressCombined = shortAddressTmp.filter(Boolean).join(', ');

      cityGeocode[index].fullAddress = fullAddressCombined;
      cityGeocode[index].shortAddress = shortAddressCombined

      // Convert the address into a DOM element
      cityOptions.push('<li class="location-item btn" id="location-' + index + '">' + fullAddressCombined + '</li>');

      index++;
    }
  }

  // If multiple cities come up
  if (cityOptions.length > 1) {
    // Display the city choices
    $('.location-choices ul').append(cityOptions);

    // Set click events to call weatherInfo()
    $(".location-item").click (function() {
      // Show a loading spinner animation
      $('.location-choices ul').css('opacity', '0.2');
      $('.lds-spinner').css('display', 'block');

      // Get the index number of the clicked element
      let num = $(this).attr('id').split('-');

      // Set the chosen address
      fullAddress = cityGeocode[num[1]].fullAddress;
      shortAddress = cityGeocode[num[1]].shortAddress;
      countryCode = cityGeocode[num[1]].adminArea1;
      cityName = cityGeocode[num[1]].adminArea5;

      // Get weather data
      getWeatherInfo(cityGeocode[num[1]]);

      // Get country detail data
      getCountryDetails();
    });

    // Show a city selection modal
    $('.location-container').css('display','block');

  // If one city comes up
  } else if (cityOptions.length === 1) {
    // Show a loading spinner animation
    $('.lds-spinner').css('display', 'block');

    fullAddress = cityGeocode[0].fullAddress;
    shortAddress = cityGeocode[0].shortAddress;
    countryCode = cityGeocode[0].adminArea1;
    cityName = cityGeocode[0].adminArea5;

    // Pass the city data to getWeatherInfo()
    getWeatherInfo(cityGeocode[0]);

    // Get country detail data
    getCountryDetails();

  // If no city comes up
  } else {
    alert('Oops! No city found. Please type another city name.')
  }
}

/* Draw weather data */
function drawWeather(weatherData) {
  // Get current weather
  const currentTemp = convertTemp(weatherData.current.temp);
  const currentWeatherIcon = 'https://openweathermap.org/img/wn/' + weatherData.current.weather[0].icon + '@2x.png';
  const currentWeatherArray = [];
  const feelsLike = convertTemp(weatherData.current.feels_like);

  currentWeatherArray.push('<p class="current-temp">' + currentTemp + '<span>&deg;</span></p>' +
  '<img class="current-weather-icon" src=' + currentWeatherIcon + '>' +
  '<div><p class="current-weather-description">' + weatherData.current.weather[0].description + '</p>' +
  '<p><span>Humidity: ' +  weatherData.current.humidity + '%</span><span> | Feels Like: ' + feelsLike + '&deg;</span></p></div>');

  // Output current weather
  $('#current-weather').append(currentWeatherArray);

  // Get 7 days weather forecast
  for (let i = 0; i < 5; i++) {
    let dailyDate = new Date(weatherData.daily[i].dt * 1000).toString().split(' ', 3).join(' ');
    let dailyWeatherIcon = 'https://openweathermap.org/img/wn/' + weatherData.daily[i].weather[0].icon + '@2x.png';
    let maxTemp = convertTemp(weatherData.daily[i].temp.max);
    let minTemp = convertTemp(weatherData.daily[i].temp.min);

    const dailyWeatherArray = [];
    let weatherDayClassName = 'weather-day-' + i;
    let weatherDayClass = '.weather-day-' + i;

    dailyWeatherArray.push('<p class="daily-date">' + dailyDate + '</p>');
    dailyWeatherArray.push('<img class="daily-weather-icon" src=' + dailyWeatherIcon + '>');
    dailyWeatherArray.push('<p><span class="max-temp">' + maxTemp + '&deg;</span><span> / </span><span class="min-temp">' + minTemp + '&deg;</span></p>');

    // Output weather forecast
    $('#destination').html(fullAddress);
    $('#daily-weather').append('<div class="' + weatherDayClassName + ' weather-day"></div>');
    $(weatherDayClass).append(dailyWeatherArray);
  }
}

// Output country details (flag, currency and language)
function outputCountryDetails (data) {
  $('#flag').append('<img src="' + data.flag + '" height="50">');
  $('#currency').html(data.currencies[0].name + ' (' + data.currencies[0].code + ')');
  $('#language').html(data.languages[0].name);
}

// Output news
function outputNews (newsData) {
  const newsArray = [];
  for (let i = 0; i < 5; i++) {
    newsArray.push('<div><img src="' + newsData.articles[i].image + '"><h4><a href="' + newsData.articles[i].url + '" rel="nofollow" target="_blank">' + newsData.articles[i].title + '</h4><p>' + newsData.articles[i].description + '</p></div>');
  }

  $('#news').append(newsArray);
}

// Output hotel data
function outputHotelData (hotelData) {
  const hotelArray = [];
  for (let i = 0, max = hotelData.data.body.searchResults.results.length; i < max; i++) {
    let review, address, price;
    let tmp = hotelData.data.body.searchResults.results[i];

    // If the data contains street address
    if (tmp.address.streetAddress) {
      address = tmp.address.streetAddress + ', ' + tmp.address.locality + ', ' + tmp.address.region;
    } else {
      // Delete country code from the address object
      delete tmp.address.countryCode;
      // Merge properties of the address object (countryName, locality and region)
      address = Object.values(tmp.address).join(', ');
    }

    // Set Google map links
    let mapQuery = tmp.name + ', ' + address;

    // If the data contains no guest reviews
    if (!tmp.guestReviews) {
      review = 'NA';
    } else {
      review = tmp.guestReviews.rating;
    }

    // If the data contains no price
    if (!tmp.ratePlan.price) {
      price = 'NA';
    } else {
      price = tmp.ratePlan.price.current;
    }

  // If the data contains no image
    if (!tmp.thumbnailUrl) {
      tmp.thumbnailUrl = 'images/default_img.jpg';
    }

    hotelArray.push('<div class="hotel-detail"><a href="https://maps.google.com/maps?q=' + mapQuery + '" target="_blank" rel="no-follow"><div class="hotel-detail-left">' +
    '<img src="' + tmp.thumbnailUrl + '"><div><b class="hotel-name">' + tmp.name + '</b><small>' + address + '</small></div></div></a>'+
    '<div><span class="hotel-rating">' + review + '</span><span class="hotel-price">' + price + '</span></div></div>');
  }

  // Output a hotel list
  $('#hotel').append(hotelArray);

  // Scroll and display search results
  showResult();
}

// Convert date format to yyyy-mm-dd
function formatDate(date) {
  let d = new Date(date);
  let month = '' + (d.getMonth() + 1);
  let day = '' + d.getDate();
  let year = d.getFullYear();

  if (month.length < 2) {
    month = '0' + month;
  } 
  if (day.length < 2) {
    day = '0' + day;
  }
  return [year, month, day].join('-');
}

// Convert fahrenheit to celcius 
function convertTemp (fahrenheit) {
  const celcius = Math.round(parseFloat(fahrenheit) - 273.15);
  return celcius;
}

// Back to top
function searchAgain () {
  $('html').animate({ scrollTop: 0 }, 'slow');
}

// Show results
function showResult () {
  setTimeout (function () {
    // Hide a search field
    $('.lds-spinner').css('display', 'none');
    $('.location-container').css('display','none');

    // Show search results
    $('#search-result').css('display', 'block');
    scrollPosition = $('#search-result').offset().top;
    $('html').animate({scrollTop: scrollPosition}, 'slow');

    // Reset the modal setting
    $('.location-choices ul').css('opacity', '1');
  }, 1000)
}

// Close a modal window
function closeModal () {
  $('.location-container').css('display', 'none');
}
