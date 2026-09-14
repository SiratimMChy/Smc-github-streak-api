require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();

const TOKEN = process.env.GITHUB_TOKEN;
const USERNAME = process.env.USERNAME;

const headers = {
  Authorization: `token ${TOKEN}`,
  "User-Agent": "smc-streak-api"
};


//  Fetch contribution data
async function getContributionData() {
  try {
    const query = {
      query: `
      {
        user(login: "${USERNAME}") {
          contributionsCollection {
            contributionCalendar {
              weeks {
                contributionDays {
                  date
                  contributionCount
                }
              }
            }
          }
        }
      }`
    };

    const res = await axios.post(
      "https://api.github.com/graphql",
      query,
      { headers }
    );

    if (res.data.errors) {
      console.log(res.data.errors);
      return [];
    }

    return res.data.data.user.contributionsCollection.contributionCalendar.weeks;

  } catch (err) {
    console.log(err.response?.data || err.message);
    return [];
  }
}


//  Calculate streak with accurate date tracking
function calculateStreaks(weeks) {
  if (!weeks || weeks.length === 0) {
    return {
      total: 0,
      currentStreak: 0,
      longestStreak: 0,
      currentStreakStart: null,
      currentStreakEnd: null,
      longestStreakStart: null,
      longestStreakEnd: null,
      firstDay: null
    };
  }

  const days = [];

  weeks.forEach(week => {
    week.contributionDays.forEach(day => {
      days.push({
        date: day.date,
        count: day.contributionCount
      });
    });
  });

  days.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Longest streak with dates
  let longestStreak = 0;
  let longestStreakStart = null;
  let longestStreakEnd = null;
  let tempStreak = 0;
  let tempStart = null;

  for (let i = 0; i < days.length; i++) {
    if (days[i].count > 0) {
      if (tempStreak === 0) tempStart = days[i].date;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
        longestStreakStart = tempStart;
        longestStreakEnd = days[i].date;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Current streak with dates
  let currentStreak = 0;
  let currentStreakStart = null;
  let currentStreakEnd = null;

  for (let i = days.length - 1; i >= 0; i--) {
    if (days[i].count > 0) {
      currentStreak++;
      if (!currentStreakEnd) currentStreakEnd = days[i].date;
      currentStreakStart = days[i].date;
    } else {
      break;
    }
  }

  const total = days.reduce((sum, d) => sum + d.count, 0);
  const firstDay = days.length > 0 ? days[0].date : null;

  return {
    total,
    currentStreak,
    longestStreak,
    currentStreakStart,
    currentStreakEnd,
    longestStreakStart,
    longestStreakEnd,
    firstDay
  };
}


//  Streak Card — pixel-perfect match to streak-stats.demolab.com tokyonight theme
app.get("/streak", async (req, res) => {
  try {
    const weeks = await getContributionData();
    const data = calculateStreaks(weeks);

    const formatDate = (dateStr) => {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr + "T00:00:00");
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    };

    const formatDateShort = (dateStr) => {
      if (!dateStr) return "N/A";
      const date = new Date(dateStr + "T00:00:00");
      const options = { month: 'short', day: 'numeric' };
      return date.toLocaleDateString('en-US', options);
    };

    const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'
                style='isolation: isolate' viewBox='0 0 495 195' width='495px' height='195px' direction='ltr'>
        <style>
            @keyframes currstreak {
                0% { font-size: 3px; opacity: 0.2; }
                80% { font-size: 34px; opacity: 1; }
                100% { font-size: 28px; opacity: 1; }
            }
            @keyframes fadein {
                0% { opacity: 0; }
                100% { opacity: 1; }
            }
        </style>
        <defs>
            <linearGradient id='bgGradient' x1='0%' y1='0%' x2='100%' y2='100%'>
              <stop offset='0%' stop-color='#0A0F1C' />
              <stop offset='100%' stop-color='#12182B' />
            </linearGradient>
            <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="#00FFA3" />
              <stop offset="100%" stop-color="#00B8FF" />
            </linearGradient>
            <filter id="blobBlur">
              <feGaussianBlur stdDeviation="40" />
            </filter>
            <clipPath id='outer_rectangle'>
                <rect width='495' height='195' rx='16'/>
            </clipPath>
            <mask id='mask_out_ring_behind_fire'>
                <rect width='495' height='195' fill='white'/>
                <ellipse id='mask-ellipse' cx='247.5' cy='32' rx='13' ry='18' fill='black'/>
            </mask>
        </defs>
        <g clip-path='url(#outer_rectangle)'>
            <!-- Background -->
            <rect fill='url(#bgGradient)' rx='16' width='495' height='195'/>
            
            <!-- Glowing Blobs -->
            <circle cx="420" cy="40" r="80" fill="#00FFA3" opacity="0.1" filter="url(#blobBlur)" />
            <circle cx="70" cy="170" r="100" fill="#00B8FF" opacity="0.1" filter="url(#blobBlur)" />

            <!-- Border -->
            <rect fill='none' stroke='#2D3748' stroke-width='1.5' rx='16' width='495' height='195'/>
            <g style='isolation: isolate'>
                <line x1='165' y1='28' x2='165' y2='170' vector-effect='non-scaling-stroke' stroke-width='1' stroke='#E4E2E2' stroke-linejoin='miter' stroke-linecap='square' stroke-miterlimit='3'/>
                <line x1='330' y1='28' x2='330' y2='170' vector-effect='non-scaling-stroke' stroke-width='1' stroke='#E4E2E2' stroke-linejoin='miter' stroke-linecap='square' stroke-miterlimit='3'/>
            </g>
            <g style='isolation: isolate'>
                <!-- Total Contributions big number -->
                <g transform='translate(82.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#70A5FD' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.6s'>
                        ${data.total}
                    </text>
                </g>

                <!-- Total Contributions label -->
                <g transform='translate(82.5, 84)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#70A5FD' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.7s'>
                        Total Contributions
                    </text>
                </g>

                <!-- Total Contributions range -->
                <g transform='translate(82.5, 114)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#38BDAE' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.8s'>
                        ${data.firstDay ? formatDate(data.firstDay) : "N/A"} - Present
                    </text>
                </g>
            </g>
            <g style='isolation: isolate'>
                <!-- Current Streak label -->
                <g transform='translate(247.5, 108)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#BF91F3' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.9s'>
                        Current Streak
                    </text>
                </g>

                <!-- Current Streak range -->
                <g transform='translate(247.5, 145)'>
                    <text x='0' y='21' stroke-width='0' text-anchor='middle' fill='#38BDAE' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 0.9s'>
                        ${data.currentStreakStart ? formatDateShort(data.currentStreakStart) : "N/A"} - ${data.currentStreakEnd ? formatDateShort(data.currentStreakEnd) : "N/A"}
                    </text>
                </g>

                <!-- Ring around number -->
                <g mask='url(#mask_out_ring_behind_fire)'>
                    <circle cx='247.5' cy='71' r='40' fill='none' stroke='#70A5FD' stroke-width='5' style='opacity: 0; animation: fadein 0.5s linear forwards 0.4s'></circle>
                </g>
                <!-- Fire icon -->

<g transform='translate(247.5, 19.5)' stroke-opacity='0' style='opacity: 0; animation: fadein 0.5s linear forwards 0.6s'>
                    <path d='M -12 -0.5 L 15 -0.5 L 15 23.5 L -12 23.5 L -12 -0.5 Z' fill='none'/>
                    <path d='M 1.5 0.67 C 1.5 0.67 2.24 3.32 2.24 5.47 C 2.24 7.53 0.89 9.2 -1.17 9.2 C -3.23 9.2 -4.79 7.53 -4.79 5.47 L -4.76 5.11 C -6.78 7.51 -8 10.62 -8 13.99 C -8 18.41 -4.42 22 0 22 C 4.42 22 8 18.41 8 13.99 C 8 8.6 5.41 3.79 1.5 0.67 Z M -0.29 19 C -2.07 19 -3.51 17.6 -3.51 15.86 C -3.51 14.24 -2.46 13.1 -0.7 12.74 C 1.07 12.38 2.9 11.53 3.92 10.16 C 4.31 11.45 4.51 12.81 4.51 14.2 C 4.51 16.85 2.36 19 -0.29 19 Z' fill='#70A5FD' stroke-opacity='0'/>
                </g>

                <!-- Current Streak big number -->
                <g transform='translate(247.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#BF91F3' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='animation: currstreak 0.6s linear forwards'>
                        ${data.currentStreak}
                    </text>
                </g>

            </g>
            <g style='isolation: isolate'>
                <!-- Longest Streak big number -->
                <g transform='translate(412.5, 48)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#70A5FD' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='700' font-size='28px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.2s'>
                        ${data.longestStreak}
                    </text>
                </g>

                <!-- Longest Streak label -->
                <g transform='translate(412.5, 84)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#70A5FD' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='14px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.3s'>
                        Longest Streak
                    </text>
                </g>

                <!-- Longest Streak range -->
                <g transform='translate(412.5, 114)'>
                    <text x='0' y='32' stroke-width='0' text-anchor='middle' fill='#38BDAE' stroke='none' font-family='"Segoe UI", Ubuntu, sans-serif' font-weight='400' font-size='12px' font-style='normal' style='opacity: 0; animation: fadein 0.5s linear forwards 1.4s'>
                        ${data.longestStreakStart ? formatDate(data.longestStreakStart) : "N/A"} - ${data.longestStreakEnd ? formatDate(data.longestStreakEnd) : "N/A"}
                    </text>
                </g>
            </g>

        </g>
    </svg>
    `;

    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=0");
    res.send(svg);

  } catch (err) {
    console.error(err.message);
    res.status(500).send("Error");
  }
});


app.get("/", (req, res) => {
  res.send("SMC Streak API Running 🚀");
});


app.get("/debug", (req, res) => {
  res.json({
    token: TOKEN ? "Set" : "Missing",
    username: USERNAME ? `${USERNAME}` : "Missing"
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Running on ${PORT}`);
});
