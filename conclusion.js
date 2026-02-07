// Module for generating and displaying the cosmetologist's conclusion (including PDF).
// TODO: move the jsPDF and form logic from the big file into this module.

// Подключение jsPDF через CDN
const script = document.createElement('script');
script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js";
document.head.appendChild(script);

const loadedFonts = {};

async function loadFontsToDoc(doc) {
    const fonts = [
        {name: "Montserrat-Regular", url: fontFiles.regular},
        {name: "Montserrat-Bold", url: fontFiles.bold},
        {name: "Montserrat-Italic", url: fontFiles.italic},
        {name: "Montserrat-BoldItalic", url: fontFiles.boldItalic},
        {name: "Montserrat-Light", url: fontFiles.light},
        {name: "Montserrat-LightItalic", url: fontFiles.lightItalic},
    ];

    for (const {name, url} of fonts) {
        if (!loadedFonts[name]) {
            const fontData = await fetch(url).then(r => r.arrayBuffer());
            const base64Font = arrayBufferToBase64(fontData);
            loadedFonts[name] = base64Font;
        }

        doc.addFileToVFS(`${name}.ttf`, loadedFonts[name]);
        doc.addFont(`${name}.ttf`, name, "normal");
    }
}

// async function generatePDF() {
//     const {jsPDF} = window.jspdf;
//     const doc = new jsPDF();
//
//     await loadFontsToDoc(doc);
//
//     // Данные из формы
//     const formData = getFormData();
//
//     // Генерация страниц
//     await generatePage1(doc, formData);
//     await generatePage2(doc, formData);
//     await generatePage3(doc, formData);
//
//     for (let i = 0; i < formData.products.length; i++) {
//         await generateProductsPage(doc, formData.products[i], i);
//     }
//
//     await generateProductsApplyingInstructionPage(doc);
//
//     await generateProcedureRecommendationsPage(doc, formData);
//
//     await generateNutritionRecommendationsPage(doc, formData);
//
//     await generateHabitsRecommendationsPage(doc, formData);
//
//     await generateFinalPage(doc, formData);
//
//     // Скачивание PDF
//     doc.save("cosmetologist_conclusion.pdf");
// }

// Завантаження фонового декоративного зображення (напівпрозоре) для сторінок PDF
async function loadDecorationBase64(url) {
    const imageBase64 = await fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));
    return await compressImage(imageBase64);
}

// Получение данных из формы
function getFormData() {
    const products = [];
    const blocks = document.querySelectorAll('.products-block');
    blocks.forEach((block, index) => {
        const product1Option = block.querySelector(`[name="products[${index}][product_1]"] option:checked`);
        const product2Option = block.querySelector(`[name="products[${index}][product_2]"] option:checked`);

        products.push({
            timeOfDay: block.querySelector(`[name="products[${index}][time_of_day]"]`).value || "Не вказано",
            careType: block.querySelector(`[name="products[${index}][care_type]"]`).value || "Не вказано",
            areProductsOptional: block.querySelector(`[name="products[${index}][areProductsOptional]"]`).checked,
            product1: {
                name: product1Option ? product1Option.textContent.split(" - ")[0] : "Не вказано",
                description: block.querySelector(`[name="products[${index}][product_1][description]"]`).value || "Опис відсутній",
                image: product1Option ? product1Option.dataset.imageUrl || "" : "",
                price: product1Option ? product1Option.dataset.price || "Ціна не вказана" : "Ціна не вказана",
            },
            product2: {
                name: product2Option ? product2Option.textContent.split(" - ")[0] : "Не вказано",
                description: block.querySelector(`[name="products[${index}][product_2][description]"]`).value || "Опис відсутній",
                image: product2Option ? product2Option.dataset.imageUrl || "" : "",
                price: product2Option ? product2Option.dataset.price || "Ціна не вказана" : "Ціна не вказана",
            },
            note: block.querySelector(`[name="products[${index}][note]"]`).value || "-",
        });
    });

    // Theory page (Page 2)
    const includeTheoryCheckbox = document.getElementById("includeTheoryPage");
    const includeTheoryPage = includeTheoryCheckbox ? includeTheoryCheckbox.checked : false;

    return {
        salonName: "CosMiKi Space",
        cosmetologyConclusionTitle: "Заключення косметолога",
        clientName: document.querySelector('[name="client_name"]').value || "Ім'я не вказано",
        complaints: document.querySelector('[name="client_complaints"]').value || "Скарги відсутні",
        skinStatus: document.querySelector('[name="skin_status"]').value || "Стан шкіри не вказано",
        tacticsTitle: "Тактика до підходу:",
        tactics: document.querySelector('[name="tactics"]').value || "Тактика не вказана",
        footerText: "@cosmetolog.mikhno",
        products: products,
        procedureRecommendations: document.querySelector('[name="procedure_recommendations"]')?.value || "",
        // Theory page (Page 2)
        includeTheoryPage: includeTheoryPage,
        theoryWhat: document.getElementById("theoryWhat")?.value || "",
        theoryTriggers: document.getElementById("theoryTriggers")?.value || "",
        theoryTactics: document.getElementById("theoryTactics")?.value || "",
        theoryDuration: document.getElementById("theoryDuration")?.value || "",
        // Plan page (Page 3)
        planIntroText: document.getElementById("planIntroText")?.value || "",
        planHomeCareIntroText: document.getElementById("planHomeCareIntroText")?.value || "",
        planHomeCareText: document.getElementById("planHomeCareText")?.value || "",
        planProceduresText: document.getElementById("planProceduresText")?.value || "",
        planTherapyText: document.getElementById("planTherapyText")?.value || "",
        // Active page (optional)
        includeActivePage: document.getElementById("includeActivePage")?.checked ?? false,
        activeBlock1: document.getElementById("activeBlock1")?.value || "",
        activeBlock2: document.getElementById("activeBlock2")?.value || "",
        activeBlock3: document.getElementById("activeBlock3")?.value || "",
        // Trigger pages (optional)
        includeTriggerStress: document.getElementById("includeTriggerStress")?.checked ?? false,
        includeTriggerPCOS: document.getElementById("includeTriggerPCOS")?.checked ?? false,
        includeTriggerMenstruation: document.getElementById("includeTriggerMenstruation")?.checked ?? false,
        includeTriggerFood: document.getElementById("includeTriggerFood")?.checked ?? false,
        includeTriggerGenetics: document.getElementById("includeTriggerGenetics")?.checked ?? false
    };
}

