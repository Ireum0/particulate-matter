/*************************************************
 * 상수 정의
 *************************************************/
const WONPYEONG_DATE = "2025년 12월 28일";
const DEFAULT_CSV = `날짜,시간,농도
25.12.28,22.45,36`;

/*************************************************
 * 공통 유틸리티 함수
 *************************************************/
function nextFrame(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

// 시간 파싱: "22.45" -> { hour: 22, minute: 45 }
function parseTime(timeStr) {
  const [hour, minute] = timeStr.split(".");
  return {
    hour: parseInt(hour, 10),
    minute: parseInt(minute, 10)
  };
}

// 시간을 소수점으로 변환: "22.45" -> 22.75
function timeToDecimal(timeStr) {
  const { hour, minute } = parseTime(timeStr);
  return hour + minute / 60;
}

// 소수점 시간을 "HH:MM" 형식으로 변환: 22.75 -> "22:45"
function decimalToTime(decimal) {
  const hour = Math.floor(decimal);
  const minute = Math.round((decimal - hour) * 60);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// 날짜 형식 변환: "25.12.28" -> "2025년 12월 28일"
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split(".");
  const fullYear = year.length === 2 ? `20${year}` : year;
  return `${fullYear}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
}

// 시간 형식 변환: "22.45" -> "22시 45분"
function formatTime(timeStr) {
  const { hour, minute } = parseTime(timeStr);
  return `${hour}시 ${minute}분`;
}

// 시간을 "HH:MM" 형식으로 변환: "22.45" -> "22:45"
function formatTimeForChart(timeStr) {
  return timeStr.replace(".", ":");
}

// 미세먼지 등급 판정 (PM10 기준)
function getAirQualityGrade(value) {
  if (value <= 30) return { grade: "좋음", color: "#4caf50", bgColor: "#e8f5e9" };
  if (value <= 80) return { grade: "보통", color: "#2196f3", bgColor: "#e3f2fd" };
  if (value <= 150) return { grade: "나쁨", color: "#ff9800", bgColor: "#fff3e0" };
  return { grade: "매우나쁨", color: "#f44336", bgColor: "#ffebee" };
}

// 초미세먼지 등급 판정 (PM2.5 기준)
function getPM25Grade(value) {
  if (value <= 15) return { grade: "좋음", color: "#4caf50", bgColor: "#e8f5e9" };
  if (value <= 35) return { grade: "보통", color: "#2196f3", bgColor: "#e3f2fd" };
  if (value <= 75) return { grade: "나쁨", color: "#ff9800", bgColor: "#fff3e0" };
  return { grade: "매우나쁨", color: "#f44336", bgColor: "#ffebee" };
}

// 미세먼지 등급 텍스트만 반환
function formatAirQuality(value) {
  const { grade } = getAirQualityGrade(value);
  return grade;
}

// 초미세먼지 등급 텍스트만 반환
function formatPM25Quality(value) {
  const { grade } = getPM25Grade(value);
  return grade;
}

// 미세먼지 등급에 따른 배경색 반환
function getAirQualityBgColor(value) {
  const { bgColor } = getAirQualityGrade(value);
  return bgColor;
}

// 초미세먼지 등급에 따른 배경색 반환
function getPM25BgColor(value) {
  const { bgColor } = getPM25Grade(value);
  return bgColor;
}

// 보기 전환 공통 함수 (active 클래스 사용)
function toggleView(activeBtn, inactiveBtn, activeView, inactiveView) {
  activeBtn.classList.add("active");
  inactiveBtn.classList.remove("active");
  activeView.classList.add("active");
  inactiveView.classList.remove("active");
}

// CSV 보기 전환 (hidden 클래스 사용)
function toggleCSVView(activeBtn, inactiveBtn, activeView, inactiveView) {
  activeBtn.classList.add("active");
  inactiveBtn.classList.remove("active");
  activeView.classList.remove("hidden");
  inactiveView.classList.add("hidden");
}

// 공통 차트 옵션
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  resizeDelay: 200
};

/*************************************************
 * 원평동 데이터
 *************************************************/
const wonpyeongElements = {
  tableBtn: document.getElementById("tableBtn"),
  graphBtn: document.getElementById("graphBtn"),
  tableView: document.getElementById("tableView"),
  graphView: document.getElementById("graphView"),
  tableBody: document.getElementById("tableBody"),
  chart: null
};

const airData = [
  { time: "00:00", pm25: 19, pm10: 27 },
  { time: "01:00", pm25: 20, pm10: 31 },
  { time: "02:00", pm25: 22, pm10: 24 },
  { time: "03:00", pm25: 25, pm10: 28 },
  { time: "04:00", pm25: 22, pm10: 25 },
  { time: "05:00", pm25: 16, pm10: 23 },
  { time: "06:00", pm25: 16, pm10: 25 },
  { time: "07:00", pm25: 22, pm10: 26 },
  { time: "08:00", pm25: 20, pm10: 24 },
  { time: "09:00", pm25: 28, pm10: 26 },
  { time: "10:00", pm25: 27, pm10: 26 },
  { time: "11:00", pm25: 33, pm10: 32 },
  { time: "12:00", pm25: 33, pm10: 28 },
  { time: "13:00", pm25: 29, pm10: 42 },
  { time: "14:00", pm25: 23, pm10: 38 },
  { time: "15:00", pm25: 20, pm10: 41 },
  { time: "16:00", pm25: 22, pm10: 33 },
  { time: "17:00", pm25: 21, pm10: 38 },
  { time: "18:00", pm25: 23, pm10: 47 },
  { time: "19:00", pm25: 23, pm10: 46 },
  { time: "20:00", pm25: 28, pm10: 47 },
  { time: "21:00", pm25: 23, pm10: 37 },
  { time: "22:00", pm25: 19, pm10: 41 },
  { time: "23:00", pm25: 20, pm10: 36 }
];

function renderWonpyeongTable() {
  const { tableBody } = wonpyeongElements;
  tableBody.innerHTML = airData.map(d => {
    const timeFormatted = d.time.replace(":", "시 ") + "분";
    const pm10Quality = formatAirQuality(d.pm10);
    const pm25Quality = formatPM25Quality(d.pm25);
    const pm10BgColor = getAirQualityBgColor(d.pm10);
    const pm25BgColor = getPM25BgColor(d.pm25);
    return `
      <tr>
        <td>${WONPYEONG_DATE} ${timeFormatted}</td>
        <td style="background-color: ${pm10BgColor};">${d.pm10} ㎍/㎥ (${pm10Quality})</td>
        <td style="background-color: ${pm25BgColor};">${d.pm25} ㎍/㎥ (${pm25Quality})</td>
      </tr>
    `;
  }).join("");
}

function renderWonpyeongChart() {
  const ctx = document.getElementById("airChart");

  wonpyeongElements.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: airData.map(d => d.time),
      datasets: [
        {
          label: "미세먼지 (PM10)",
          data: airData.map(d => d.pm10),
          borderWidth: 2,
          tension: 0.3
        },
        {
          label: "초미세먼지 (PM2.5)",
          data: airData.map(d => d.pm25),
          borderWidth: 2,
          tension: 0.3
        }
      ]
    },
    options: {
      ...commonChartOptions,
      plugins: {
        legend: {
          onClick: (e, item, legend) => {
            const chart = legend.chart;
            chart.setDatasetVisibility(item.datasetIndex, !chart.isDatasetVisible(item.datasetIndex));
            chart.update("none");
          }
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              let grade;
              if (label.includes("PM10") || label.includes("미세먼지")) {
                grade = getAirQualityGrade(value).grade;
              } else {
                grade = getPM25Grade(value).grade;
              }
              return `${label}: ${value} ㎍/㎥ (${grade})`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

// 원평동 보기 전환
wonpyeongElements.tableBtn.onclick = () => {
  toggleView(
    wonpyeongElements.tableBtn,
    wonpyeongElements.graphBtn,
    wonpyeongElements.tableView,
    wonpyeongElements.graphView
  );
};

wonpyeongElements.graphBtn.onclick = () => {
  toggleView(
    wonpyeongElements.graphBtn,
    wonpyeongElements.tableBtn,
    wonpyeongElements.graphView,
    wonpyeongElements.tableView
  );

  if (!wonpyeongElements.chart) {
    nextFrame(renderWonpyeongChart);
  } else {
    wonpyeongElements.chart.resize();
  }
};

/*************************************************
 * CSV 데이터
 *************************************************/
const csvElements = {
  tableBtn: document.getElementById("csv-table-btn"),
  chartBtn: document.getElementById("csv-chart-btn"),
  table: document.getElementById("csv-table"),
  chartWrapper: document.getElementById("csv-chart-wrapper"),
  tableBody: document.getElementById("csv-table-body"),
  chart: null
};

let csvRawData = [];

// CSV 데이터 파싱
function parseCSVText(text) {
  const rows = text.trim().split("\n").filter(row => row.trim() !== "");
  
  if (rows.length <= 1) {
    console.warn("CSV 파일에 데이터가 없습니다.");
    return [];
  }
  
  return rows.slice(1) // 헤더 제거
    .map(row => {
      const [date, time, value] = row.split(",");
      if (!date || !time || !value) {
        console.warn("잘못된 행:", row);
        return null;
      }
      const numValue = Number(value.trim());
      return isNaN(numValue) ? null : {
        date: date.trim(),
        time: time.trim(),
        value: numValue
      };
    })
    .filter(d => d !== null);
}

async function loadCSV() {
  try {
    const res = await fetch("particular-matter.csv");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const text = await res.text();
    csvRawData = parseCSVText(text);
    console.log("CSV 파일에서 로드 성공:", csvRawData);
    return;
  } catch (error) {
    console.warn("CSV 파일 fetch 실패:", error.message);
  }
  
  // Fallback: 기본 CSV 데이터
  console.log("기본 CSV 데이터 사용");
  csvRawData = parseCSVText(DEFAULT_CSV);
  console.log("기본 CSV 데이터:", csvRawData);
}

function renderCSVTable() {
  const { tableBody } = csvElements;
  
  if (!csvRawData || csvRawData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: #999;">데이터가 없습니다.</td></tr>`;
    return;
  }

  tableBody.innerHTML = csvRawData.map(d => {
    const formattedDate = formatDate(d.date);
    const formattedTime = formatTime(d.time);
    const quality = formatAirQuality(d.value);
    return `
      <tr>
        <td>${formattedDate} ${formattedTime}</td>
        <td>${d.value} ㎍/㎥ ${quality}</td>
      </tr>
    `;
  }).join("");
}

