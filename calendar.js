// Calendar module (moved from monolith).

// CALENDAR

// ===== CALENDAR CONFIG / STATE moved to constants.js =====

function createCalendarEvent({typeKey, schedule, legend, color}) {
    const type = EVENT_TYPES.find(t => t.key === typeKey);
    if (!type) throw new Error("Unknown event type: " + typeKey);

    return {
        id: crypto.randomUUID(),
        type: type.key,
        label: type.label,
        schedule,
        legend: (legend ?? type.defaultLegend),
        color: (color ?? type.defaultColor)
    };
}

function generateCalendarDays(startDate, maxDays = CALENDAR_MAX_DAYS) {
    const days = [];

    const start = new Date(startDate);
    const dayOfWeek = start.getDay(); // 0 = Sunday
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

    start.setDate(start.getDate() + diffToMonday);

    for (let i = 0; i < maxDays; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);

        days.push({
            date: d,
            iso: d.toISOString().split("T")[0],
            day: d.getDate(),
            weekday: d.getDay(), // 0..6
            month: d.getMonth(),
            year: d.getFullYear(),
            events: []
        });
    }

    return days;
}

function applyEventsToCalendar(days, events) {
    const map = new Map(days.map(d => [d.iso, d]));

    events.forEach(event => {
        const s = event.schedule;

        if (s.kind === "single") {
            const key = s.date.toISOString().split("T")[0];
            if (map.has(key)) map.get(key).events.push(event);
        }

        if (s.kind === "range") {
            for (const day of days) {
                if (day.date >= s.start && day.date <= s.end) {
                    day.events.push(event);
                }
            }
        }

        if (s.kind === "repeat") {
            let cursor = new Date(s.start);

            // если end задан — ограничиваем; иначе рисуем до конца календаря
            const hardEnd = s.end ? new Date(s.end) : null;
            const calendarEnd = days[days.length - 1].date;
            const until = hardEnd ? new Date(Math.min(hardEnd.getTime(), calendarEnd.getTime())) : calendarEnd;

            while (cursor <= until) {
                const key = cursor.toISOString().split("T")[0];
                if (map.has(key)) map.get(key).events.push(event);
                cursor.setDate(cursor.getDate() + s.intervalDays);
            }
        }

    });

    return days;
}

function buildCalendar() {
    if (!calendarState.startDate) return [];

    const days = generateCalendarDays(calendarState.startDate);
    return applyEventsToCalendar(days, calendarState.events);
}

function validateMaxTwoEventsPerDay(candidateEvent) {
    if (!calendarState.startDate) return {ok: true, badDays: []};

    // строим календарь на базовые 42 дня (как сейчас)
    const days = generateCalendarDays(calendarState.startDate);
    applyEventsToCalendar(days, [...calendarState.events, candidateEvent]);

    const bad = days
        .filter(d => (d.events?.length || 0) > 2)
        .map(d => d.iso);

    return {ok: bad.length === 0, badDays: bad};
}

// Сколько дней реально рисовать: до последнего дня, где есть события
function trimDaysToLastEvent(days) {
    let lastIdx = -1;
    for (let i = 0; i < days.length; i++) {
        if (days[i].events && days[i].events.length > 0) lastIdx = i;
    }

    // ✅ Минимум — 5 недель (35 дней), чтобы превью не “схлопывалось”
    const MIN_DAYS = 35;

    // если событий нет — показываем минимум
    if (lastIdx === -1) {
        return days.slice(0, MIN_DAYS);
    }

    // хотим обрезать до конца недели, где последнее событие
    const endIdxByEventWeek = Math.min(
        days.length - 1,
        lastIdx + (6 - days[lastIdx].weekday)
    );

    const endIdxByMin = Math.min(days.length - 1, MIN_DAYS - 1);

    const endIdx = Math.max(endIdxByEventWeek, endIdxByMin);
    return days.slice(0, endIdx + 1);
}

