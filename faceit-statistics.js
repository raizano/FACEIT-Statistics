// ==UserScript==
// @name         FACEIT Statistics for Steam
// @namespace    http://tampermonkey.net/
// @homepage     https://github.com/raizano/FACEIT-Statistics/
// @version      1.8.0
// @description  Интеграция статистики Faceit в профиль Steam
// @author       raizano
// @match        https://steamcommunity.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=faceit.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

/**
 * Класс, представляющий интеграцию статистики Faceit в профиль Steam.
 */
class FaceitStats {
    FACEIT_TOKEN_API = "FACEIT_TOKEN_API"; // Replace the value of the FACEIT_TOKEN_API
    API_SEARCH_URL = "https://api.faceit.com/search/v1/?limit=5&query=";
    API_PLAYER_URL = "https://open.faceit.com/data/v4/players/";
    STYLES = `
        .faceit-stats-grid {display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: center; justify-items: center;}
        .faceit-stats-container {background-color: #00000030; border: 1px solid #717171; border-radius: 8px; padding: 5px; margin-bottom: 20px;}
        .faceit-stats-header {display: flex; font-size: 31px; font-weight: bold; margin-bottom: 10px; justify-content: space-evenly;}
        .faceit-stats-column {display: flex; flex-direction: column; margin-bottom: 10px;}
        .faceit-stats-item {font-size: 16px; display: flex; align-items: center; margin-bottom: 5px; line-height: normal;}
        .faceit-stats-item span {margin-left: 5px;}
        .faceit-stats-icon {display: flex;}
        .faceit-error {background-color: #ffe0e0; padding: 10px; margin-bottom: 10px; border: 1px solid #ff6666; border-radius: 8px; font-family: 'Arial', sans-serif; font-size: 14px; color: #ff3333;}
    `;

    /**
     * Добавим объект Messages в начало класса
     */
    Messages = {
        playerNotFound: {
            en: "Player not found on Faceit",
            ru: "Игрок не найден на Faceit",
        },
        steamIdError: {
            en: "Error getting Steam ID from the page.",
            ru: "Ошибка получения Steam ID со страницы.",
        },
        faceitApiError: {
            en: "Error executing Faceit API request",
            ru: "Ошибка выполнения запроса к Faceit API",
        },
    };

    /**
     * Добавляет необходимые стили для статистики Faceit на страницу.
     */
    addStyles() {
        if (document.querySelector('#faceit-stats-styles')) {
            return;
        }

        const styleElement = document.createElement("style");
        styleElement.id = 'faceit-stats-styles';
        styleElement.textContent = this.STYLES;
        document.head.appendChild(styleElement);
    }

