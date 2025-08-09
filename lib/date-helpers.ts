export function getSeasonalGreeting() {
  const month = new Date().getMonth()
  const greetings = [
    "Happy Winter Solstice!", // Dec, Jan, Feb
    "Happy Spring Equinox!", // Mar, Apr, May
    "Happy Summer Solstice!", // Jun, Jul, Aug
    "Happy Autumn Equinox!", // Sep, Oct, Nov
  ]
  const seasonIndex = Math.floor((month + 1) % 12 / 3)
  return greetings[seasonIndex]
}