function padDaysToFullWeeks(days) {
    if (!days.length) return days;

    while (days.length % 7 !== 0) {
        const last = days[days.length - 1];
        const nextDate = new Date(last.date);
        nextDate.setDate(nextDate.getDate() + 1);

        days.push({
            date: nextDate,
            iso: nextDate.toISOString().split("T")[0],
            day: nextDate.getDate(),
            weekday: nextDate.getDay(),
            month: nextDate.getMonth(),
            year: nextDate.getFullYear(),
            events: []
        });
    }

    return days;
}

function renderCalendarPreview() {
    const container = document.getElementById("calendar-preview-container");
    container.innerHTML = "";

    if (!calendarState.startDate) {
        container.innerHTML = `<div style="color:#4E555C;">Вибери дату консультації, щоб побачити календар.</div>`;
        return;
    }

    const rawDays = buildCalendar(); // 42 дня от понедельника
    let days = trimDaysToLastEvent(rawDays);
    days = padDaysToFullWeeks(days);

    // Строим grid: header + rows
    const grid = document.createElement("div");
    grid.className = "calendar-grid";

    const headerRow = document.createElement("div");
    headerRow.className = "calendar-header-row";
    // хотим чтобы неделя начиналась с Пн, а не с Нд
    const orderedLabels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    orderedLabels.forEach(lbl => {
        const cell = document.createElement("div");
        cell.className = "calendar-header-cell";
        cell.textContent = lbl;
        headerRow.appendChild(cell);
    });
    grid.appendChild(headerRow);

    for (let i = 0, weekIndex = 0; i < days.length; i += 7, weekIndex++) {
        const row = document.createElement("div");
        row.className = "calendar-row";

        const week = days.slice(i, i + 7);

        week.forEach((day, dayIndex) => {
            const cell = document.createElement("div");
            cell.className = "calendar-cell";

            if (!day) {
                cell.classList.add("calendar-cell-empty");
                row.appendChild(cell);
                return;
            }

            // badge (число)
            const badge = document.createElement("div");
            badge.className = "calendar-day-badge";
            badge.textContent = String(day.day);
            cell.appendChild(badge);

            // месяц в первой ячейке календаря или на "1" числе месяца
            const isFirstCell = (weekIndex === 0 && dayIndex === 0);
            if (isFirstCell || day.day === 1) {
                const monthLabel = document.createElement("div");
                monthLabel.className = "calendar-month-label";
                monthLabel.textContent = formatMonthShortUk(day.date);
                cell.appendChild(monthLabel);
            }

            if (day.events && day.events.length > 0) {
                const first = day.events[0];
                const second = day.events[1];

                // фон = цвет первого события (как договорились)
                if (first?.color) cell.style.background = first.color;

                const stack = document.createElement("div");
                stack.className = "calendar-event-stack";

                const hasTwo = !!second;
                stack.style.top = hasTwo ? "62%" : "68%";
                stack.style.transform = "translateY(-50%)";
                stack.style.gap = hasTwo ? "5px" : "0px";

                const item1 = document.createElement("div");
                item1.style.margin = "2px 0";

                item1.className = "calendar-event-item";
                item1.textContent = first.label || first.type;
                stack.appendChild(item1);

                if (second) {
                    const div = document.createElement("div");
                    div.className = "calendar-event-divider";
                    stack.appendChild(div);

                    const item2 = document.createElement("div");
                    item2.className = "calendar-event-item";
                    item2.textContent = second.label || second.type;
                    stack.appendChild(item2);
                }

                cell.appendChild(stack);
            }

            row.appendChild(cell);
        });

        grid.appendChild(row);
    }

    container.appendChild(grid);
}

function describeSchedule(schedule) {
    const to = (d) => formatDateDMY(d);

    if (schedule.kind === "single") return `Разово: ${to(schedule.date)}`;
    if (schedule.kind === "range") return `Період: ${to(schedule.start)} → ${to(schedule.end)}`;
    if (schedule.kind === "repeat") {
        const end = schedule.end ? `, до ${to(schedule.end)}` : "";
        return `Повтор: кожні ${schedule.intervalDays} дн., старт ${to(schedule.start)}${end}`;
    }
    return "";
}