// Генерация первой страницы
async function generatePage1(doc, formData) {
    const {
        salonName,
        cosmetologyConclusionTitle,
        clientName,
        complaints,
        skinStatus,
        tacticsTitle,
        tactics,
        footerText,
    } = formData;

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F"); // Заливаем фон

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, 20, {align: "center"});

    // Загружаем логотип
    const logoImage = await fetch(logoUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    // Добавляем логотип под текст
    const logoWidth = 100;
    const logoHeight = 100;
    const logoX = (doc.internal.pageSize.getWidth() - logoWidth) / 2; // По центру
    const logoY = doc.internal.pageSize.getHeight() - logoHeight - 20;

    const compressedBase64 = await compressImage(logoImage);

    doc.addImage(compressedBase64, "PNG", logoX, logoY, logoWidth, logoHeight);

    // Заголовок "Заключення косметолога"
    let currentX = doc.internal.pageSize.getWidth() / 2
    let currentY = doc.internal.pageSize.getHeight() / 2 - 80

    doc.setFont("Montserrat-Bold"); // Жирный
    doc.setFontSize(25);
    doc.text(cosmetologyConclusionTitle, currentX, currentY, {align: "center"});

    // Основной текст
    currentX = 20;
    currentY += doc.getTextDimensions(cosmetologyConclusionTitle, {maxWidth: doc.internal.pageSize.getWidth() - 40}).h + 10;

    // І'мя кліента
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(15);
    doc.text("Ім'я клієнта:", currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);
    currentY += 7;
    doc.text(`${clientName}`, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(clientName, {maxWidth: doc.internal.pageSize.getWidth() - 40}).h + 10;

    // Скарги
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(15);
    doc.text("Скарги:", currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);
    currentY += 7;
    doc.text(`${complaints}`, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(complaints, {maxWidth: doc.internal.pageSize.getWidth() - 40}).h + 10;

    // Стан шкіри (діагноз)
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(15);
    doc.text("Стан шкіри (діагноз):", currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);
    currentY += 7;
    doc.text(`${skinStatus}`, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(skinStatus, {maxWidth: doc.internal.pageSize.getWidth() - 40}).h + 10;

    // Тактика до підходу
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(15);
    doc.text(`${tacticsTitle}`, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);
    currentY += 7;
    doc.text(`${tactics}`, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    // Разделительная линия перед футером
    doc.setDrawColor(lineColor); // Устанавливаем цвет #9F7662 коричневый
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);

    // Футер
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(`${footerText}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация второй страницы (Теоретична частина)
async function generatePage2(doc, formData) {
    const {
        salonName,
        theoryWhat,
        theoryTriggers,
        theoryTactics,
        theoryDuration,
        footerText
    } = formData;

    doc.addPage();

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    // Координаты и размеры изображения
    const imageUrl = "https://static.wixstatic.com/media/78e720_8d2b3ddffa5b432497cee0b152aab3f5~mv2.png";
    const imageWidth = 150;
    const imageHeight = 150;
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2;
    const imageY = (doc.internal.pageSize.getHeight() - imageHeight) - 10;

    // Загрузка изображения
    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);
    doc.addImage(compressedBase64, "PNG", imageX, imageY, imageWidth, imageHeight);

    // Единая ширина для текста
    const maxW = doc.internal.pageSize.getWidth() - 40;
    const sectionGap = 11; // Вертикальный отступ между секциями (+3мм)
    const titleToTextGap = 8; // Отступ между заголовком секции и текстом (+2мм)

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, 20, {align: "center"});

    let currentX = 20;
    let currentY = 35;

    // Заголовок страницы (фиксированный)
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Що відбувається з твоєю шкірою?", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 14;
    // Секция 1: Основной текст (БЕЗ подзаголовка — он уже в главном заголовке страницы)
    if (theoryWhat && theoryWhat.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13); 
        doc.text(theoryWhat, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(theoryWhat, {maxWidth: maxW}).h + sectionGap;
    }

    // Секция 2: Тригери
    if (theoryTriggers && theoryTriggers.trim()) {
        doc.setFont("Montserrat-Bold");
        doc.setFontSize(13);
        doc.text("Тригери, які впливають на стан шкіри:", currentX, currentY);
        currentY += titleToTextGap;

        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(theoryTriggers, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(theoryTriggers, {maxWidth: maxW}).h + sectionGap;
    }

    // Секция 3: Тактика
    if (theoryTactics && theoryTactics.trim()) {
        doc.setFont("Montserrat-Bold");
        doc.setFontSize(13);
        doc.text("Тактика підходу до шкіри:", currentX, currentY);
        currentY += titleToTextGap;

        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(theoryTactics, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(theoryTactics, {maxWidth: maxW}).h + sectionGap;
    }

    // Секция 4: Тривалість лікування
    if (theoryDuration && theoryDuration.trim()) {
        doc.setFont("Montserrat-Bold");
        doc.setFontSize(13);
        doc.text("Тривалість лікування:", currentX, currentY);
        currentY += titleToTextGap;

        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(theoryDuration, currentX, currentY, {maxWidth: maxW});
    }

    // Футер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация третьей страницы
// Генерация страницы 3 — "Шлях до чистої та здорової шкіри"
async function generatePage3(doc, formData) {
    const {
        salonName,
        planIntroText,
        planHomeCareIntroText,
        planHomeCareText,
        planProceduresText,
        planTherapyText,
        footerText
    } = formData;

    doc.addPage();

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    // Фоновое изображение
    const imageUrl = "https://static.wixstatic.com/media/78e720_8d2b3ddffa5b432497cee0b152aab3f5~mv2.png";
    const imageWidth = 150;
    const imageHeight = 150;
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2;
    const imageY = (doc.internal.pageSize.getHeight() - imageHeight) - 10;

    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);
    doc.addImage(compressedBase64, "PNG", imageX, imageY, imageWidth, imageHeight);

    // Единая ширина для текста
    const maxW = doc.internal.pageSize.getWidth() - 40;
    const sectionGap = 11; // Вертикальный отступ между секциями (как на стр. 2)
    const titleToTextGap = 8; // Отступ между заголовком секции и текстом (как на стр. 2)

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, 20, {align: "center"});

    let currentX = 20;
    let currentY = 35;

    // Главный заголовок страницы (статический)
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Як буде виглядати шлях до чистої та здорової шкіри?", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 14;

    // === Вступний текст (без підзаголовка, одразу після заголовка сторінки) ===
    if (planIntroText && planIntroText.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(planIntroText, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(planIntroText, {maxWidth: maxW}).h + sectionGap;
    }

    // === Секция 1: Домашній догляд (текст из формы) ===
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Домашній догляд", currentX, currentY);
    currentY += titleToTextGap;

    if (planHomeCareIntroText && planHomeCareIntroText.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(planHomeCareIntroText, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(planHomeCareIntroText, {maxWidth: maxW}).h + sectionGap;
    }

    // === Секция 2: Яким буде твій догляд? (текст из формы) ===
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Яким буде твій догляд?", currentX, currentY);
    currentY += titleToTextGap;

    if (planHomeCareText && planHomeCareText.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(planHomeCareText, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(planHomeCareText, {maxWidth: maxW}).h + sectionGap;
    }

    // === Секция 3: Процедури, які посилять результат (текст из формы) ===
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Процедури, які посилять результат", currentX, currentY);
    currentY += titleToTextGap;

    if (planProceduresText && planProceduresText.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(planProceduresText, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(planProceduresText, {maxWidth: maxW}).h + sectionGap;
    }

    // === Секция 4: План терапії та повторна консультація (текст из формы) ===
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("План терапії та повторна консультація", currentX, currentY);
    currentY += titleToTextGap;

    if (planTherapyText && planTherapyText.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(planTherapyText, currentX, currentY, {maxWidth: maxW});
    }

    // Футер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация опціональної сторінки «Актив»
async function generateActivePage(doc, formData) {
    const {salonName, activeBlock1, activeBlock2, activeBlock3, footerText} = formData;

    doc.addPage();

    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Напівпрозоре фонове зображення (внизу по центру)
    const pwActive = doc.internal.pageSize.getWidth(), phActive = doc.internal.pageSize.getHeight();
    const decoActiveW = 150, decoActiveH = 150;
    const decoActive = await loadDecorationBase64(backgroundDecorationUrl);
    doc.addImage(decoActive, "PNG", (pwActive - decoActiveW) / 2, phActive - decoActiveH - 10, decoActiveW, decoActiveH);

    doc.setTextColor(textColor);

    const maxW = doc.internal.pageSize.getWidth() - 40;
    const sectionGap = 11;   // як на стор. 2 та 3
    const titleToTextGap = 8; // відступ між підзаголовком і текстом

    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, 20, {align: "center"});

    let currentX = 20;
    let currentY = 35;

    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Актив", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 14;

    // Секція 1: Декілька деталей про запропонований актив
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Декілька деталей про запропонований актив", currentX, currentY);
    currentY += titleToTextGap;
    if (activeBlock1 && activeBlock1.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(activeBlock1, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(activeBlock1, {maxWidth: maxW}).h + sectionGap;
    }

    // Секція 2: Правила використання
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Правила використання", currentX, currentY);
    currentY += titleToTextGap;
    if (activeBlock2 && activeBlock2.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(activeBlock2, currentX, currentY, {maxWidth: maxW});
        currentY += doc.getTextDimensions(activeBlock2, {maxWidth: maxW}).h + sectionGap;
    }

    // Секція 3: Можливі реакції
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text("Можливі реакції", currentX, currentY);
    currentY += titleToTextGap;
    if (activeBlock3 && activeBlock3.trim()) {
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(13);
        doc.text(activeBlock3, currentX, currentY, {maxWidth: maxW});
    }

    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Компактна верстка для сторінок тригерів: 1 тема = 1 сторінка (з safety net — перенос при переповненні)
function drawTriggerPageHeader(doc, salonName, decorationBase64) {
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
    if (decorationBase64) {
        const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
        const w = 150, h = 150;
        doc.addImage(decorationBase64, "PNG", (pw - w) / 2, ph - h - 10, w, h);
    }
    doc.setTextColor(textColor);
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, 20, {align: "center"});
}

function drawTriggerPageFooter(doc, footerText) {
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

function generateTriggerPage(doc, triggerPage, formData) {
    const {salonName, footerText} = formData;
    const {pageTitle, sections} = triggerPage;
    const maxW = doc.internal.pageSize.getWidth() - 40;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxY = pageHeight - 25;
    // Стиль як на стор. 2 та 3: більший шрифт, більші відступи
    const sectionGap = 11;
    const titleToTextGap = 8;
    const bodyFontSize = 13;
    const titleFontSize = 13;
    const lineHeight = 6;

    doc.addPage();
    drawTriggerPageHeader(doc, salonName);
    let currentX = 20;
    let currentY = 35;

    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text(pageTitle, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center", maxWidth: maxW});
    currentY += doc.getTextDimensions(pageTitle, {maxWidth: maxW}).h + 14;

    for (let i = 0; i < sections.length; i++) {
        const {title, body} = sections[i];
        if (!body || !body.trim()) continue;

        if (title && title.trim()) {
            if (currentY + 8 > maxY) {
                drawTriggerPageFooter(doc, footerText);
                doc.addPage();
                drawTriggerPageHeader(doc, salonName, decorationBase64);
                currentY = 35;
            }
            doc.setFont("Montserrat-Bold");
            doc.setFontSize(titleFontSize);
            doc.text(title, currentX, currentY, {maxWidth: maxW});
            currentY += titleToTextGap;
        }

        doc.setFont("Montserrat-Regular");
        doc.setFontSize(bodyFontSize);
        const lines = doc.splitTextToSize(body, maxW);
        for (let L = 0; L < lines.length; L++) {
            if (currentY + lineHeight > maxY) {
                drawTriggerPageFooter(doc, footerText);
                doc.addPage();
                drawTriggerPageHeader(doc, salonName);
                currentY = 35;
            }
            doc.text(lines[L], currentX, currentY);
            currentY += lineHeight;
        }
        currentY += sectionGap;
    }

    drawTriggerPageFooter(doc, footerText);
}

// Генерация страницы с препаратами для ухода
async function generateProductsPage(doc, product, index) {
    const {salonName, footerText} = getFormData();
    const {timeOfDay, careType, product1, product2, note, areProductsOptional} = product;

    doc.addPage();

    // Устанавливаем фон
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    let currentY = 20;

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Рекомендовані засоби по догляду за шкірою", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(16);
    const careTypeText = areProductsOptional ? `${careType} (засіб на вибір)` : careType;
    doc.text(timeOfDay, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 10;
    doc.text(careTypeText, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    const productWidth = doc.internal.pageSize.getWidth() / 2 - 40; // Половина страницы
    const productHeight = 80; // Высота блока продукта
    const productPadding = 10; // Отступ внутри блока

    function drawJustifiedText(doc, text, x, y, maxWidth, lineHeight) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = words[0];

        // Разделение текста на строки с учетом maxWidth
        for (let i = 1; i < words.length; i++) {
            const word = words[i];
            const width = doc.getTextWidth(currentLine + ' ' + word);
            if (width < maxWidth) {
                currentLine += ' ' + word;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        lines.push(currentLine); // Добавляем последнюю строку

        // Рисуем каждую строку
        lines.forEach((line, index) => {
            if (index === lines.length - 1) {
                // Последняя строка — обычное выравнивание по левому краю
                doc.text(line, x, y + index * lineHeight);
            } else {
                // Выравнивание по ширине
                const wordsInLine = line.split(' ');
                const totalSpaces = wordsInLine.length - 1;
                if (totalSpaces > 0) {
                    const baseWidth = doc.getTextWidth(line.replace(/ /g, ''));
                    const spaceWidth = (maxWidth - baseWidth) / totalSpaces;

                    let currentX = x;
                    wordsInLine.forEach((word, wordIndex) => {
                        doc.text(word, currentX, y + index * lineHeight);
                        if (wordIndex < totalSpaces) {
                            currentX += doc.getTextWidth(word) + spaceWidth;
                        }
                    });
                } else {
                    // Если только одно слово, рисуем как есть
                    doc.text(line, x, y + index * lineHeight);
                }
            }
        });
    }

    const drawProduct = async (x, y, product) => {

        // Изображение
        if (product.image) {
            const img = await loadImage(product.imageUrl ?? product.image);

            const compressedBase64 = await compressImage(img);

            doc.addImage(compressedBase64, "PNG", x + productPadding, y, 50, 80);
        }

        // Название
        doc.setFont("Montserrat-Bold");
        doc.setFontSize(12);
        const centerX = x + productWidth / 2;
        doc.text(product.name, centerX, y + productHeight + 10, {align: "center"});

        // Цена
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(12);
        doc.text(`Вартість: ${product.price}.`, centerX, y + productHeight + 25, {align: "center"});

        // Описание (выравнивание по ширине)
        const descriptionX = x - productPadding;
        const descriptionY = y + productHeight + 40;
        const maxWidth = productWidth + 2 * productPadding;
        const lineHeight = 5; // Высота строки
        doc.setFont("Montserrat-Light");
        doc.setFontSize(12);
        drawJustifiedText(doc, product.description, descriptionX, descriptionY, maxWidth, lineHeight);
    };

    currentY += 15;

    // Отрисовка продуктов
    await drawProduct(20, currentY, product1);
    await drawProduct(doc.internal.pageSize.getWidth() / 2 + 20, currentY, product2);

    // Добавляем вертикальную линию между продуктами
    const centerX = doc.internal.pageSize.getWidth() / 2;
    doc.setDrawColor(lineColor);
    doc.line(centerX, currentY, centerX, currentY + productHeight + 55);

    // Добавляем горизонтальную линию после продуктов
    const lineY = currentY + productHeight + 70;
    doc.line(20, lineY, doc.internal.pageSize.getWidth() - 20, lineY);

    // Примітка
    currentY = lineY + 20;
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(16);
    doc.text("Примітка:", 20, currentY);

    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text(note, 20, currentY + 10, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    // Футтер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация страницы с инструкцией по нанесению средств
async function generateProductsApplyingInstructionPage(doc) {
    const {
        salonName,
        footerText
    } = getFormData(); // Используем уже существующую функцию для получения хедера и футтера

    doc.addPage();

    // Устанавливаем цвет фона
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    let currentY = 20;

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Як наносити засоби по догляду?", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Текст с информацией
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);
    const infoText = `Основою догляду являються самі засоби та техніка їх нанесення, про яку зараз поговоримо:

Будь який засіб варто наносити по масажним лініям, починаючи з підборіддя поступово підіймаючись до лобу (схематично зображена техніка нанесення засобів)

Не забувай про зону шиї, вона також потребує догляду.`;
    doc.text(infoText, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(infoText).h + 10;

    currentY += 50;

    // Изображение
    const imageUrl = "https://static.wixstatic.com/media/78e720_83d543de538c41f08c90cf6cbcd43960~mv2.png";
    const imageWidth = 127;
    const imageHeight = 140;
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2;

    // Загрузка изображения
    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);

    doc.addImage(compressedBase64, "PNG", imageX, currentY, imageWidth, imageHeight);

    currentY += imageHeight + 8;

    // Подпись под изображением
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text("Масажні лінії", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    // Футтер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация страницы с рекомендациями по процедурам
async function generateProcedureRecommendationsPage(doc, formData) {
    const {
        salonName,
        footerText,
        procedureRecommendations
    } = formData;

    // Добавляем новую страницу
    doc.addPage();

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    let currentX = 20
    let currentY = 20;

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Процедури, які допоможуть швидше отримати результат", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Первый абзац
    const paragraph1 = "Як впливають косметологічні процедури на стан шкіри? Процедури - це активний догляд за поверхнею шкіри, вони не несуть лікувальний вплив, але допомагають естетично покращити стан обличчя та пришвидшити омріяний результат.";
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text(paragraph1, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(paragraph1).h + 25;

    // Второй абзац
    const paragraph2 = "Процедури, які підійдуть саме для твоєї шкіри:";
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(12);
    doc.text(paragraph2, currentX, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(paragraph2).h + 5;

    // Третий абзац: текст из формы
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text(procedureRecommendations || "Рекомендації відсутні", 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(procedureRecommendations || "Рекомендації відсутні").h + 20;

    // Координаты и размеры изображения
    const imageUrl = "https://static.wixstatic.com/media/78e720_61d546f7cd554cc49cdcd8b232c1ef60~mv2.png"; // 30% opacity
    const imageWidth = 120; // Ширина изображения
    const imageHeight = 108; // Высота изображения
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2;
    const imageY = (doc.internal.pageSize.getHeight() - imageHeight) - 30;

    // Загрузка изображения
    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);

    // Добавляем изображение
    doc.addImage(compressedBase64, "PNG", imageX, imageY, imageWidth, imageHeight);

    // Футтер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация страницы с рекомендациями по питанию
async function generateNutritionRecommendationsPage(doc, formData) {
    const {
        salonName,
        footerText
    } = getFormData(); // Получаем данные для хедера и футера

    doc.addPage();

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F"); // Заливаем фон

    // Изображение
    const imageUrl = "https://static.wixstatic.com/media/78e720_8befe30b380d4b02beae65c8f3dcb905~mv2.png"; // 30% opacity
    const imageWidth = 93;
    const imageHeight = 90;
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2; // Центрируем по горизонтали
    const imageY = (doc.internal.pageSize.getHeight() - imageHeight) - 30; // Центрируем по вертикали

    // Загрузка изображения
    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);

    // Добавляем изображение
    doc.addImage(compressedBase64, "PNG", imageX, imageY, imageWidth, imageHeight);

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    let currentY = 20;

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Вплив їжі на стан шкіри", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Абзац 1
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    const paragraph1 = "Не існує єдиної думки, яка б дала чітку, гарантовану відповідь на питання як впливає їжа на стан шкіри, все дуже індивідуально та залежить від багатьох факторів, але є певні доказові моменти, які допоможуть підтримати шкіру та організм вцілому:";
    doc.text(paragraph1, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(paragraph1).h + 15;

    // Абзац 2 (список)
    const paragraph2 = `
- має бути 2-3 повноцінних прийому їжі, бажано в один і той же час;

- молочні та кисломолочні продукти - обмежити (дозволяється до 3-х чашок кави на звичайному молоці на день);

- промислові солодощі та глютен - мінімізуємо (дозволяється після основного прийому їжі);

- обмежуй вживання: соуси, консерви, фастфуд, їжу з кірочками (більше тушіння замість жарки);

- намагайся дотримуватися правила: 40% свіжі сирі овочі на тарілці;

- вживати достатню кількість води - 1,2/2 літри.`;

    doc.text(paragraph2, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    currentY += doc.getTextDimensions(paragraph2).h + 80;

    // Подзаголовок
    const subtitle = "Вплив певних продуктів на шкіру:";
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(14);
    doc.text(subtitle, 20, currentY);

    currentY += doc.getTextDimensions(subtitle).h;

    // Абзац 3 (список)
    const paragraph3 = `
- квашена капуста (без цукру) - покращує мікробом шкіри, додавати до раціону 2-3 рази на тиждень;

- лактоза - не впливає на шкіру, але фермент лактоза - може (цей фермент є і в безлактозному молоці) якщо помічаєш вплив молока на шкіру - прибирай повністю;

- банани та виноград мають високий глікемічний індекс тому, бажано ці продукти мінімізувати.`;

    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text(paragraph3, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});

    // Футтер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация страницы с рекомендациями по привычкам
async function generateHabitsRecommendationsPage(doc) {
    const {salonName, footerText} = getFormData();

    doc.addPage();

    // Устанавливаем цвет фона страницы
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F"); // Заливаем фон

    // Устанавливаем цвет текста
    doc.setTextColor(textColor);

    let currentY = 20;

    // Хеддер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Змінити якість шкіри = змінити якість життя", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Подзаголовок
    const subtitle2 = "Певні звички, які впливають на шкіру:";
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(14);
    doc.text(subtitle2, 20, currentY);

    currentY += doc.getTextDimensions(subtitle2).h + 5;


    // Второй абзац (список)
    const habitsList = `- постільна білизна - змінювати раз на тиждень, наволочка - змінювати кожні 3-4 дні;

- якісно очищай шкіру після макіяжу - не спати з декоративною косметикою;

- дотримуйся 6-8 год. сну;

- не дави та не здирай висипи - це може призвести до пост акне плям та рубців;

- тяжко в наших реаліях не стресувати, але стрес ключовий фактор до висипів. Старайся досліджувати себе та знаходити методи, які заспокоюють;

- спорт - силові тренування призводять до підвищення тестостерону, який згодом може погіршувати стан шкіри, обирай для себе легкий вид спорту: йога, пілатес;

- якщо немає потреби, раз на рік проходь огляд у гінеколога з діагностикою УЗД - жіноче здоров'я - головне.`;
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(14);

    doc.text(habitsList, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 40});
    currentY += doc.getTextDimensions(habitsList, {maxWidth: doc.internal.pageSize.getWidth() - 40}).h + 5;

    // Добавление изображения
    const imageUrl = "https://static.wixstatic.com/media/78e720_4b1646fd5ed845be8804c70448b06129~mv2.png";
    const imageWidth = 115; // Ширина изображения
    const imageHeight = 90; // Высота изображения
    const imageX = (doc.internal.pageSize.getWidth() - imageWidth) / 2; // Центрируем по горизонтали
    const imageY = (doc.internal.pageSize.getHeight() - imageHeight) - 30; // Центрируем по вертикали

    const imageBase64 = await fetch(imageUrl)
        .then(response => response.blob())
        .then(blob => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(blob);
        }));

    const compressedBase64 = await compressImage(imageBase64);

    doc.addImage(compressedBase64, "PNG", imageX, imageY, imageWidth, imageHeight);

    // Футтер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация страницы с информацией про телеграм бота
async function generateBotPage(doc) {
    const {salonName, footerText} = getFormData();

    doc.addPage();

    // Фон и текст
    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
    doc.setTextColor(textColor);

    let currentY = 20;

    // Хедер
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 15;

    // Заголовок
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(18);
    doc.text("Твій особистий помічник — Космікі бот", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 10;

    // Знайомство
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    const introText = "Цей Телеграм-бот допоможе перевірити косметичну продукцію на наявність комедогенних компонентів. " +
        "Просто встав склад декоративного засобу в тому вигляді, в якому він зазначений на упаковці, баночці або на сайті — і миттєво отримай детальний аналіз!";
    doc.text(introText, 20, currentY, {maxWidth: doc.internal.pageSize.getWidth() - 35});
    currentY += doc.getTextDimensions(introText).h + 25;

    // Як це виглядає
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(14);
    doc.text("Як це виглядає:", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 5;

    // Два скриншота (по центру)
    const screenshotUrls = [
        "https://static.wixstatic.com/media/78e720_bec15b39634b497c810419435a754d65~mv2.jpg",
        "https://static.wixstatic.com/media/78e720_bec1dd8514f643339abd69fc7cad80db~mv2.jpg"
    ];
    const imgWidth = 55;
    const imgHeight = 110;
    const spacing = 20;
    const totalWidth = imgWidth * 2 + spacing;
    const imgStartX = (doc.internal.pageSize.getWidth() - totalWidth) / 2;

    for (let i = 0; i < screenshotUrls.length; i++) {
        const base64 = await fetch(screenshotUrls[i])
            .then(res => res.blob())
            .then(blob => new Promise(resolve => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            }));

        const compressedBase64 = await compressImage(base64);

        doc.addImage(compressedBase64, "PNG", imgStartX + i * (imgWidth + spacing), currentY, imgWidth, imgHeight);
    }

    currentY += imgHeight + 15;

    // Як придбати
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(14);
    doc.text("Як придбати перевірки?", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 8;

    // Подводка
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(12);
    doc.text("Напиши нам у Instagram або Telegram:", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 8;

    // Ссылки в одну строку
    doc.setFontSize(12);
    doc.setTextColor("#0000EE");

    const instaLabel = "@cosmetolog.mikhno (Instagram)";
    const tgLabel = "@cosmetologmikhno (Telegram)";

    // Расчёт центра
    const totalTextWidth = doc.getTextWidth(instaLabel + "   |   " + tgLabel);
    const startX = (doc.internal.pageSize.getWidth() - totalTextWidth) / 2;

    // Первая ссылка
    doc.textWithLink(instaLabel, startX, currentY, {url: "https://instagram.com/cosmetolog.mikhno"});

    // Разделитель
    const middleX = startX + doc.getTextWidth(instaLabel + "   ");
    doc.setTextColor(textColor); // временно — обычный цвет
    doc.text("|", middleX, currentY);

    // Вторая ссылка
    doc.setTextColor("#0000EE");
    const tgX = middleX + doc.getTextWidth("   ");
    doc.textWithLink(tgLabel, tgX, currentY, {url: "https://t.me/cosmetologmikhno"});

    doc.setTextColor(textColor); // вернуть обычный цвет
    currentY += 15;


    // Вартість (з заголовком)
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(14);
    doc.text("Вартість перевірок:", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});
    currentY += 5;

    const prices = [
        {text: "5 перевірок", price: "50 грн"},
        {text: "20 перевірок", price: "100 грн"},
        {text: "50 перевірок", price: "200 грн"},
        {text: "100 перевірок", price: "300 грн"}
    ];

    const cardWidth = 35;
    const cardHeight = 20;
    const cardSpacing = 10;
    const totalCardWidth = prices.length * cardWidth + (prices.length - 1) * cardSpacing;
    let cardX = (doc.internal.pageSize.getWidth() - totalCardWidth) / 2;

    prices.forEach(({text, price}) => {
        // Карточка
        doc.setDrawColor("#F09166");
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 3, 3, "FD");

        // Текст
        doc.setFont("Montserrat-Regular");
        doc.setFontSize(10);
        doc.text(text, cardX + cardWidth / 2, currentY + 8, {align: "center"});
        doc.setFont("Montserrat-Bold");
        doc.text(price, cardX + cardWidth / 2, currentY + 15, {align: "center"});

        cardX += cardWidth + cardSpacing;
    });

    currentY += cardHeight + 10;

    // Завершение
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(11);
    doc.text("З ботом ти завжди знаєш, що наносиш на шкіру", doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    // Футер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Генерация финальной страницы (завжди додається, без полів у формі; динамічно лише clientName)
async function generateFinalPage(doc, formData) {
    const {salonName, clientName, footerText} = formData;

    doc.addPage();

    doc.setFillColor(backgroundColor);
    doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");

    // Зображення-сердечко по центру сторінки (по горизонталі та вертикалі)
    const finalPageImageUrl = "https://static.wixstatic.com/media/78e720_6d45e2243d1f40c7be635c7b463fe672~mv2.png";
    const pwFinal = doc.internal.pageSize.getWidth(), phFinal = doc.internal.pageSize.getHeight();
    const decoFinalW = 75, decoFinalH = 75;
    const decoFinalX = (pwFinal - decoFinalW) / 2;
    const decoFinalY = (phFinal - decoFinalH) / 2;
    const decoFinalRaw = await loadDecorationBase64(finalPageImageUrl);
    const decoFinal = await applyImageOpacity(decoFinalRaw, 0.4);
    doc.addImage(decoFinal, "PNG", decoFinalX, decoFinalY, decoFinalW, decoFinalH);

    doc.setTextColor(textColor);

    const maxW = doc.internal.pageSize.getWidth() - 40;
    const currentX = 20;
    let currentY = 20;

    // Хеддер (відступ як на інших сторінках — 15)
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(15);
    doc.text(salonName, doc.internal.pageSize.getWidth() / 2, currentY, {align: "center"});

    currentY += 15;

    // Перший рядок жирним: "Офіційно дозволено тобі, {clientName}:"
    const firstLine = `Офіційно дозволено тобі, ${clientName}:`;
    doc.setFont("Montserrat-Bold");
    doc.setFontSize(13);
    doc.text(firstLine, currentX, currentY, {maxWidth: maxW});
    currentY += doc.getTextDimensions(firstLine, {maxWidth: maxW}).h + 8;

    // Список regular
    const listText = `- робити перший крок назустріч своїй шкірі без страху і сумнівів;
- дбати про себе щодня, навіть маленькими звичками;
- насолоджуватися процесом змін і помічати кожен прогрес.`;
    doc.setFont("Montserrat-Regular");
    doc.setFontSize(13);
    doc.text(listText, currentX, currentY, {maxWidth: maxW});
    currentY += doc.getTextDimensions(listText, {maxWidth: maxW}).h + 14;

    // Пам'ятай
    const rememberText = "Пам'ятай: цей шлях - про турботу і любов до себе, а правильний догляд стане твоїм надійним помічником.";
    doc.text(rememberText, currentX, currentY, {maxWidth: maxW});

    // Футер
    doc.setDrawColor(lineColor);
    doc.line(20, doc.internal.pageSize.getHeight() - 20, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 20);
    doc.setFont("Montserrat-Italic");
    doc.setFontSize(12);
    doc.text(footerText, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, {align: "center"});
}

// Download PDF file
async function downloadPDF() {
    const downloadButton = document.getElementById('download-pdf'); // Кнопка предпросмотра
    // console.log('downloadPDF test 666');
    // Блокируем кнопку и меняем текст
    downloadButton.disabled = true;
    downloadButton.textContent = "Зачекайте...";

    try {
        const {jsPDF} = window.jspdf;
        const doc = new jsPDF();

        await loadFontsToDoc(doc);

        // Сгенерировать PDF
        const formData = getFormData();

        // Генерация страниц
        await generatePage1(doc, formData);
        if (formData.includeTheoryPage) {
            await generatePage2(doc, formData);
        }
        await generatePage3(doc, formData);

        for (let i = 0; i < formData.products.length; i++) {
            await generateProductsPage(doc, formData.products[i], i);
        }

        if (formData.includeActivePage) {
            await generateActivePage(doc, formData);
        }

        const triggerIncludeKeys = {
            stress: "includeTriggerStress",
            pcos: "includeTriggerPCOS",
            menstruation: "includeTriggerMenstruation",
            food: "includeTriggerFood",
            genetics: "includeTriggerGenetics"
        };
        const triggerPagesList = window.TRIGGER_PAGES || [];
        for (let t = 0; t < triggerPagesList.length; t++) {
            const tp = triggerPagesList[t];
            if (formData[triggerIncludeKeys[tp.key]]) {
                await generateTriggerPage(doc, tp, formData);
            }
        }

        // Тимчасово вимкнено (не видаляти):
        // await generateProductsApplyingInstructionPage(doc);
        // await generateProcedureRecommendationsPage(doc, formData);
        // await generateNutritionRecommendationsPage(doc, formData);
        // await generateHabitsRecommendationsPage(doc, formData);
        await generateBotPage(doc)

        await generateFinalPage(doc, formData);

        const filenameInput = document.getElementById('filename-input'); // Поле имени файла
        let filename = filenameInput.value.trim();

        if (!filename) {
            const clientName = document.querySelector('[name="client_name"]').value || 'Клієнт';
            const today = new Date();
            const day = today.getDate().toString().padStart(2, '0');
            const month = (today.getMonth() + 1).toString().padStart(2, '0');
            const year = today.getFullYear();
            const hours = today.getHours().toString().padStart(2, '0');
            const minutes = today.getMinutes().toString().padStart(2, '0');
            filename = `${clientName}_${day}.${month}.${year}_${hours}-${minutes}`;
            filenameInput.value = filename
        }

        // Скачивание PDF
        doc.save(`${filename}.pdf`);

    } catch (error) {
        console.error("Error while generating PDF:", error);
        alert("Сталася помилка під час створення PDF. Спробуйте ще раз.");
    } finally {
        // Возвращаем кнопку в исходное состояние
        downloadButton.disabled = false;
        downloadButton.textContent = "Завантажити";
    }
}

// Expose for onclick handlers and for calendar PDF (loadFontsToDoc)
window.downloadPDF = downloadPDF;
window.loadFontsToDoc = loadFontsToDoc;