function renderCSVChart() {
  const ctx = document.getElementById("csv-chart");

  // 기존 차트 제거
  if (csvElements.chart) {
    csvElements.chart.destroy();
  }

  // x축 라벨: 00:00 ~ 23:00
  const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  // 데이터 포인트 변환
  const dataPoints = csvRawData.map(d => ({
    x: timeToDecimal(d.time),
    y: d.value
  }));

  csvElements.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "내가 측정한 미세먼지",
        data: dataPoints,
        borderWidth: 2,
        tension: 0.3,
        borderColor: "#1e88e5",
        backgroundColor: "rgba(30, 136, 229, 0.1)",
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      ...commonChartOptions,
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => decimalToTime(context[0].parsed.x),
            label: (context) => {
              const value = context.parsed.y;
              const { grade } = getAirQualityGrade(value);
              return `농도: ${value} ㎍/㎥ (${grade})`;
            }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          title: {
            display: true,
            text: "농도 (㎍/㎥)"
          }
        },
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 23,
          ticks: {
            stepSize: 1,
            callback: (value) => `${String(Math.floor(value)).padStart(2, "0")}:00`
          },
          title: {
            display: true,
            text: "시간"
          }
        }
      }
    }
  });
}

// CSV 보기 전환
csvElements.tableBtn.onclick = () => {
  toggleCSVView(
    csvElements.tableBtn,
    csvElements.chartBtn,
    csvElements.table,
    csvElements.chartWrapper
  );
};