    /**
     * Получает Steam ID из текущего URL страницы.
     * @returns {string} Steam ID.
     */
    getSteamId() {
        const url = new URL(window.location.href);
        const steamId =
            document.querySelector('[name="abuseID"]').value ||
            url.pathname.replace(/^\/profiles\//, '') ||
            null;

        if (!steamId) {
            console.error(this.Messages.steamIdError[this.getLocale()]);
        }

        return steamId;
    }

    /**
     * Промисифицирует функцию GM.xmlHttpRequest.
     * @param {Object} options - Опции запроса.
     * @returns {Promise} Промис, разрешающийся ответом от API.
     */
    promisifiedGMRequest(options) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                ...options,
                onload: (response) => resolve(response),
                onerror: (error) => reject(error),
            });
        });
    }

    /**
    * Делает запрос к Faceit API с использованием GM_xmlhttpRequest.
    * @param {string} url - URL конечной точки API.
    * @param {Object} options - Опции запроса.
    * @returns {Promise} Промис, разрешающийся ответом от API.
    */
    async makeFaceitAPIRequest(url, options) {
        try {
            const response = await this.promisifiedGMRequest({
                method: options.method || "GET",
                url: url,
                headers: options.headers || {},
            });

            console.log(`API Response: ${response.responseText}`); // Логирование
            return JSON.parse(response.responseText);
        } catch (error) {
            console.error(`Error in makeFaceitAPIRequest: ${error.message}`);
            throw new Error(`${this.Messages.faceitApiError[this.getLocale()]}: ${error.message}`);
        }
    }

    /**
     * Ищет игрока Faceit по Steam ID.
     * @param {string} steamId - Steam ID игрока.
     * @returns {string} Faceit GUID игрока.
     * @throws {Error} Если игрок не найден.
     */
    async searchFaceitAPI(steamId) {
      try {
        const resJson = await this.makeFaceitAPIRequest(
          this.API_SEARCH_URL + steamId,
          {}
        );
        const results = resJson.payload.players.results;

        if (results && results.length > 0) {
          return results[0].guid;
        }
      } catch (error) {
        console.error(`Error in searchFaceitAPI: ${error.message}`);
        throw new Error(`${this.Messages.faceitApiError[this.getLocale()]}: ${error.message}`);
      }

      throw new Error(this.Messages.playerNotFound[this.getLocale()]);
    }

    /**
     * Получает путь к иконке уровня навыка на основе уровня.
     * @param {string} skillLevel - Уровень навыка.
     * @returns {string} Путь к иконке.
     */
    getSkillLevelIconPath(skillLevel) {
      const basePath =
        "https://raw.githubusercontent.com/raizano/FACEIT-Statistics/master/icons/";
      return `${basePath}${skillLevel}-level.svg` || null;
    }

   /**
 * Объединяет запросы к Faceit API для получения информации о пользователе и статистики CS:GO.
 * @param {string} guid - Faceit GUID игрока.
 * @returns {Object} Информация о пользователе и статистика CS:GO.
 */
async getPlayerInfo(guid) {
    try {
        const [userInfo, cs2Stats] = await Promise.all([
            this.makeFaceitAPIRequest(`${this.API_PLAYER_URL}${guid}`, { headers: { Authorization: `Bearer ${this.FACEIT_TOKEN_API}` } }),
            this.makeFaceitAPIRequest(`${this.API_PLAYER_URL}${guid}/stats/cs2`, { headers: { Authorization: `Bearer ${this.FACEIT_TOKEN_API}` } })
        ]);

        if (!userInfo.games?.cs2) {
            throw new Error(this.Messages.playerNotFound[this.getLocale()]);
        }

        return {
            cs2SkillLevel: userInfo.games.cs2.skill_level,
            cs2Elo: userInfo.games.cs2.faceit_elo,
            Matches: cs2Stats.lifetime.Matches,
            WinRate: cs2Stats.lifetime["Win Rate %"],
            AverageKillDeathRatio: cs2Stats.lifetime["Average K/D Ratio"],
            AverageHeadshots: cs2Stats.lifetime["Average Headshots %"]
        };
    } catch (error) {
        console.error(`Error in getPlayerInfo: ${error.message}`);
        throw new Error(this.Messages.playerNotFound[this.getLocale()]);
    }
}

/**
 * Создает DOM-элемент для элемента статистики.
 * @param {string} text - Текст элемента.
 * @param {string} iconSrc - Исходный URL иконки элемента.
 * @returns {HTMLElement} Созданный элемент.
 */
createStatsItem(text, iconSrc = null) {
    const statsItem = document.createElement("div");
    statsItem.classList.add("faceit-stats-item");

    const textContainer = document.createElement("span");
    textContainer.appendChild(document.createTextNode(text));

    if (iconSrc) {
        const iconContainer = document.createElement("span");
        iconContainer.classList.add("faceit-stats-icon");

        const iconImg = document.createElement("img");
        iconImg.src = iconSrc;
        iconImg.alt = text;
        iconImg.width = 28;
        iconImg.height = 28;

        iconContainer.appendChild(iconImg);
        statsItem.appendChild(textContainer);
        statsItem.appendChild(iconContainer);
    } else {
        statsItem.appendChild(textContainer);
    }

    return statsItem;
}

    /**
     * Создает блок статистики Faceit и добавляет его на страницу.
     * @param {string} cs2SkillLevel - Уровень навыка CS2.
     * @param {string} cs2Elo - Elo CS2.
     */
