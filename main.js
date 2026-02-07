// Entry point. All code that ran inside DOMContentLoaded in the monolith.
// Calendar: uses window.calendarState, window.createCalendarEvent, etc.

document.addEventListener("DOMContentLoaded", () => {

    const productsBlocksContainer = document.getElementById('products-blocks');
    const addBlockButton = document.getElementById('add-products-block');

    // Зберігаємо товари локально для використання в динамічних блоках
    let availableProducts = [];

    // Загружаем список товаров с сервера, сохраняем и логируем результат
    fetch("https://cosmiki.space/_functions/products", {
        headers: {"x-api-key": "1Yqs69zJ0mrxv8c99dF2Gg4pG4b3JEss"},
    }).then(res => {
        if (!res.ok) throw new Error(`Network response was not ok: ${res.status}`);
        return res.json();
    }).then(data => {
        // API может вернуть объект { items: [...] } или сразу массив
        availableProducts = Array.isArray(data) ? data : (data.items ?? []);
        console.log('products response:', data);
        // console.log('availableProducts:', availableProducts);
        populateAllProductSelectors();
    }).catch(err => {
        console.error('Помилка завантаження товарів:', err);
    });


    // Функція для створення блоку рекомендацій
    function createProductsBlock(index) {
        const block = document.createElement('div');
        block.classList.add('products-block');
        block.dataset.index = index;

        block.innerHTML = `
    <div class="product-fieldset">
        <label class="form-label">
            Частина дня:
            <select name="products[${index}][time_of_day]" class="form-select" required>
                <option value="Ранкова рутина">Ранкова рутина</option>
                <option value="Денна рутина">Денна рутина</option>
                <option value="Вечірня рутина">Вечірня рутина</option>
                <option value="Перед сном">Перед сном</option>
            </select>
        </label>
        <label class="form-label">
            Тип догляду:
            <select name="products[${index}][care_type]" class="form-select" required>
                <option value="Очищення">Очищення</option>
                <option value="SPF - крем">SPF - крем</option>
                <option value="Демакіяж">Демакіяж</option>
                <option value="Активний догляд">Активний догляд</option>
            </select>
        </label>
          <label class="form-label checkbox-label">
            <input type="checkbox" name="products[${index}][areProductsOptional]" class="form-checkbox" checked>
            Засіб на вибір?
        </label>
    </div>
    <div class="product-fieldset">
        <label class="form-label">
            Препарат 1:
            <select name="products[${index}][product_1]" class="form-select product-select"></select>
            <textarea name="products[${index}][product_1][description]" class="form-textarea" rows="3" placeholder="Опис"></textarea>
        </label>
    </div>
    <div class="product-fieldset">
        <label class="form-label">
            Препарат 2:
            <select name="products[${index}][product_2]" class="form-select product-select"></select>
            <textarea name="products[${index}][product_2][description]" class="form-textarea" rows="3" placeholder="Опис"></textarea>
        </label>
    </div>
    <div class="product-fieldset">
        <label class="form-label">
            Примітка:
            <textarea name="products[${index}][note]" class="form-textarea" rows="3" placeholder="Примітка"></textarea>
        </label>
    </div>
    <button type="button" class="form-button remove-block">Видалити блок</button>
`;

        // Удаление блока
        block.querySelector('.remove-block').addEventListener('click', () => {
            block.remove();
        });

        // Добавляем блок в контейнер
        document.getElementById('products-blocks').appendChild(block);

        // Инициализируем селекторы с продуктами
        populateProductSelectors(block);
    }


    // Функція для додавання блоку
    addBlockButton.addEventListener('click', () => {
        const blockIndex = productsBlocksContainer.children.length;
        createProductsBlock(blockIndex);
    });

    // Функція для заповнення селекторів продуктів
    function populateProductSelectors(block) {
        const productSelectors = block.querySelectorAll('.product-select');

        productSelectors.forEach(selector => {
            selector.innerHTML = ''; // Очищаємо старі опції

            // Додаємо товари в селектор
            availableProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id; // унікальний ID продукту
                option.textContent = `${product.title} - ${product.price} грн`;
                option.dataset.imageUrl = product.imageUrl || "";
                option.dataset.price = product.price || "Ціна не вказана";
                option.dataset.description = product.description || "Опис відсутній";
                selector.appendChild(option);
            });

            // Обработчик изменения значения в селекторе
            selector.addEventListener('change', async (event) => {
                const selectedOption = event.target.options[event.target.selectedIndex];
                const descriptionFieldName = `${selector.name}[description]`;

                let descriptionField = block.querySelector(`[name="${descriptionFieldName}"]`);
                descriptionField.value = selectedOption.dataset.description || "Опис відсутній";
            });

            // Ініціалізуємо значення опису для обраного за замовчуванням товару
            if (selector.options.length > 0) {
                const event = new Event('change');
                selector.dispatchEvent(event);
            }
        });
    }


    // Функция для обновления всех текущих селекторов продуктов
    function populateAllProductSelectors() {
        const blocks = productsBlocksContainer.querySelectorAll('.products-block');
        blocks.forEach(populateProductSelectors);
    }

    // ===== Theory page (Page 2) toggle + preset =====
    const includeTheoryCheckbox = document.getElementById("includeTheoryPage");
    const theoryPresetSelect = document.getElementById("theoryPreset");
    const theoryPageSection = document.getElementById("theoryPageSection");

    const theoryWhatTextarea = document.getElementById("theoryWhat");
    const theoryTriggersTextarea = document.getElementById("theoryTriggers");
    const theoryTacticsTextarea = document.getElementById("theoryTactics");
    const theoryDurationTextarea = document.getElementById("theoryDuration");

    function toggleTheorySection() {
        const isEnabled = includeTheoryCheckbox?.checked;

        // Дизейбл/энейбл контейнера с textarea
        if (theoryPageSection) {
            if (isEnabled) {
                theoryPageSection.classList.remove("disabled");
            } else {
                theoryPageSection.classList.add("disabled");
            }
        }

        // Дизейбл/энейбл селектора діагнозу
        if (theoryPresetSelect) {
            theoryPresetSelect.disabled = !isEnabled;
        }
    }

    function onTheoryPresetChange() {
        const presetKey = theoryPresetSelect.value;

        // Если выбран "custom" или пустой — ничего не делать
        if (!presetKey || presetKey === "custom") return;

        const preset = window.THEORY_PAGE_PRESETS[presetKey];
        if (!preset) return;

        // Перевіряємо, чи є текст у полях
        const hasContent = [theoryWhatTextarea, theoryTriggersTextarea, theoryTacticsTextarea, theoryDurationTextarea]
            .some(ta => ta && ta.value.trim() !== "");

        if (hasContent) {
            const confirmed = confirm("Це перезапише поточні тексти. Продовжити?");
            if (!confirmed) {
                theoryPresetSelect.value = "custom";
                return;
            }
        }

        // Заповнюємо поля з шаблону
        if (theoryWhatTextarea) theoryWhatTextarea.value = preset.what || "";
        if (theoryTriggersTextarea) theoryTriggersTextarea.value = preset.triggers || "";
        if (theoryTacticsTextarea) theoryTacticsTextarea.value = preset.tactics || "";
        if (theoryDurationTextarea) theoryDurationTextarea.value = preset.duration || "";
    }

    if (includeTheoryCheckbox) {
        includeTheoryCheckbox.addEventListener("change", toggleTheorySection);
        toggleTheorySection(); // ініціалізація
    }

    if (theoryPresetSelect) {
        theoryPresetSelect.addEventListener("change", onTheoryPresetChange);
    }

    // ===== Active page (optional) toggle + preset =====
    const includeActiveCheckbox = document.getElementById("includeActivePage");
    const activePresetSelect = document.getElementById("activePreset");
    const activePageSection = document.getElementById("activePageSection");
    const activeBlock1El = document.getElementById("activeBlock1");
    const activeBlock2El = document.getElementById("activeBlock2");
    const activeBlock3El = document.getElementById("activeBlock3");

    function toggleActiveSection() {
        const isEnabled = includeActiveCheckbox?.checked;
        if (activePageSection) {
            if (isEnabled) {
                activePageSection.classList.remove("disabled");
            } else {
                activePageSection.classList.add("disabled");
            }
        }
        if (activePresetSelect) activePresetSelect.disabled = !isEnabled;
        [activeBlock1El, activeBlock2El, activeBlock3El].forEach(el => {
            if (el) el.disabled = !isEnabled;
        });
    }

    function onActivePresetChange() {
        const presetKey = activePresetSelect?.value;
        if (!presetKey || presetKey === "custom") return;
        const preset = window.ACTIVE_PAGE_PRESETS?.[presetKey];
        if (!preset) return;
        const hasContent = [activeBlock1El, activeBlock2El, activeBlock3El].some(ta => ta && ta.value.trim() !== "");
        if (hasContent) {
            const confirmed = confirm("Це перезапише поточні тексти. Продовжити?");
            if (!confirmed) {
                activePresetSelect.value = "";
                return;
            }
        }
        if (activeBlock1El) activeBlock1El.value = preset.block1 || "";
        if (activeBlock2El) activeBlock2El.value = preset.block2 || "";
        if (activeBlock3El) activeBlock3El.value = preset.block3 || "";
    }

    if (includeActiveCheckbox) {
        includeActiveCheckbox.addEventListener("change", toggleActiveSection);
        toggleActiveSection();
    }
    if (activePresetSelect) {
        activePresetSelect.addEventListener("change", onActivePresetChange);
    }

    // ===== Calendar init (preview only) =====
    const startDateInput = document.getElementById("calendar-start-date");
    const addConsultationBtn = document.getElementById("calendar-add-consultation");

    if (startDateInput && addConsultationBtn) {
        // старт по умолчанию = сегодня
        const todayIso = new Date().toISOString().split("T")[0];
        startDateInput.value = todayIso;
        window.calendarState.startDate = new Date(todayIso);

        startDateInput.addEventListener("change", () => {
            if (!startDateInput.value) return;
            window.calendarState.startDate = new Date(startDateInput.value);
            window.renderCalendarPreview();
        });

        addConsultationBtn.addEventListener("click", () => {
            if (!window.calendarState.startDate) return;

            // добавляем событие консультации на дату startDate
            const ev = window.createCalendarEvent({
                typeKey: "consultation",
                schedule: {kind: "single", date: new Date(window.calendarState.startDate)}
            });

            // удалим старую консультацию, если уже была
            window.calendarState.events = window.calendarState.events.filter(e => e.type !== "consultation");
            window.calendarState.events.push(ev);

            window.renderCalendarPreview();
            window.initCalendarEventUI();
            window.renderEventsList();
        });

        window.renderCalendarPreview();
        window.initCalendarEventUI();
        window.renderEventsList();

        window.initCalendarDateUI()
    }

    const downloadBtn = document.getElementById("calendar-download-pdf");
    if (downloadBtn) {
        downloadBtn.addEventListener("click", window.generateCalendarPDF);
    }

});

