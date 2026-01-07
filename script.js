/*************************************************
 * 미세먼지 모니터링 대시보드
 *
 * 주요 기능:
 * - CSV 파일에서 구미고 측정 데이터 로드
 * - 원평동 공공 데이터 표시
 * - 데이터 비교 및 시각화
 * - 다크모드 지원
 *************************************************/

/*************************************************
 * DOM 요소 캐싱 (전역 초기화)
 *************************************************/
const DOM = {
  // 원평동 섹션 요소들
  wonpyeong: {
    tableBtn: document.getElementById("tableBtn"),
    graphBtn: document.getElementById("graphBtn"),
    tableView: document.getElementById("tableView"),
    graphView: document.getElementById("graphView"),
    tableBody: document.getElementById("tableBody"),
    stats: document.getElementById("wonpyeong-stats"),
    chart: null
  },

  // CSV 섹션 요소들
  csv: {
    tableBtn: document.getElementById("csv-table-btn"),
    chartBtn: document.getElementById("csv-chart-btn"),
    table: document.getElementById("csv-table"),
    chartWrapper: document.getElementById("csv-chart-wrapper"),
    tableBody: document.getElementById("csv-table-body"),
    stats: document.getElementById("csv-stats"),
    chart: null
  },

  // 비교 섹션 요소들
  compare: {
    tableBtn: document.getElementById("compare-table-btn"),
    chartBtn: document.getElementById("compare-chart-btn"),
    table: document.getElementById("compare-table"),
    chartWrapper: document.getElementById("compare-chart-wrapper"),
    tableBody: document.getElementById("compare-table-body"),
    chart: null
  },

  // 모바일 메뉴 토글
  mobileMenuToggle: document.getElementById("mobile-menu-toggle"),

  // 테마 토글
  themeToggle: document.getElementById("theme-toggle"),

  // 바디 요소
  body: document.body
};

/*************************************************
 * 애플리케이션 설정 및 상수
 *************************************************/
const APP_CONFIG = {
  // 날짜 및 데이터 설정
  WONPYEONG_DATE: "2025년 12월 29일",

  // 기본 CSV 데이터 (fallback)
  DEFAULT_CSV: `날짜,시간,농도
25.12.28,22.45,36`,

  // 차트 공통 옵션
  CHART_OPTIONS: {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    resizeDelay: 200,
    // PC 환경 감지 및 옵션 설정
    devicePixelRatio: window.devicePixelRatio || 1
  },

  // 등급별 색상 (라이트 모드)
  GRADE_COLORS: {
    good: { grade: "좋음", color: "#4caf50", bgColor: "#e8f5e9" },
    normal: { grade: "보통", color: "#2196f3", bgColor: "#e3f2fd" },
    bad: { grade: "나쁨", color: "#ff9800", bgColor: "#fff3e0" },
    veryBad: { grade: "매우나쁨", color: "#f44336", bgColor: "#ffebee" }
  },

  // 다크모드 등급별 색상
  GRADE_COLORS_DARK: {
    good: { grade: "좋음", color: "#4caf50", bgColor: "#0a2a0a" },
    normal: { grade: "보통", color: "#2196f3", bgColor: "#061b3d" },
    bad: { grade: "나쁨", color: "#ff9800", bgColor: "#261400" },
    veryBad: { grade: "매우나쁨", color: "#f44336", bgColor: "#1f0a0a" }
  }
};

/*************************************************
 * 유틸리티 모듈
 *************************************************/