createStatsBlock(cs2SkillLevel, cs2Elo, matches, winRate, kdRatio, headshotsPercentage) {
    const statsContainer = document.createElement("div");
     statsContainer.classList.add("faceit-stats-container");
    // Заголовок: FACEIT Statistics
    const header = document.createElement("div");
    header.classList.add("faceit-stats-header");

    const faceText = document.createTextNode("FACE");
    const iElement = document.createElement("span");
    iElement.style.color = "orange";
    iElement.appendChild(document.createTextNode("I"));
    const tText = document.createTextNode("T Statistics");

    header.appendChild(faceText);
    header.appendChild(iElement);
    header.appendChild(tText);

    statsContainer.appendChild(header);

    // Блок статистики: CS2 Level, ELO, Matches, Win Rate, K/D Ratio, HS
    const statsBlock = document.createElement("div");
     statsBlock.classList.add("faceit-stats-grid"); // Добавлен класс faceit-stats-grid
    statsBlock.classList.add("faceit-stats");

    const column1 = document.createElement("div");
    column1.classList.add("faceit-stats-column");

    const skillLevelItem = this.createStatsItem(
        'CS2 Level:',
        this.getSkillLevelIconPath(cs2SkillLevel)
    );
    const eloItem = this.createStatsItem(`ELO: ${cs2Elo}`);
    const winRateItem = this.createStatsItem(`Win Rate: ${winRate}%`);
    const matchesItem = this.createStatsItem(`Matches: ${matches}`);

    column1.appendChild(skillLevelItem);
    column1.appendChild(winRateItem);
    column1.appendChild(matchesItem);

    const column2 = document.createElement("div");
    column2.classList.add("faceit-stats-column");

    const kdRatioItem = this.createStatsItem(`K/D: ${kdRatio}`);
    const headshotsItem = this.createStatsItem(`HS: ${headshotsPercentage}%`);

    column2.appendChild(eloItem);
    column2.appendChild(kdRatioItem);
    column2.appendChild(headshotsItem);

    statsBlock.appendChild(column1);
    statsBlock.appendChild(column2);

    statsContainer.appendChild(statsBlock);

    document.querySelector('.responsive_status_info').appendChild(statsContainer);
}


    /**
    * Инициирует интеграцию статистики Faceit.
    */
    async start() {
        try {
            this.addStyles();
            const steamId = this.getSteamId();
            const guid = await this.searchFaceitAPI(steamId);
            const playerInfo = await this.getPlayerInfo(guid);
            this.createStatsBlock(
                playerInfo.cs2SkillLevel,
                playerInfo.cs2Elo,
                playerInfo.Matches,
                playerInfo.WinRate,
                playerInfo.AverageKillDeathRatio,
                playerInfo.AverageHeadshots
            );
        } catch (error) {
            console.error(`Error in start: ${error.message}`);
            this.handleErrors(error);
        }
    }

    /**
     * Обрабатывает ошибки, отображая сообщение об ошибке на странице.
     * @param {Error} error - Объект ошибки.
     */
    handleErrors(error) {
      const errorBlock = document.createElement("div");
      errorBlock.classList.add("faceit-error");

      if (error.message === this.Messages.playerNotFound[this.getLocale()]) {
        errorBlock.textContent = this.Messages.playerNotFound[this.getLocale()];
      } else {
        errorBlock.textContent = `Ошибка: ${error.message}`;
      }

      document.querySelector('.responsive_status_info').appendChild(errorBlock);
    }

    /**
     * Получает локаль пользователя.
     * @returns {string} Локаль пользователя.
     */
    getLocale() {
        const userLocale = navigator.language.toLowerCase();
        return userLocale.includes("ru") ? "ru" : "en";
    }
}

const faceitStats = new FaceitStats();
faceitStats.start();