function renderEventsList() {
    const container = document.getElementById("calendar-events-container");
    if (!container) return;

    if (!calendarState.events.length) {
        container.innerHTML = `<div class="calendar-events-container-empty">Подій поки немає.</div>`;
        return;
    }

    // сортируем по ближайшей дате старта
    const sorted = [...calendarState.events].sort((a, b) => {
        const ad = a.schedule.kind === "single" ? a.schedule.date
            : a.schedule.kind === "range" ? a.schedule.start
                : a.schedule.start;
        const bd = b.schedule.kind === "single" ? b.schedule.date
            : b.schedule.kind === "range" ? b.schedule.start
                : b.schedule.start;
        return ad - bd;
    });

    container.innerHTML = "";
    sorted.forEach(ev => {
        const row = document.createElement("div");
        row.className = "calendar-event-row";

        const top = document.createElement("div");
        top.className = "calendar-event-row-top";

        const pill = document.createElement("div");
        pill.className = "calendar-event-pill";

        const dot = document.createElement("span");
        dot.className = "calendar-color-dot";
        dot.style.background = ev.color || "transparent";
        pill.appendChild(dot);

        const text = document.createElement("span");
        text.textContent = ev.label;
        pill.appendChild(text);

        const meta = document.createElement("div");
        meta.className = "calendar-event-meta";
        meta.textContent = describeSchedule(ev.schedule);

        const del = document.createElement("button");
        del.type = "button";
        del.className = "form-button";
        del.textContent = "Видалити";
        del.addEventListener("click", () => {
            calendarState.events = calendarState.events.filter(x => x.id !== ev.id);
            renderCalendarPreview();
            renderEventsList();
        });

        top.appendChild(pill);
        top.appendChild(meta);
        top.appendChild(del);

        const ta = document.createElement("textarea");
        ta.className = "form-textarea";
        ta.rows = 3;
        ta.value = ev.legend || "";
        ta.addEventListener("input", () => {
            const target = calendarState.events.find(x => x.id === ev.id);
            if (target) target.legend = ta.value;
        });

        row.appendChild(top);
        row.appendChild(ta);

        container.appendChild(row);
    });
}

let calendarUIInitialized = false;