const Utils = {
  // 애니메이션 유틸리티
  nextFrame(fn) {
    requestAnimationFrame(() => requestAnimationFrame(fn));
  },

  // 시간 처리 유틸리티
  time: {
    // 시간 파싱: "22.45" -> { hour: 22, minute: 45 }
    parse(timeStr) {
      const [hour, minute] = timeStr.split(".");
      return {
        hour: parseInt(hour, 10),
        minute: minute !== undefined ? parseInt(minute, 10) : 0
      };
    },

    // 시간을 소수점으로 변환: "22.45" -> 22.75
    toDecimal(timeStr) {
      const { hour, minute } = this.parse(timeStr);
      return hour + (isNaN(minute) ? 0 : minute / 60);
    },

    // 소수점 시간을 "HH:MM" 형식으로 변환: 22.75 -> "22:45"
    fromDecimal(decimal) {
      const hour = Math.floor(decimal);
      const minute = Math.round((decimal - hour) * 60);
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    },

    // 시간 형식 변환: "22.45" -> "22시 45분"
    format(timeStr) {
      const { hour, minute } = this.parse(timeStr);
      return `${hour}시 ${String(minute).padStart(2, "0")}분`;
    },

    // 시간을 "HH시" 형식으로 변환: "22.45" -> "22시"
    formatForChart(timeStr) {
      const { hour } = this.parse(timeStr);
      return `${String(hour).padStart(2, "0")}시`;
    }
  },

  // 날짜 처리 유틸리티
  date: {
    // 날짜 형식 변환: "25.12.28" -> "2025년 12월 28일"
    format(dateStr) {
      const [year, month, day] = dateStr.split(".");
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}년 ${parseInt(month, 10)}월 ${parseInt(day, 10)}일`;
    }
  }
};

// 공통 등급 판정 함수
function getGradeInfo(value, thresholds, isDark = false) {
  const colors = isDark ? APP_CONFIG.GRADE_COLORS_DARK : APP_CONFIG.GRADE_COLORS;

  if (value <= thresholds.good) return { ...colors.good };
  if (value <= thresholds.normal) return { ...colors.normal };
  if (value <= thresholds.bad) return { ...colors.bad };
  return { ...colors.veryBad };
}

// 미세먼지 등급 판정 (PM10 기준)
function getAirQualityGrade(value) {
  const isDark = document.body.hasAttribute('data-theme') && document.body.getAttribute('data-theme') === 'dark';
  const thresholds = { good: 30, normal: 80, bad: 150 };
  return getGradeInfo(value, thresholds, isDark);
}

// 초미세먼지 등급 판정 (PM2.5 기준)
function getPM25Grade(value) {
  const isDark = document.body.hasAttribute('data-theme') && document.body.getAttribute('data-theme') === 'dark';
  const thresholds = { good: 15, normal: 35, bad: 75 };
  return getGradeInfo(value, thresholds, isDark);
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

// 메모이제이션 캐시
const statsCache = new Map();

// 데이터 통계 계산 (메모이제이션 적용)
function calculateStats(data, key) {
  if (!data || data.length === 0) return null;

  // 캐시 키 생성 (데이터 길이 + 키 + 첫 번째/마지막 값으로 간단한 해시)
  const cacheKey = `${data.length}-${key}-${data[0]?.[key]}-${data[data.length - 1]?.[key]}`;

  // 캐시된 결과가 있으면 반환
  if (statsCache.has(cacheKey)) {
    return statsCache.get(cacheKey);
  }

  const values = data.map(d => d[key]).filter(v => v !== undefined && v !== null);
  if (values.length === 0) return null;

  // 한 번에 계산하여 성능 향상
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const max = Math.max(...values);
  const min = Math.min(...values);

  const result = {
    count: values.length,
    average: avg,
    max: max,
    min: min,
    currentGrade: key === 'value' ? getPM25Grade(avg).grade : getAirQualityGrade(avg).grade
  };

  // 결과 캐싱 (메모리 관리 위해 캐시 크기 제한)
  statsCache.set(cacheKey, result);
  if (statsCache.size > 10) {
    const firstKey = statsCache.keys().next().value;
    statsCache.delete(firstKey);
  }

  return result;
}

// 통계 정보 표시
function updateStatsDisplay() {
  // CSV 데이터 통계
  if (csvRawData && csvRawData.length > 0) {
    const csvStats = calculateStats(csvRawData, 'value');
    if (csvStats) {
      const statsElement = document.getElementById('csv-stats');
      if (statsElement) {
        statsElement.innerHTML = `
          📊 <strong>${csvStats.count}개 측정</strong> |
          평균: ${csvStats.average.toFixed(1)} ㎍/㎥ (${csvStats.currentGrade}) |
          최고: ${csvStats.max} ㎍/㎥ |
          최저: ${csvStats.min} ㎍/㎥
        `;
      }
    }
  }

  // 원평동 데이터 통계 (PM10 + PM2.5)
  const wonpyeongStatsPM10 = calculateStats(airData, 'pm10');
  const wonpyeongStatsPM25 = calculateStats(airData, 'pm25');

  if (wonpyeongStatsPM10 || wonpyeongStatsPM25) {
    const statsElement = document.getElementById('wonpyeong-stats');
    if (statsElement) {
      let statsHtml = '📊 <strong>24시간 측정</strong><br>';

      if (wonpyeongStatsPM10) {
        statsHtml += `<div style="margin-top: 4px;">PM10: 평균 ${wonpyeongStatsPM10.average.toFixed(1)} ㎍/㎥ (${wonpyeongStatsPM10.currentGrade}) | 최고 ${wonpyeongStatsPM10.max} ㎍/㎥ | 최저 ${wonpyeongStatsPM10.min} ㎍/㎥</div>`;
      }

      if (wonpyeongStatsPM25) {
        statsHtml += `<div style="margin-top: 4px;">PM2.5: 평균 ${wonpyeongStatsPM25.average.toFixed(1)} ㎍/㎥ (${wonpyeongStatsPM25.currentGrade}) | 최고 ${wonpyeongStatsPM25.max} ㎍/㎥ | 최저 ${wonpyeongStatsPM25.min} ㎍/㎥</div>`;
      }

      statsElement.innerHTML = statsHtml;
    }
  }
}

// 보기 전환 공통 함수 (active 클래스 사용)
/**
 * 테이블/차트 보기 전환을 위한 공통 함수
 * @param {HTMLElement} activeBtn - 활성화할 버튼
 * @param {HTMLElement} inactiveBtn - 비활성화할 버튼
 * @param {HTMLElement} activeView - 표시할 뷰
 * @param {HTMLElement} inactiveView - 숨길 뷰
 */
function toggleView(activeBtn, inactiveBtn, activeView, inactiveView) {
  activeBtn.classList.add("active");
  inactiveBtn.classList.remove("active");
  activeView.classList.add("active");
  inactiveView.classList.remove("active");

  // 모바일 감지
  const isMobile = window.innerWidth <= 768 && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  // 모바일에서만 뷰 전환 시 섹션 높이 자동 조정
  if (isMobile) {
    Utils.nextFrame(() => {
      const card = activeView.closest('.card');
      if (card && activeView.querySelector('canvas')) {
        card.style.height = 'auto';
        const newHeight = card.offsetHeight;
        card.style.height = newHeight + 'px';

        setTimeout(() => {
          card.style.height = '';
        }, 300);
      }
    });
  }
}

// CSV 보기 전환 (hidden 클래스 사용)
/**
 * CSV 섹션의 테이블/차트 보기 전환
 * @param {HTMLElement} activeBtn - 활성화할 버튼
 * @param {HTMLElement} inactiveBtn - 비활성화할 버튼
 * @param {HTMLElement} activeView - 표시할 뷰
 * @param {HTMLElement} inactiveView - 숨길 뷰
 */
function toggleCSVView(activeBtn, inactiveBtn, activeView, inactiveView) {
  activeBtn.classList.add("active");
  inactiveBtn.classList.remove("active");
  activeView.classList.remove("hidden");
  inactiveView.classList.add("hidden");
}

// 공통 차트 옵션 (설정 객체에서 가져옴)
const getCommonChartOptions = () => {
  const isMobile = window.innerWidth <= 768 && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  return {
    ...APP_CONFIG.CHART_OPTIONS,
    // PC 환경에서는 responsive 비활성화하여 그래프 모양 고정
    responsive: isMobile,
    maintainAspectRatio: !isMobile
  };
};

// DOM 객체는 파일 상단에서 이미 초기화됨

const airData = [
  { time: "00:00", pm25: 22, pm10: 43 },
  { time: "01:00", pm25: 26, pm10: 40 },
  { time: "02:00", pm25: 22, pm10: 36 },
  { time: "03:00", pm25: 23, pm10: 34 },
  { time: "04:00", pm25: 20, pm10: 21 },
  { time: "05:00", pm25: 21, pm10: 23 },
  { time: "06:00", pm25: 17, pm10: 38 },
  { time: "07:00", pm25: 22, pm10: 19 },
  { time: "08:00", pm25: 25, pm10: 25 },
  { time: "09:00", pm25: 23, pm10: 44 },
  { time: "10:00", pm25: 32, pm10: 26 },
  { time: "11:00", pm25: 32, pm10: 82 },
  { time: "12:00", pm25: 29, pm10: 57 },
  { time: "13:00", pm25: 27, pm10: 58 },
  { time: "14:00", pm25: 28, pm10: 59 },
  { time: "15:00", pm25: 31, pm10: 64 },
  { time: "16:00", pm25: 27, pm10: 54 },
  { time: "17:00", pm25: 28, pm10: 28 },
  { time: "18:00", pm25: 29, pm10: 48 },
  { time: "19:00", pm25: 36, pm10: 58 },
  { time: "20:00", pm25: 42, pm10: 60 },
  { time: "21:00", pm25: 42, pm10: 37 },
  { time: "22:00", pm25: 33, pm10: 38 },
  { time: "23:00", pm25: 62, pm10: 43 }
];

/**
 * 원평동 미세먼지 데이터를 테이블에 렌더링
 */
function renderWonpyeongTable() {
  const { tableBody } = DOM.wonpyeong;

  if (!tableBody) {
    console.error("원평동 테이블 요소를 찾을 수 없습니다");
    return;
  }

  tableBody.innerHTML = airData.map(d => {
    const timeFormatted = d.time.replace(":", "시 ") + "분";
    const pm10Quality = formatAirQuality(d.pm10);
    const pm25Quality = formatPM25Quality(d.pm25);
    const pm10BgColor = getAirQualityBgColor(d.pm10);
    const pm25BgColor = getPM25BgColor(d.pm25);
    return `
      <tr>
        <td>${APP_CONFIG.WONPYEONG_DATE} ${timeFormatted}</td>
        <td style="background-color: ${pm10BgColor};">${d.pm10} ㎍/㎥ (${pm10Quality})</td>
        <td style="background-color: ${pm25BgColor};">${d.pm25} ㎍/㎥ (${pm25Quality})</td>
      </tr>
    `;
  }).join("");
}

function renderWonpyeongChart() {
  const ctx = document.getElementById("airChart");

  if (!ctx) {
    console.error("원평동 차트 요소를 찾을 수 없습니다");
    return;
  }

  // PC 환경에서는 차트 크기를 강제로 설정
  const isMobile = window.innerWidth <= 768 && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  if (!isMobile) {
    ctx.style.width = '100%';
    ctx.style.height = '360px';
  }

  DOM.wonpyeong.chart = new Chart(ctx, {
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
      ...getCommonChartOptions(),
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
DOM.wonpyeong.tableBtn.onclick = () => {
  toggleView(
    DOM.wonpyeong.tableBtn,
    DOM.wonpyeong.graphBtn,
    DOM.wonpyeong.tableView,
    DOM.wonpyeong.graphView
  );
};

DOM.wonpyeong.graphBtn.onclick = () => {
  toggleView(
    DOM.wonpyeong.graphBtn,
    DOM.wonpyeong.tableBtn,
    DOM.wonpyeong.graphView,
    DOM.wonpyeong.tableView
  );

  if (!DOM.wonpyeong.chart) {
    Utils.nextFrame(renderWonpyeongChart);
  } else {
    DOM.wonpyeong.chart.resize();
  }
};

/*************************************************
 * CSV 데이터
 *************************************************/
// csvElements는 DOM.csv로 대체 - 이 객체는 더 이상 사용하지 않음

let csvRawData = [];

// CSV 데이터 파싱 - 개선된 에러 처리
function parseCSVText(text) {
  try {
    if (!text || typeof text !== 'string') {
      throw new Error("유효하지 않은 CSV 텍스트입니다");
    }

    const rows = text.trim().split(/\r?\n/).filter(row => row.trim() !== "");

    if (rows.length <= 1) {
      console.warn("CSV 파일에 헤더만 있거나 데이터가 없습니다");
      return [];
    }

    console.log(`CSV 파싱 시작: ${rows.length}개 행 발견`);

    const parsedData = rows.slice(1) // 헤더 제거
      .map((row, index) => {
        try {
          const columns = row.split(",").map(col => col.trim());

          if (columns.length < 3) {
            console.warn(`행 ${index + 2}: 열이 부족합니다 (${columns.length}/3)`, row);
            return null;
          }

          const [date, time, value] = columns;

          if (!date || !time || !value) {
            console.warn(`행 ${index + 2}: 필수 데이터가 누락되었습니다`, { date, time, value });
            return null;
          }

          const numValue = Number(value);
          if (isNaN(numValue) || numValue < 0) {
            console.warn(`행 ${index + 2}: 유효하지 않은 농도 값`, value);
            return null;
          }

          return {
            date: date,
            time: time,
            value: numValue
          };
        } catch (rowError) {
          console.warn(`행 ${index + 2} 파싱 중 오류:`, rowError.message, row);
          return null;
        }
      })
      .filter(d => d !== null);

    console.log(`✅ CSV 파싱 완료: ${parsedData.length}개 유효한 데이터`);
    return parsedData;

  } catch (error) {
    console.error("❌ CSV 파싱 중 심각한 오류:", error.message);
    return [];
  }
}

/**
 * CSV 파일에서 구미고 측정 데이터를 로드
 * @returns {Promise<void>}
 */
async function loadCSV() {
  try {
    console.log("CSV 파일 로딩 시도...");
  const res = await fetch("particular-matter.csv");

    if (!res.ok) {
      throw new Error(`서버 응답 오류: ${res.status} ${res.statusText}`);
    }

  const text = await res.text();

    if (!text || text.trim().length === 0) {
      throw new Error("CSV 파일이 비어있습니다");
    }

    const parsed = parseCSVText(text);

    if (parsed.length === 0) {
      throw new Error("CSV 파일에서 유효한 데이터를 찾을 수 없습니다");
    }

    csvRawData = parsed;
    console.log(`✅ CSV 파일 로드 성공: ${parsed.length}개 데이터`);
    return;

  } catch (error) {
    console.warn("⚠️ CSV 파일 로드 실패:", error.message);

    // 네트워크 오류인 경우 사용자에게 알림
    if (error.message.includes('fetch') || error.message.includes('HTTP')) {
      console.warn("💡 로컬 서버를 실행해야 할 수 있습니다: python -m http.server");
    }

    // Fallback: 기본 CSV 데이터
    console.log("🔄 기본 데이터로 대체합니다");
    try {
      csvRawData = parseCSVText(APP_CONFIG.DEFAULT_CSV);
      console.log(`✅ 기본 데이터 로드 성공: ${csvRawData.length}개 데이터`);
    } catch (fallbackError) {
      console.error("❌ 기본 데이터도 로드할 수 없습니다:", fallbackError.message);
      csvRawData = [];
    }
  }
}

function renderCSVTable() {
  const { tableBody } = DOM.csv;

  if (!tableBody) {
    console.error("CSV 테이블 요소를 찾을 수 없습니다");
    return;
  }

  if (!csvRawData || csvRawData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; color: var(--small-text);">데이터가 없습니다.</td></tr>`;
    return;
  }

  tableBody.innerHTML = csvRawData.map(d => {
    const formattedDate = Utils.date.format(d.date);
    const formattedTime = Utils.time.format(d.time);
    const quality = formatPM25Quality(d.value);
    const bgColor = getPM25BgColor(d.value);
    return `
      <tr>
        <td>${formattedDate} ${formattedTime}</td>
        <td style="background-color: ${bgColor};">${d.value} ㎍/㎥ (${quality})</td>
      </tr>
    `;
  }).join("");
}

