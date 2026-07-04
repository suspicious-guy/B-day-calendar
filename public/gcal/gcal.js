(function () {
  function pad(n) {
    return String(n).padStart(2, '0');
  }

  function nextBirthdayRange(birthdateStr) {
    const parts = birthdateStr.split('-').map(Number);
    const month = parts[1];
    const day = parts[2];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start = new Date(today.getFullYear(), month - 1, day);
    if (start < today) {
      start = new Date(today.getFullYear() + 1, month - 1, day);
    }

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const fmt = (d) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
    return { start: fmt(start), end: fmt(end) };
  }

  function buildBirthdayGCalUrl(name, birthdateStr) {
    const { start, end } = nextBirthdayRange(birthdateStr);
    const text = encodeURIComponent(`День рождения ${name}`);
    const dates = `${start}/${end}`;
    const details = encodeURIComponent(`Не забудьте поздравить ${name} с днём рождения! 🎉`);
    const recur = encodeURIComponent('RRULE:FREQ=YEARLY');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&dates=${dates}&details=${details}&recur=${recur}`;
  }

  window.GCal = { buildBirthdayGCalUrl };
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('[data-gcal-name][data-gcal-birthdate]');
    if (!btn) return;

    const name = btn.dataset.gcalName;
    const birthdate = btn.dataset.gcalBirthdate;
    if (!birthdate) return;

    const url = buildBirthdayGCalUrl(name, birthdate);
    window.open(url, '_blank', 'noopener');
  });
})();