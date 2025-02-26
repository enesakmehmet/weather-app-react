import { useState, useEffect } from 'react'
import './App.css'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { 
  faMap, 
  faSun, 
  faMoon, 
  faSearch, 
  faHeart as faHeartSolid,
  faTemperatureHigh,
  faWind,
  faCloud,
  faCloudRain,
  faSnowflake,
  faSmog,
  faThermometerHalf,
  faTint,
  faCompass,
  faArrowUp,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular } from '@fortawesome/free-regular-svg-icons'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'

interface WeatherData {
  name: string
  main: {
    temp: number
    humidity: number
    feels_like: number
    pressure: number
  }
  weather: [{
    description: string
    icon: string
    main: string
  }]
  wind: {
    speed: number
    deg: number
  }
  sys: {
    sunrise: number
    sunset: number
    country: string
  }
  coord: {
    lat: number
    lon: number
  }
  rain?: {
    "1h"?: number
    "3h"?: number
  }
  clouds: {
    all: number
  }
}

interface ForecastData {
  list: Array<{
    dt: number
    main: {
      temp: number
      humidity: number
      feels_like: number
    }
    weather: [{
      description: string
      icon: string
      main: string
    }]
    wind: {
      speed: number
    }
    dt_txt: string
  }>
}

interface AirQualityData {
  list: [{
    main: {
      aqi: number
    }
    components: {
      co: number
      no2: number
      o3: number
      pm2_5: number
      pm10: number
    }
  }]
}

