// Entry point. All code that ran inside DOMContentLoaded in the monolith.
// Calendar: uses window.calendarState, window.createCalendarEvent, etc.

document.addEventListener("DOMContentLoaded", () => {

    const productsBlocksContainer = document.getElementById('products-blocks');
    const addBlockButton = document.getElementById('add-products-block');

    // Сохраняем товары локально для использования в динамических блоках
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
        console.error('Ошибка загрузки товаров:', err);
    });


    // Обработчик сообщений от родительского окна
    window.addEventListener('message', (event) => {
        if (event.data.type === 'updateProducts') {
            availableProducts = event.data.data; // Сохраняем полученные продукты
            populateAllProductSelectors(); // Заполняем все текущие селекторы
        }
    });

    // Отправляем сообщение о готовности iframe
    window.parent.postMessage({type: 'iframeReady'}, '*');

    // Функция для создания блока рекомендаций
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
            <textarea name="products[${index}][product_1][description]" class="form-textarea" rows="3" placeholder="Описание"></textarea>
        </label>
    </div>
    <div class="product-fieldset">
        <label class="form-label">
            Препарат 2:
            <select name="products[${index}][product_2]" class="form-select product-select"></select>
            <textarea name="products[${index}][product_2][description]" class="form-textarea" rows="3" placeholder="Описание"></textarea>
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


    // Функция для добавления блока
    addBlockButton.addEventListener('click', () => {
        const blockIndex = productsBlocksContainer.children.length;
        createProductsBlock(blockIndex);
    });

    // Функция для заполнения селекторов продуктов
    function populateProductSelectors(block) {
        const productSelectors = block.querySelectorAll('.product-select');

        productSelectors.forEach(selector => {
            selector.innerHTML = ''; // Очищаем старые опции

            // Добавляем товары в селектор
            availableProducts.forEach(product => {
                const option = document.createElement('option');
                option.value = product.id; // Уникальный ID продукта
                option.textContent = `${product.title} - ${product.price} грн`;
                option.dataset.imageUrl = product.imageUrl || "";
                option.dataset.price = product.price || "Цена не указана"; // Цена
                option.dataset.description = product.description || "Описание отсутствует"; // Описание
                selector.appendChild(option);
            });

            // Обработчик изменения значения в селекторе
            selector.addEventListener('change', async (event) => {
                const selectedOption = event.target.options[event.target.selectedIndex];
                const descriptionFieldName = `${selector.name}[description]`;

                let descriptionField = block.querySelector(`[name="${descriptionFieldName}"]`);
                descriptionField.value = selectedOption.dataset.description || "Описание отсутствует";
            });

            // Инициализируем значение описания для выбранного по умолчанию товара
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


    function sendHeightToParent() {
        const h = Math.max(
            document.body.scrollHeight,
            document.documentElement.scrollHeight
        );
        window.parent.postMessage({type: "COSMIKI_RESIZE", height: h}, "*");
    }

    function installAutoResize() {
        const ro = new ResizeObserver(() => {
            sendHeightToParent();
        });
        ro.observe(document.body);
        ro.observe(document.documentElement);
    }

    window.addEventListener("load", () => {
        sendHeightToParent();
        installAutoResize();
    });

});

