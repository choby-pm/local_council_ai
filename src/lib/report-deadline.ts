// 의정활동 보고서는 분기 단위로 작성하며, 마감일은 해당 분기 말일(KST)로 본다.

function kstToday(now: Date) {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" })
    .format(now)
    .split("-")
    .map(Number);
  return { y, m, d };
}

export function getQuarterReportDeadline(now = new Date()) {
  const { y, m, d } = kstToday(now);
  const quarter = Math.ceil(m / 3);
  const lastMonth = quarter * 3;
  const lastDay = new Date(Date.UTC(y, lastMonth, 0)).getUTCDate();

  const daysLeft = Math.round(
    (Date.UTC(y, lastMonth - 1, lastDay) - Date.UTC(y, m - 1, d)) / (24 * 60 * 60 * 1000)
  );

  return {
    periodLabel: `${y}년 ${quarter}분기`,
    deadline: `${y}-${String(lastMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`,
    daysLeft,
  };
}