interface UVData {
  value: number
  risk_level: string
}

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [city, setCity] = useState('')
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null)
  const [forecastData, setForecastData] = useState<ForecastData | null>(null)
  const [airQualityData, setAirQualityData] = useState<AirQualityData | null>(null)
  const [uvData, setUVData] = useState<UVData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [unit, setUnit] = useState<'metric' | 'imperial'>('metric')
  const [showMap, setShowMap] = useState(false)
  const [mapType, setMapType] = useState<'temperature' | 'satellite' | 'precipitation'>('temperature')
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteLocations')
    return saved ? JSON.parse(saved) : []
  })

  const API_KEY = '94c1a74b50a14268c993e8fe2a4c059c'

  useEffect(() => {
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    setTheme(isDarkMode ? 'dark' : 'light')

    // Konum izni isteği
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        try {
          const response = await fetch(
            `https://api.openweathermap.org/geo/1.0/reverse?lat=${position.coords.latitude}&lon=${position.coords.longitude}&limit=1&appid=${API_KEY}`
          )
          const [locationData] = await response.json()
          if (locationData) {
            setCity(locationData.name)
            fetchWeather(locationData.name)
          }
        } catch (error) {
          console.error('Konum bilgisi alınamadı:', error)
        }
      })
    }
  }, [])

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light')
  }

  const fetchWeather = async (searchCity: string = city) => {
    if (!searchCity) return
    
    try {
      setLoading(true)
      setError('')
      setSelectedDay(null)
      setShowDetails(false)
      
      const currentResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${searchCity}&appid=${API_KEY}&units=${unit}&lang=tr`
      )
      
      if (!currentResponse.ok) {
        throw new Error('Şehir bulunamadı')
      }
      
      const currentData = await currentResponse.json()
      setWeatherData(currentData)

      const { lat, lon } = currentData.coord

      const airQualityResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      )
      
      if (airQualityResponse.ok) {
        const airQualityData = await airQualityResponse.json()
        setAirQualityData(airQualityData)
      }

      const forecastResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${searchCity}&appid=${API_KEY}&units=${unit}&lang=tr`
      )
      
      if (!forecastResponse.ok) {
        throw new Error('Tahmin verileri alınamadı')
      }
      
      const forecastData = await forecastResponse.json()
      setForecastData(forecastData)

      const uvResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/uvi?lat=${lat}&lon=${lon}&appid=${API_KEY}`
      )
      
      if (uvResponse.ok) {
        const uvData = await uvResponse.json()
        setUVData({
          value: uvData.value,
          risk_level: getUVRiskLevel(uvData.value)
        })
      }

      setRecentSearches(prev => {
        const searches = new Set([searchCity, ...prev])
        return Array.from(searches).slice(0, 5)
      })

    } catch (error) {
      setError('Hava durumu bilgisi alınamadı')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getWeatherEmoji = (description: string) => {
    const weatherMap: { [key: string]: string } = {
      'açık': '☀️',
      'parçalı bulutlu': '⛅',
      'bulutlu': '☁️',
      'yağmurlu': '🌧️',
      'sağanak yağışlı': '⛈️',
      'karlı': '🌨️',
      'sisli': '🌫️'
    }
    return weatherMap[description.toLowerCase()] || '🌡️'
  }

  const toggleDetails = () => {
    setShowDetails(!showDetails)
  }

  const getAirQualityText = (aqi: number) => {
    const aqiMap = {
      1: { text: 'İyi', color: '#00e400' },
      2: { text: 'Orta', color: '#ffff00' },
      3: { text: 'Hassas Gruplar İçin Sağlıksız', color: '#ff7e00' },
      4: { text: 'Sağlıksız', color: '#ff0000' },
      5: { text: 'Çok Sağlıksız', color: '#99004c' }
    }
    return aqiMap[aqi as keyof typeof aqiMap] || { text: 'Bilinmiyor', color: '#808080' }
  }

  const toggleUnit = () => {
    setUnit(prev => prev === 'metric' ? 'imperial' : 'metric')
    if (weatherData) {
      fetchWeather(weatherData.name)
    }
  }

  const formatTemperature = (temp: number) => {
    return unit === 'metric' ? `${Math.round(temp)}°C` : `${Math.round(temp)}°F`
  }

  const formatWindSpeed = (speed: number) => {
    return unit === 'metric' ? `${speed} m/s` : `${Math.round(speed * 2.237)} mph`
  }

  const getUVRiskLevel = (uvIndex: number): string => {
    if (uvIndex <= 2) return 'Düşük'
    if (uvIndex <= 5) return 'Orta'
    if (uvIndex <= 7) return 'Yüksek'
    if (uvIndex <= 10) return 'Çok Yüksek'
    return 'Aşırı'
  }

  const getUVColor = (uvIndex: number): string => {
    if (uvIndex <= 2) return '#558B2F'
    if (uvIndex <= 5) return '#F9A825'
    if (uvIndex <= 7) return '#EF6C00'
    if (uvIndex <= 10) return '#B71C1C'
    return '#6A1B9A'
  }

  const toggleFavorite = (city: string) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(city)
        ? prev.filter(c => c !== city)
        : [...prev, city]
      localStorage.setItem('favoriteLocations', JSON.stringify(newFavorites))
      return newFavorites
    })
  }

  useEffect(() => {
    const interval = setInterval(() => {
      favorites.forEach(city => {
        fetchWeather(city)
      })
    }, 1800000)

    return () => clearInterval(interval)
  }, [favorites])

  const renderUVIndex = () => {
    if (!uvData) return null

    return (
      <div className="uv-panel">
        <h3>UV İndeksi</h3>
        <div 
          className="uv-indicator"
          style={{ backgroundColor: getUVColor(uvData.value) }}
        >
          <span className="uv-value">{uvData.value}</span>
          <span className="uv-text">{uvData.risk_level}</span>
        </div>
      </div>
    )
  }

  const renderWeatherMap = () => {
    if (!weatherData) return null;

    const getMapUrl = () => {
      const baseUrl = 'https://openweathermap.org/weathermap';
      switch (mapType) {
        case 'satellite':
          return `${baseUrl}?basemap=satellite&cities=true&layer=clouds&lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&zoom=8`;
        case 'precipitation':
          return `${baseUrl}?basemap=map&cities=true&layer=precipitation&lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&zoom=8`;
        default:
          return `${baseUrl}?basemap=map&cities=true&layer=temperature&lat=${weatherData.coord.lat}&lon=${weatherData.coord.lon}&zoom=8`;
      }
    };

    return (
      <div className={`weather-map ${showMap ? 'show' : ''}`}>
        <div className="map-controls">
          <div className="map-type-selector">
            <button 
              className={`map-type-button ${mapType === 'temperature' ? 'active' : ''}`}
              onClick={() => setMapType('temperature')}
            >
              Sıcaklık Haritası
            </button>
            <button 
              className={`map-type-button ${mapType === 'satellite' ? 'active' : ''}`}
              onClick={() => setMapType('satellite')}
            >
              Uydu Görüntüsü
            </button>
            <button 
              className={`map-type-button ${mapType === 'precipitation' ? 'active' : ''}`}
              onClick={() => setMapType('precipitation')}
            >
              Yağış Haritası
            </button>
          </div>
          
          <div className="map-buttons">
            <button 
              className={`map-toggle ${showMap ? 'active' : ''}`} 
              onClick={() => setShowMap(!showMap)}
            >
              <FontAwesomeIcon icon={faMap} className="map-icon" />
              <span>{showMap ? 'Haritayı Gizle' : 'Haritayı Göster'}</span>
            </button>
          </div>
        </div>
        
        {showMap && (
          <div className={`map-container ${showMap ? 'show' : ''}`}>
            <iframe
              title="weather-map"
              width="100%"
              height="100%"
              frameBorder="0"
              allowFullScreen
              src={getMapUrl()}
            />
          </div>
        )}
      </div>
    );
  }

  const getWeatherIcon = (description: string) => {
    const weatherMap: { [key: string]: { icon: IconDefinition, className: string } } = {
      'açık': { icon: faSun, className: 'sun' },
      'parçalı bulutlu': { icon: faCloud, className: 'cloud' },
      'parçalı az bulutlu': { icon: faCloud, className: 'cloud' },
      'az bulutlu': { icon: faCloud, className: 'cloud' },
      'bulutlu': { icon: faCloud, className: 'cloud' },
      'yağmurlu': { icon: faCloudRain, className: 'rain' },
      'sağanak yağışlı': { icon: faCloudRain, className: 'rain' },
      'kar yağışlı': { icon: faSnowflake, className: 'snow' },
      'karlı': { icon: faSnowflake, className: 'snow' },
      'sisli': { icon: faSmog, className: 'cloud' }
    }
    const lowerDesc = description.toLowerCase()
    return weatherMap[lowerDesc] || { icon: faCloud, className: 'cloud' }
  }

  return (
    <div className={`app ${theme}`}>
      <div className="weather-container">
        <div className="header">
          <h1>Hava Durumu</h1>
          <div className="header-controls">
            <button 
              className={`map-toggle ${showMap ? 'active' : ''}`} 
              onClick={() => setShowMap(!showMap)}
            >
              <FontAwesomeIcon icon={faMap} className="map-icon" />
              <span>{showMap ? 'Haritayı Gizle' : 'Haritayı Göster'}</span>
            </button>
            <button onClick={toggleUnit} className="unit-toggle">
              <FontAwesomeIcon icon={faTemperatureHigh} />
              {unit === 'metric' ? '°C' : '°F'}
            </button>
            <button onClick={toggleTheme} className="theme-toggle">
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} />
            </button>
          </div>
        </div>

        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <h4>Son Aramalar:</h4>
            <div className="search-tags">
              {recentSearches.map((search, index) => (
                <button
                  key={index}
                  className="search-tag"
                  onClick={() => fetchWeather(search)}
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="search-box">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Şehir giriniz..."
            onKeyPress={(e) => e.key === 'Enter' && fetchWeather()}
          />
          <button onClick={() => fetchWeather()} className="search-button">
            <FontAwesomeIcon icon={faSearch} className="button-icon" />
            <span className="button-text">Ara</span>
          </button>
        </div>

        {loading && <div className="loading">Yükleniyor...</div>}
        {error && <div className="error">{error}</div>}
        
        {weatherData && !loading && !error && (
          <div className="weather-info">
            <div className={`current-weather ${showDetails ? 'expanded' : ''}`} onClick={toggleDetails}>
              <div className="location-info">
                <h2>{weatherData.name}</h2>
                <span className="country-code">{weatherData.sys.country}</span>
                <button 
                  className="favorite-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(weatherData.name)
                  }}
                >
                  <FontAwesomeIcon icon={favorites.includes(weatherData.name) ? faHeartSolid : faHeartRegular} />
                </button>
              </div>
              
              <div className="weather-icon-wrapper">
                <FontAwesomeIcon 
                  icon={getWeatherIcon(weatherData.weather[0].description).icon} 
                  className={`weather-icon ${getWeatherIcon(weatherData.weather[0].description).className}`}
                  size="3x"
                />
              </div>

              <div className="temperature-group">
                <div className="temperature">
                  {formatTemperature(weatherData.main.temp)}
                </div>
                <div className="feels-like">
                  Hissedilen: {formatTemperature(weatherData.main.feels_like)}
                </div>
              </div>

              <div className="weather-description">
                {weatherData.weather[0].description}
              </div>

              {airQualityData && (
                <div className="air-quality-panel">
                  <h3>Hava Kalitesi</h3>
                  <div 
                    className="aqi-indicator"
                    style={{ backgroundColor: getAirQualityText(airQualityData.list[0].main.aqi).color }}
                  >
                    {getAirQualityText(airQualityData.list[0].main.aqi).text}
                  </div>
                  <div className="pollutants">
                    <div className="pollutant-item">
                      <span>PM2.5</span>
                      <span>{airQualityData.list[0].components.pm2_5} µg/m³</span>
                    </div>
                    <div className="pollutant-item">
                      <span>PM10</span>
                      <span>{airQualityData.list[0].components.pm10} µg/m³</span>
                    </div>
                    <div className="pollutant-item">
                      <span>O₃</span>
                      <span>{airQualityData.list[0].components.o3} µg/m³</span>
                    </div>
                    <div className="pollutant-item">
                      <span>NO₂</span>
                      <span>{airQualityData.list[0].components.no2} µg/m³</span>
                    </div>
                  </div>
                </div>
              )}

              {renderUVIndex()}
              {renderWeatherMap()}

              <div className={`details-panel ${showDetails ? 'show' : ''}`}>
                <div className="sun-times">
                  <div className="sun-time">
                    <FontAwesomeIcon icon={faArrowUp} className="sun-icon" />
                    <span>Gün Doğumu: {formatTime(weatherData.sys.sunrise)}</span>
                  </div>
                  <div className="sun-time">
                    <FontAwesomeIcon icon={faArrowDown} className="sun-icon" />
                    <span>Gün Batımı: {formatTime(weatherData.sys.sunset)}</span>
                  </div>
                </div>

                <div className="weather-details">
                  <div className="detail-item" title="Nem Oranı">
                    <FontAwesomeIcon icon={faTint} className="icon" />
                    <span>Nem: {weatherData.main.humidity}%</span>
                    <div className="detail-bar">
                      <div className="detail-progress" style={{width: `${weatherData.main.humidity}%`}}></div>
                    </div>
                  </div>
                  <div className="detail-item" title="Rüzgar Hızı">
                    <FontAwesomeIcon icon={faWind} className="icon" />
                    <span>Rüzgar: {formatWindSpeed(weatherData.wind.speed)}</span>
                    <FontAwesomeIcon 
                      icon={faCompass} 
                      className="wind-direction" 
                      style={{transform: `rotate(${weatherData.wind.deg}deg)`}}
                    />
                  </div>
                  <div className="detail-item" title="Basınç">
                    <FontAwesomeIcon icon={faThermometerHalf} className="icon" />
                    <span>Basınç: {weatherData.main.pressure} hPa</span>
                  </div>
                </div>
              </div>
            </div>

            {forecastData && (
              <div className="forecast">
                <h3>7 Günlük Tahmin</h3>
                <div className="forecast-list">
                  {forecastData.list.filter((item, index) => index % 8 === 0).map((item, index) => (
                    <div 
                      key={index} 
                      className={`forecast-item ${selectedDay === index ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(selectedDay === index ? null : index)}
                    >
                      <div className="forecast-date">{formatDate(item.dt_txt)}</div>
                      <div className="forecast-icon-wrapper">
                        <FontAwesomeIcon 
                          icon={getWeatherIcon(item.weather[0].description).icon} 
                          className={`weather-icon ${getWeatherIcon(item.weather[0].description).className}`}
                          size="2x"
                        />
                      </div>
                      <div className="forecast-temp">{formatTemperature(item.main.temp)}</div>
                      <div className="forecast-desc">{item.weather[0].description}</div>
                      
                      {selectedDay === index && (
                        <div className="forecast-details">
                          <div className="detail-item">
                            <FontAwesomeIcon icon={faThermometerHalf} className="icon" />
                            <span>Hissedilen: {formatTemperature(item.main.feels_like)}</span>
                          </div>
                          <div className="detail-item">
                            <FontAwesomeIcon icon={faTint} className="icon" />
                            <span>Nem: {item.main.humidity}%</span>
                          </div>
                          <div className="detail-item">
                            <FontAwesomeIcon icon={faWind} className="icon" />
                            <span>Rüzgar: {formatWindSpeed(item.wind.speed)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