function renderCSVChart() {
  const ctx = document.getElementById("csv-chart");

  // 기존 차트 제거
  if (DOM.csv.chart) {
    DOM.csv.chart.destroy();
  }

  // PC 환경에서는 차트 크기를 강제로 설정
  const isMobile = window.innerWidth <= 768 && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  if (!isMobile) {
    ctx.style.width = '100%';
    ctx.style.height = '360px';
  }

  // x축 라벨: 00:00 ~ 23:00
  const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  // 데이터 포인트 변환
  const dataPoints = csvRawData.map(d => ({
    x: Utils.time.toDecimal(d.time),
    y: d.value
  }));

  DOM.csv.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "구미고에서 측정한 초미세먼지(PM2.5)",
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
      ...getCommonChartOptions(),
      plugins: {
        tooltip: {
          callbacks: {
            title: (context) => decimalToTime(context[0].parsed.x),
            label: (context) => {
              const value = context.parsed.y;
              const { grade } = getPM25Grade(value);
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
DOM.csv.tableBtn.onclick = () => {
  toggleCSVView(
    DOM.csv.tableBtn,
    DOM.csv.chartBtn,
    DOM.csv.table,
    DOM.csv.chartWrapper
  );
};

DOM.csv.chartBtn.onclick = () => {
  toggleCSVView(
    DOM.csv.chartBtn,
    DOM.csv.tableBtn,
    DOM.csv.chartWrapper,
    DOM.csv.table
  );

  if (!DOM.csv.chart) {
    Utils.nextFrame(renderCSVChart);
  } else {
    DOM.csv.chart.resize();
  }
};

/*************************************************
 * 비교 기능
 *************************************************/
// compareElements는 DOM.compare로 대체 - 이 객체는 더 이상 사용하지 않음

// 시간을 분 단위로 변환: "22:45" -> 1365 (22*60 + 45)
function timeToMinutes(timeStr) {
  const [hour, minute] = timeStr.split(":");
  return parseInt(hour, 10) * 60 + parseInt(minute, 10);
}

// CSV 시간 형식을 분 단위로 변환: "22.45" -> 1365
function csvTimeToMinutes(csvTimeStr) {
  const { hour, minute } = Utils.time.parse(csvTimeStr);
  return hour * 60 + (isNaN(minute) ? 0 : minute);
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
  const { tableBody } = DOM.compare;

  if (!tableBody) {
    console.error("비교 테이블 요소를 찾을 수 없습니다");
    return;
  }

  if (!csvRawData || csvRawData.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--small-text);">비교할 CSV 데이터가 없습니다.</td></tr>`;
    return;
  }

  tableBody.innerHTML = csvRawData.map(d => {
    const timeFormatted = Utils.time.formatForChart(d.time);
    const nearest = findNearestWonpyeongData(d.time);
    const csvQuality = formatPM25Quality(d.value);
    const csvBgColor = getPM25BgColor(d.value);

    if (!nearest) {
      return `
        <tr>
          <td>${timeFormatted}</td>
          <td style="background-color: ${csvBgColor};">${d.value} ㎍/㎥ (${csvQuality})</td>
          <td style="color: var(--small-text);">데이터 없음</td>
          <td style="color: var(--small-text);">-</td>
        </tr>
      `;
    }

    const wonpyeongQuality = formatPM25Quality(nearest.pm25);
    const wonpyeongBgColor = getPM25BgColor(nearest.pm25);
    const difference = d.value - nearest.pm25;
    const diffClass = difference > 0 ? 'style="color: #d32f2f;"' : difference < 0 ? 'style="color: #388e3c;"' : '';
    const diffSign = difference > 0 ? '+' : '';

    return `
      <tr>
        <td>${timeFormatted}</td>
        <td style="background-color: ${csvBgColor};">${d.value} ㎍/㎥ (${csvQuality})</td>
        <td style="background-color: ${wonpyeongBgColor};">${nearest.pm25} ㎍/㎥ (${wonpyeongQuality})</td>
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
  if (DOM.compare.chart) {
    DOM.compare.chart.destroy();
    DOM.compare.chart = null;
  }

  // PC 환경에서는 차트 크기를 강제로 설정
  const isMobile = window.innerWidth <= 768 && (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  );

  if (!isMobile) {
    ctx.style.width = '100%';
    ctx.style.height = '360px';
  }

  if (!csvRawData || csvRawData.length === 0) {
    console.warn("비교할 CSV 데이터가 없습니다.");
    return;
  }

  // x축 라벨: 00:00 ~ 23:00
  const labels = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

  // CSV 데이터 포인트
  const csvDataPoints = csvRawData.map(d => ({
    x: Utils.time.toDecimal(d.time),
    y: d.value
  }));

  // 원평동 PM2.5 데이터 (시간대별)
  const wonpyeongDataPoints = airData.map(d => {
    const hour = parseInt(d.time.split(":")[0], 10);
    return {
      x: hour,
      y: d.pm25
    };
  });

  DOM.compare.chart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "구미고",
          data: csvDataPoints,
          borderWidth: 2,
          tension: 0.3,
          borderColor: "#1e88e5",
          backgroundColor: "rgba(30, 136, 229, 0.1)",
          pointRadius: 5,
          pointHoverRadius: 7
        },
        {
          label: "원평동",
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
      ...getCommonChartOptions(),
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
              const { grade } = getPM25Grade(value);
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
DOM.compare.tableBtn.onclick = () => {
  toggleCSVView(
    DOM.compare.tableBtn,
    DOM.compare.chartBtn,
    DOM.compare.table,
    DOM.compare.chartWrapper
  );
};

DOM.compare.chartBtn.onclick = () => {
  toggleCSVView(
    DOM.compare.chartBtn,
    DOM.compare.tableBtn,
    DOM.compare.chartWrapper,
    DOM.compare.table
  );
  // 차트가 숨겨져 있을 때는 렌더링을 지연시킴
  setTimeout(() => {
    Utils.nextFrame(renderCompareChart);
  }, 100);
};

/*************************************************
 * 초기화
 *************************************************/
function init() {
  console.log("🚀 미세먼지 대시보드 초기화 중...");

  try {
    // 테마 상태 확인 후 데이터 렌더링
    const isDarkMode = DOM.body.hasAttribute('data-theme') && DOM.body.getAttribute('data-theme') === 'dark';
    console.log("🎨 초기 테마:", isDarkMode ? '다크모드' : '라이트모드');

  // 원평동 데이터 렌더링 (테마 상태 반영)
  renderWonpyeongTable();

  // 버튼 상태 초기화
  if (DOM.csv.tableBtn) DOM.csv.tableBtn.classList.add("active");
  if (DOM.compare.tableBtn) DOM.compare.tableBtn.classList.add("active");

  // CSV 데이터 로딩 및 렌더링
  loadCSV().then(() => {
    renderCSVTable();
    renderCompareTable();
    updateStatsDisplay();
      console.log("✅ 대시보드 로딩 완료");
    }).catch(error => {
      console.warn("⚠️ CSV 로딩 실패, 기본 데이터로 진행:", error.message);
      renderCSVTable();
      renderCompareTable();
      updateStatsDisplay();
    });
  } catch (error) {
    console.error("💥 초기화 오류:", error);
  }
}

// 다크모드 토글 기능
function initThemeToggle() {
  const themeToggle = DOM.themeToggle;
  const body = DOM.body;

  // 저장된 테마 불러오기
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    body.setAttribute('data-theme', 'dark');
    themeToggle.textContent = '☀️';
    // 다크모드 설정 후 원평동 테이블 재렌더링
    setTimeout(() => renderWonpyeongTable(), 10);
  }

  // 토글 버튼 이벤트
  themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    if (currentTheme === 'dark') {
      body.removeAttribute('data-theme');
      themeToggle.textContent = '🌙';
      localStorage.removeItem('theme'); // 라이트모드는 기본값이므로 제거
    } else {
      body.setAttribute('data-theme', 'dark');
      themeToggle.textContent = '☀️';
      localStorage.setItem('theme', 'dark');
    }

    // 테마 변경 시 모든 테이블 재렌더링 (CSS 전환 시간 고려)
    setTimeout(() => {
      renderWonpyeongTable();
      if (csvRawData && csvRawData.length > 0) {
        renderCSVTable();
        renderCompareTable();
      }
      updateStatsDisplay();
    }, 100);
  });
}

// 모바일 메뉴 토글 기능
function initMobileMenu() {
  const mobileMenuToggle = DOM.mobileMenuToggle;
  const navLinks = document.querySelector('.nav-links');

  if (!mobileMenuToggle || !navLinks) return;

  mobileMenuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
  });

  // 메뉴 외부 클릭 시 메뉴 닫기
  document.addEventListener('click', (e) => {
    if (!mobileMenuToggle.contains(e.target) && !navLinks.contains(e.target)) {
      navLinks.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
    }
  });

  // 메뉴 항목 클릭 시 메뉴 닫기
  navLinks.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') {
      navLinks.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
    }
  });

  // ESC 키로 메뉴 닫기
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('active')) {
      navLinks.classList.remove('active');
      mobileMenuToggle.classList.remove('active');
    }
  });
}

// DOMContentLoaded 후 초기화
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle(); // 먼저 테마 설정
    initMobileMenu();  // 모바일 메뉴 초기화
    init(); // 그 다음 데이터 초기화
  });
} else {
  initThemeToggle(); // 먼저 테마 설정
  initMobileMenu();  // 모바일 메뉴 초기화
  init(); // 그 다음 데이터 초기화
}
