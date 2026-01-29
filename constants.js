// Project constants: form field names, labels, colors, event keys, etc.
// TODO: move "magic strings" and other repeated values into this module.

// Colors and branding for PDF / UI
const textColor = "#4E555C" // серый

const backgroundColor = "#F5E9E3" // цвет фона

const lineColor = "#4E555C"; // Цвет линии в формате RGB

// URL логотипа из Wix
const logoUrl = "https://static.wixstatic.com/media/78e720_9600005edfd645568d6ce218ca8ba5af~mv2.png";

// Файлы шрифтов из репозитория GitHub
const fontFiles = {
    regular: "https://cosmikispace.github.io/fonts/Montserrat-Regular.ttf",
    bold: "https://cosmikispace.github.io/fonts/Montserrat-Bold.ttf",
    italic: "https://cosmikispace.github.io/fonts/Montserrat-Italic.ttf",
    boldItalic: "https://cosmikispace.github.io/fonts/Montserrat-BoldItalic.ttf",
    light: "https://cosmikispace.github.io/fonts/Montserrat-Light.ttf",
    lightItalic: "https://cosmikispace.github.io/fonts/Montserrat-LightItalic.ttf"
};

// ===== CALENDAR CONFIG =====
const CALENDAR_MAX_DAYS = 42;
const WEEK_START = 1; // 1 = Monday

const EVENT_TYPES = [
    {
        key: "consultation",
        label: "Зустріч",
        defaultLegend: "Очна консультація з косметологом.",
        defaultColor: "rgba(244,183,166,0.35)"
    },
    {
        key: "active",
        label: "Актив",
        defaultLegend: "Використання активного препарату згідно рекомендацій.",
        defaultColor: "rgba(251,230,186,0.4)"
    },
    {
        key: "procedure",
        label: "Процедура",
        defaultLegend: "Косметологічна процедура.",
        defaultColor: "rgba(244,183,166,0.35)"
    },
    {
        key: "support",
        label: "Підтримка",
        defaultLegend: "Період підтримуючого догляду.",
        defaultColor: "rgba(224,224,226,0.45)"
    },
    {
        key: "zero_therapy",
        label: "0-терапія",
        defaultLegend: "0-терапія (відновлення барʼєру / базовий догляд).",
        defaultColor: "rgba(245,233,227,0.55)"
    },
    {
        key: "body",
        label: "Тіло",
        defaultLegend: "Догляд за тілом.",
        defaultColor: "rgba(233,201,184,0.35)"
    },
    {
        key: "recovery",
        label: "Відновлення",
        defaultLegend: "Період відновлення.",
        defaultColor: "rgba(241,242,230,0.55)"
    }
];

const CALENDAR_COLORS = [
    {key: "c1", label: "Персиковий", value: "rgba(244,183,166,0.35)"},
    {key: "c2", label: "Ваніль", value: "rgba(251,230,186,0.4)"},
    {key: "c3", label: "Нейтральний", value: "rgba(224,224,226,0.45)"},
    {key: "c4", label: "Пудровий", value: "rgba(245,233,227,0.55)"},
    {key: "c5", label: "Бежевий", value: "rgba(233,201,184,0.35)"},
    {key: "c6", label: "Кремовий", value: "rgba(241,242,230,0.55)"}
];

// ===== CALENDAR STATE =====
const calendarState = {
    startDate: null,
    daysCount: CALENDAR_MAX_DAYS,
    createdAt: new Date(),
    events: []
};

// Expose constants to the global scope for existing HTML/JS to use
window.textColor = textColor;
window.backgroundColor = backgroundColor;
window.lineColor = lineColor;
window.logoUrl = logoUrl;
window.fontFiles = fontFiles;

window.CALENDAR_MAX_DAYS = CALENDAR_MAX_DAYS;
window.WEEK_START = WEEK_START;
window.EVENT_TYPES = EVENT_TYPES;
window.CALENDAR_COLORS = CALENDAR_COLORS;
window.calendarState = calendarState;