function initCalendarEventUI() {
    if (calendarUIInitialized) return;
    calendarUIInitialized = true;

    const typeSel = document.getElementById("cal-ev-type");
    const kindSel = document.getElementById("cal-ev-kind");
    const legendTa = document.getElementById("cal-ev-legend");
    const colorSel = document.getElementById("cal-ev-color");

    const singlePanel = document.getElementById("cal-ev-kind-single");
    const rangePanel = document.getElementById("cal-ev-kind-range");
    const repeatPanel = document.getElementById("cal-ev-kind-repeat");

    const dateSingle = document.getElementById("cal-ev-date");
    const dateStart = document.getElementById("cal-ev-start");
    const dateEnd = document.getElementById("cal-ev-end");
    const repeatStart = document.getElementById("cal-ev-repeat-start");
    const repeatEnd = document.getElementById("cal-ev-repeat-end");
    const intervalInp = document.getElementById("cal-ev-interval");
    if (intervalInp) {
        intervalInp.addEventListener("blur", () => {
            const v = parseInt(intervalInp.value, 10);
            if (!Number.isFinite(v) || v < 1) intervalInp.value = "1";
        });
    }

    const addBtn = document.getElementById("cal-ev-add");
    const clearBtn = document.getElementById("cal-ev-clear");

    if (!typeSel || !kindSel || !legendTa || !colorSel || !addBtn || !clearBtn) return;

    // fill type options
    typeSel.innerHTML = "";
    EVENT_TYPES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t.key;
        opt.textContent = t.label;
        typeSel.appendChild(opt);
    });

    // fill color options
    colorSel.innerHTML = "";
    CALENDAR_COLORS.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.value;
        opt.textContent = c.label;
        colorSel.appendChild(opt);
    });

    // defaults based on selected type
    function syncDefaultsFromType() {
        const t = EVENT_TYPES.find(x => x.key === typeSel.value);
        if (!t) return;
        legendTa.value = t.defaultLegend;
        // цвет по умолчанию из типа, но только если юзер не выбирал вручную (упростим: всегда)
        colorSel.value = t.defaultColor;
    }

    function switchKindPanels() {
        const kind = kindSel.value;
        singlePanel.style.display = (kind === "single") ? "flex" : "none";
        rangePanel.style.display = (kind === "range") ? "flex" : "none";
        repeatPanel.style.display = (kind === "repeat") ? "flex" : "none";
    }

    // seed dates
    const base = calendarState.startDate ? isoDate(calendarState.startDate) : isoDate(new Date());
    if (dateSingle) dateSingle.value = base;
    if (dateStart) dateStart.value = base;
    if (dateEnd) dateEnd.value = base;
    if (repeatStart) repeatStart.value = base;

    if (repeatEnd) {
        const s = new Date(base);
        const e = new Date(s);
        e.setDate(e.getDate() + 14); // дефолт: 2 недели
        repeatEnd.value = isoDate(e);

        if (repeatStart && repeatEnd) {
            repeatStart.addEventListener("change", () => {
                if (!repeatStart.value) return;
                const s = new Date(repeatStart.value);

                // если конец пустой или раньше старта — ставим старт+14
                if (!repeatEnd.value) {
                    const e = new Date(s);
                    e.setDate(e.getDate() + 14);
                    repeatEnd.value = isoDate(e);
                    return;
                }

                const e0 = new Date(repeatEnd.value);
                if (e0 < s) {
                    const e = new Date(s);
                    e.setDate(e.getDate() + 14);
                    repeatEnd.value = isoDate(e);
                }
            });
        }
    }

    typeSel.addEventListener("change", syncDefaultsFromType);
    kindSel.addEventListener("change", switchKindPanels);

    clearBtn.addEventListener("click", () => {
        syncDefaultsFromType();
        kindSel.value = "single";
        switchKindPanels();
        const b = calendarState.startDate ? isoDate(calendarState.startDate) : isoDate(new Date());
        if (dateSingle) dateSingle.value = b;
        if (dateStart) dateStart.value = b;
        if (dateEnd) dateEnd.value = b;
        if (repeatStart) repeatStart.value = b;
        if (repeatEnd) {
            const s = new Date(b);
            const e = new Date(s);
            e.setDate(e.getDate() + 14);
            repeatEnd.value = isoDate(e);
        }
        if (intervalInp) intervalInp.value = "2";
    });

    addBtn.addEventListener("click", () => {
        if (!calendarState.startDate) {
            alert("Спочатку вибери дату консультації (старт).");
            return;
        }

        const typeKey = typeSel.value;
        const kind = kindSel.value;
        const legend = legendTa.value.trim();
        const color = colorSel.value;

        let schedule;

        if (kind === "single") {
            if (!dateSingle.value) return alert("Вкажи дату.");
            schedule = {kind: "single", date: new Date(dateSingle.value)};
        } else if (kind === "range") {
            if (!dateStart.value || !dateEnd.value) return alert("Вкажи період (від-до).");
            const s = new Date(dateStart.value);
            const e = new Date(dateEnd.value);
            if (s > e) return alert("Дата 'Від' не може бути пізніше 'До'.");
            schedule = {kind: "range", start: s, end: e};
        } else if (kind === "repeat") {
            if (!repeatStart.value) return alert("Вкажи початок повтору.");
            if (!repeatEnd.value) return alert("Вкажи кінець повтору.");

            const n = parseInt(intervalInp.value, 10);
            if (!Number.isFinite(n) || n < 1) return alert("Інтервал має бути >= 1.");

            const s = new Date(repeatStart.value);
            const e = new Date(repeatEnd.value);
            if (s > e) return alert("Дата 'Початок' не може бути пізніше 'Кінець'.");

            schedule = {kind: "repeat", start: s, end: e, intervalDays: n};
        }


        const ev = createCalendarEvent({typeKey, schedule, legend, color});

        const check = validateMaxTwoEventsPerDay(ev);
        if (!check.ok) {
            const shown = check.badDays.slice(0, 3).map(formatUkDateShort).join(", ");
            alert(`На одну дату можна максимум 2 події.\nПеревищення: ${shown}${check.badDays.length > 3 ? " …" : ""}`);
            return;
        }

        calendarState.events.push(ev);
        renderCalendarPreview();
        renderEventsList();

    });

    // init
    switchKindPanels();
    syncDefaultsFromType();
}