csvElements.chartBtn.onclick = () => {
  toggleCSVView(
    csvElements.chartBtn,
    csvElements.tableBtn,
    csvElements.chartWrapper,
    csvElements.table
  );
  nextFrame(renderCSVChart);
};

/*************************************************
 * 비교 기능
 *************************************************/
const compareElements = {
  tableBtn: document.getElementById("compare-table-btn"),
  chartBtn: document.getElementById("compare-chart-btn"),
  table: document.getElementById("compare-table"),
  chartWrapper: document.getElementById("compare-chart-wrapper"),
  tableBody: document.getElementById("compare-table-body"),
  chart: null
};

// 시간을 분 단위로 변환: "22:45" -> 1365 (22*60 + 45)
function timeToMinutes(timeStr) {
  const [hour, minute] = timeStr.split(":");
  return parseInt(hour, 10) * 60 + parseInt(minute, 10);
}

// CSV 시간 형식을 분 단위로 변환: "22.45" -> 1365
function csvTimeToMinutes(csvTimeStr) {
  const { hour, minute } = parseTime(csvTimeStr);
  return hour * 60 + minute;
}

// CSV 시간에 가장 가까운 원평동 데이터 찾기
function findNearestWonpyeongData(csvTimeStr) {
  const csvMinutes = csvTimeToMinutes(csvTimeStr);
  let nearest = null;
  let minDiff = Infinity;

  airData.forEach(d => {
    const wonpyeongMinutes = timeToMinutes(d.time);
    const diff = Math.abs(csvMinutes - wonpyeongMinutes);
    
    if (diff < minDiff) {
      minDiff = diff;
      nearest = {
        time: d.time,
        pm10: d.pm10,
        pm25: d.pm25,
        diffMinutes: diff
      };
    }
  });

  return nearest;
}