function bindDatePill(inputId, btnId) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const btn = btnId ? document.getElementById(btnId) : null;

    const openPicker = (e) => {
        if (e) e.preventDefault();
        if (typeof input.showPicker === "function") input.showPicker();
        else {
            input.focus({preventScroll: true});
            input.click();
        }
    };

    // чтобы не навесить слушатели дважды
    if (input.dataset.pillBound === "1") return;
    input.dataset.pillBound = "1";

    input.addEventListener("click", openPicker);
    if (btn) btn.addEventListener("click", openPicker);
}

let calendarDateUIInitialized = false;

function initCalendarDateUI() {
    if (calendarDateUIInitialized) return;
    calendarDateUIInitialized = true;

    bindDatePill("calendar-start-date", "calendar-start-date-btn");

    // event form dates
    bindDatePill("cal-ev-date", "cal-ev-date-btn");
    bindDatePill("cal-ev-start", "cal-ev-start-btn");
    bindDatePill("cal-ev-end", "cal-ev-end-btn");
    bindDatePill("cal-ev-repeat-start", "cal-ev-repeat-start-btn");
    bindDatePill("cal-ev-repeat-end", "cal-ev-repeat-end-btn");
}


function buildCalendarFilename() {
    const d = new Date();
    const dd = pad2(d.getDate());
    const mm = pad2(d.getMonth() + 1);
    const yyyy = d.getFullYear();
    const hh = pad2(d.getHours());
    const min = pad2(d.getMinutes());
    return `cosmiki_calendar_${dd}-${mm}-${yyyy}_${hh}-${min}.pdf`;
}

let cachedLogoDataUrl = null;

async function loadLogoDataUrlOnce() {
    if (cachedLogoDataUrl) return cachedLogoDataUrl;

    const blob = await fetch(logoUrl).then(r => r.blob());
    cachedLogoDataUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });

    return cachedLogoDataUrl;
}

// “календарные дни” для PDF: как в превью (min 35, max 42), но кратно 7
function getCalendarDaysForPdf() {
    const raw = buildCalendar();
    let days = trimDaysToLastEvent(raw);
    days = padDaysToFullWeeks(days);
    return days;
}


async function generateCalendarPDF() {
    if (!calendarState.startDate) {
        alert("Спочатку вибери дату консультації (старт).");
        return;
    }

    const {jsPDF} = window.jspdf;
    const doc = new jsPDF({unit: "mm", format: "a4"});

    await loadFontsToDoc(doc);

    // page size
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    // background
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, pageW, pageH, "F");

    // fonts/colors
    doc.setTextColor(textColor);

    const marginX = 14;
    const headerY = 18;

    // header: title
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(22);
    doc.text("Календар догляду", marginX, headerY);

    // header: period (по фактическим дням PDF)
    const daysForPdf = getCalendarDaysForPdf();
    const firstDay = daysForPdf.find(d => d)?.iso;
    const lastDay = [...daysForPdf].reverse().find(d => d)?.iso;

    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text(
        `Період: ${formatUkDateShort(firstDay)} — ${formatUkDateShort(lastDay)}`,
        marginX,
        headerY + 8
    );

    // logo (same as conclusion)
    const logo = await loadLogoDataUrlOnce();
    const logoW = 26;
    const logoH = 26;
    const titleY = headerY;        // 18
    const periodY = headerY + 8;   // 26
    const headerBlockCenterY = (titleY + periodY) / 2; // 22
    const logoY = headerBlockCenterY - logoH / 2;      // 9

    doc.addImage(logo, "PNG", pageW - marginX - logoW, logoY - 3, logoW, logoH);

    // grid geometry
    const gridX = marginX;
    const gridY = headerY + 18;

    const gridW = pageW - marginX * 2;
    const weeks = daysForPdf.length / 7;

    const legendMaxH = 110;
    const legendGap = 6;
    const gridH = pageH - gridY - marginX - legendMaxH - legendGap;

    const cellW = gridW / 7;
    const cellH = gridH / weeks;

    const weekHeaderH = 8;
    const cellsTopY = gridY + weekHeaderH;

    const cornerR = 3;

    // 1) weekday header background (draw FIRST, under border)
    // weekday header background with rounded TOP corners (no sharp overlay)
    const calendarHeaderColor = "#F4B7A6"; //
    const calendarHeaderTextColor = "#4E555C";

    doc.setFillColor(calendarHeaderColor);

    // center rect (без углов)
    doc.rect(gridX + cornerR, gridY, gridW - 2 * cornerR, weekHeaderH, "F");

    // left part (прямоугольник вниз от радиуса)
    doc.rect(gridX, gridY + cornerR, cornerR, weekHeaderH - cornerR, "F");
    // right part
    doc.rect(gridX + gridW - cornerR, gridY + cornerR, cornerR, weekHeaderH - cornerR, "F");

    // two filled quarter-circles (полукруги в углах)
    doc.circle(gridX + cornerR, gridY + cornerR, cornerR, "F");                 // левый верх
    doc.circle(gridX + gridW - cornerR, gridY + cornerR, cornerR, "F");          // правый верх


    // weekday header text
    const ht = hexToRgb(calendarHeaderTextColor);
    doc.setTextColor(ht.r, ht.g, ht.b);
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(12);

    const weekdays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];
    for (let c = 0; c < 7; c++) {
        const cx = gridX + c * cellW;
        doc.text(weekdays[c], cx + cellW / 2, gridY + 5.7, {align: "center"});
    }

    // restore main text color
    doc.setTextColor(textColor);

    // cells content
    doc.setFontSize(11);

    for (let i = 0; i < daysForPdf.length; i++) {
        const d = daysForPdf[i];
        const r = Math.floor(i / 7);
        const c = i % 7;

        const x = gridX + c * cellW;
        const y = cellsTopY + r * cellH;

        if (!d) continue;

        const ev1 = d.events?.[0] || null;
        const ev2 = d.events?.[1] || null;

        if (ev1?.color) {
            let rgb = null;

            const rgba = parseRgba(ev1.color);
            if (rgba) {
                rgb = blendOverBg(rgba, backgroundColor);
            } else if (ev1.color.startsWith("#")) {
                const h = ev1.color.replace("#", "");
                rgb = {
                    r: parseInt(h.slice(0, 2), 16),
                    g: parseInt(h.slice(2, 4), 16),
                    b: parseInt(h.slice(4, 6), 16)
                };
            }

            if (rgb) {
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
                doc.rect(x + 0.2, y + 0.2, cellW - 0.4, cellH - 0.4, "F");
            }
        }


        if (ev1) {
            const paddingX = 3;
            const maxW = cellW - paddingX * 2;

            const fontName = "Montserrat-Bold";
            const sizeMax = 10;
            const sizeMin = 8;

            doc.setFont(fontName);

            if (!ev2) {
                // 1 событие — чуть выше, чем было
                const ySingle = y + cellH * 0.70;

                const fitted = fitText(doc, ev1.label, maxW, fontName, sizeMax, sizeMin);
                doc.setFontSize(fitted.size);
                doc.text(fitted.text, x + cellW / 2, ySingle, {align: "center"});
            } else {
                // 2 события — поднимаем блок и увеличиваем "воздух" вокруг разделителя
                const y1 = y + cellH * 0.60;
                const yLine = y + cellH * 0.70;
                const y2 = y + cellH * 0.88;

                const fitted1 = fitText(doc, ev1.label, maxW, fontName, sizeMax, sizeMin);
                doc.setFontSize(fitted1.size);
                doc.text(fitted1.text, x + cellW / 2, y1, {align: "center"});

                doc.setDrawColor(textColor);
                doc.setLineWidth(0.2);

                // можно чуть укоротить линию, чтобы визуально было легче
                const lineMargin = 4.5; // было 3.8
                doc.line(x + lineMargin, yLine, x + cellW - lineMargin, yLine);

                const fitted2 = fitText(doc, ev2.label, maxW, fontName, sizeMax, sizeMin);
                doc.setFontSize(fitted2.size);
                doc.text(fitted2.text, x + cellW / 2, y2, {align: "center"});
            }
        }


        // day badge (circle)
        const badgeR = 4.2;
        const bx = x + 6.5;
        const by = y + 6.5;

        doc.setDrawColor(textColor);
        doc.setLineWidth(0.3);
        doc.circle(bx, by, badgeR);

        doc.setFont("Montserrat-Bold");
        doc.setFontSize(10);
        doc.text(String(d.day), bx, by + 1.2, {align: "center"});

        // month label: first cell OR day==1 (short only)
        const isFirstCell = (i === 0);
        if (isFirstCell || d.day === 1) {
            doc.setFont("Montserrat-Bold");
            doc.setFontSize(10);
            const monthShort = formatMonthShortUk(d.date); // "січ."
            doc.text(monthShort, x + 14, by + 1.2);
        }
    }

    // grid lines (DRAW AFTER FILLS so lines are on top)
    doc.setDrawColor(textColor);
    doc.setLineWidth(0.25);

    // horizontal inner lines: r = 1..weeks-1
    for (let r = 1; r < weeks; r++) {
        const y = cellsTopY + r * cellH;
        doc.line(gridX, y, gridX + gridW, y);
    }

    // vertical inner lines: c = 1..6 (без 0 и 7)
    for (let c = 1; c < 7; c++) {
        const x = gridX + c * cellW;
        doc.line(x, cellsTopY, x, cellsTopY + weeks * cellH);
    }

    // separator line between header and cells (опционально, чтобы хедер читался чётче)
    doc.line(gridX, cellsTopY, gridX + gridW, cellsTopY);

    // 4) OUTER border (draw LAST, on top, hides “sharp” intersections)
    doc.setDrawColor(textColor);
    doc.setLineWidth(0.4);
    doc.roundedRect(gridX, gridY, gridW, gridH + weekHeaderH, cornerR, cornerR);

    // ===== Legend (reserved bottom area) =====
    const legendX = marginX;

    const legendTop = gridY + weekHeaderH + gridH + legendGap + 5;
    const legendBottom = pageH - marginX;

    doc.setFont("Montserrat-Bold");
    doc.setFontSize(12);
    doc.text("Події", legendX, legendTop);

    doc.setFont("Montserrat-Regular");
    doc.setFontSize(9);

    // unique events by type+schedule+legend
    const uniq = new Map();
    for (const ev of calendarState.events) {
        const key = [
            ev.type,
            ev.schedule?.kind,
            ev.schedule?.date ? isoDate(ev.schedule.date) : "",
            ev.schedule?.start ? isoDate(ev.schedule.start) : "",
            ev.schedule?.end ? isoDate(ev.schedule.end) : "",
            ev.schedule?.intervalDays ?? "",
            (ev.legend || "").trim()
        ].join("|");

        if (!uniq.has(key)) uniq.set(key, ev);
    }

    const uniqueEvents = Array.from(uniq.values()).slice(0, 10);

    let yCursor = legendTop + 6;
    const maxWidth = pageW - marginX * 2;
    const lineH = 4.6;
    const maxLinesPerItem = 2;
    const maxLegendChars = 160;

    for (const ev of uniqueEvents) {
        const sched = describeSchedule(ev.schedule);
        const raw = `${ev.label} — ${sched}: ${String(ev.legend || "").slice(0, maxLegendChars)}`;

        let lines = doc.splitTextToSize(raw, maxWidth);
        if (lines.length > maxLinesPerItem) {
            lines = lines.slice(0, maxLinesPerItem);
            lines[lines.length - 1] = lines[lines.length - 1].replace(/\s*$/, "") + "…";
        }

        // STOP: если уже не влазит — прекращаем (иначе “обрезается”)
        const neededH = lines.length * lineH + 1.5;
        if (yCursor + neededH > legendBottom) break;

        doc.text(lines, legendX, yCursor);
        yCursor += neededH;
    }
    // save
    doc.save(buildCalendarFilename());
}


window.generateCalendarPDF = generateCalendarPDF;
window.createCalendarEvent = createCalendarEvent;
window.renderCalendarPreview = renderCalendarPreview;
window.initCalendarEventUI = initCalendarEventUI;
window.renderEventsList = renderEventsList;
window.initCalendarDateUI = initCalendarDateUI;