function renderCompareTable() {
  const { tableBody } = compareElements;
  
  if (!csvRawData || csvRawData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #999;">비교할 CSV 데이터가 없습니다.</td></tr>`;
    return;
  }
  
  tableBody.innerHTML = csvRawData.map(d => {
    const timeFormatted = formatTimeForChart(d.time);
    const nearest = findNearestWonpyeongData(d.time);
    const csvQuality = formatAirQuality(d.value);
    const csvBgColor = getAirQualityBgColor(d.value);
    
    if (!nearest) {
      return `
        <tr>
          <td>${timeFormatted}</td>
          <td style="background-color: ${csvBgColor};">${d.value} ㎍/㎥ (${csvQuality})</td>
          <td>-</td>
          <td>-</td>
        </tr>
      `;
    }
    
    const wonpyeongQuality = formatAirQuality(nearest.pm10);
    const wonpyeongBgColor = getAirQualityBgColor(nearest.pm10);
    const difference = d.value - nearest.pm10;
    const diffClass = difference > 0 ? 'style="color: #d32f2f;"' : difference < 0 ? 'style="color: #388e3c;"' : '';
    const diffSign = difference > 0 ? '+' : '';
    
    return `
      <tr>
        <td>${timeFormatted}</td>
        <td style="background-color: ${csvBgColor};">${d.value} ㎍/㎥ (${csvQuality})</td>
        <td style="background-color: ${wonpyeongBgColor};">${nearest.pm10} ㎍/㎥ (${wonpyeongQuality}) ${nearest.time}</td>
        <td ${diffClass}>${diffSign}${difference.toFixed(1)}</td>
      </tr>
    `;
  }).join("");
}

function renderCompareChart() {
  const ctx = document.getElementById("compare-chart");
  
  if (!ctx) {
    console.error("비교 차트 캔버스를 찾을 수 없습니다.");
    return;
  }

  // 기존 차트 제거
  if (compareElements.chart) {
    compareElements.chart.destroy();
    compareElements.chart = null;
  }

  if (!csvRawData || csvRawData.length === 0) {
    console.warn("비교할 CSV 데이터가 없습니다.");
    return;
  }

  // x축 라벨: 00:00 ~ 23:00
  const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  // CSV 데이터 포인트
  const csvDataPoints = csvRawData.map(d => ({
    x: timeToDecimal(d.time),
    y: d.value
  }));

  // 원평동 PM10 데이터 (시간대별)
  const wonpyeongDataPoints = airData.map(d => {
    const hour = parseInt(d.time.split(":")[0], 10);
    return {
      x: hour,
      y: d.pm10
    };
  });

  compareElements.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "내가 측정한 미세먼지",
          data: csvDataPoints,
          borderWidth: 2,
          tension: 0.3,
          borderColor: "#1e88e5",
          backgroundColor: "rgba(30, 136, 229, 0.1)",
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: "원평동 PM10",
          data: wonpyeongDataPoints,
          borderWidth: 2,
          tension: 0.3,
          borderColor: "#f57c00",
          backgroundColor: "rgba(245, 124, 0, 0.1)",
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      ...commonChartOptions,
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => {
              const xValue = context[0].parsed.x;
              return decimalToTime(xValue);
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              const { grade } = getAirQualityGrade(value);
              return `${label}: ${value} ㎍/㎥ (${grade})`;
            }
          }
        }
      },
      scales: {
        y: { 
          beginAtZero: true,
          title: {
            display: true,
            text: "농도 (㎍/㎥)"
          }
        },
        x: {
          type: 'linear',
          position: 'bottom',
          min: 0,
          max: 23,
          ticks: {
            stepSize: 1,
            callback: (value) => `${String(Math.floor(value)).padStart(2, "0")}:00`
          },
          title: {
            display: true,
            text: "시간"
          }
        }
      }
    }
  });
}

// 비교 보기 전환
compareElements.tableBtn.onclick = () => {
  toggleCSVView(
    compareElements.tableBtn,
    compareElements.chartBtn,
    compareElements.table,
    compareElements.chartWrapper
  );
};

compareElements.chartBtn.onclick = () => {
  toggleCSVView(
    compareElements.chartBtn,
    compareElements.tableBtn,
    compareElements.chartWrapper,
    compareElements.table
  );
  // 차트가 숨겨져 있을 때는 렌더링을 지연시킴
  setTimeout(() => {
    nextFrame(renderCompareChart);
  }, 100);
};

/*************************************************
 * 초기화
 *************************************************/
function init() {
  renderWonpyeongTable();
  csvElements.tableBtn.classList.add("active");
  compareElements.tableBtn.classList.add("active");
  
  loadCSV().then(() => {
    console.log("CSV 로딩 완료, 데이터 개수:", csvRawData.length);
    renderCSVTable();
    renderCompareTable();
  }).catch(error => {
    console.error("CSV 로딩 실패:", error);
    renderCSVTable();
    renderCompareTable();
  });
}

// DOMContentLoaded 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
