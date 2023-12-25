// ==UserScript==
// @name         FACEIT Statistics for Steam
// @namespace    http://tampermonkey.net/
// @homepage     https://github.com/raizano/FACEIT-Statistics/
// @version      1.4.2
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
  API_SEARCH_URL = "https://api.faceit.com/search/v1/?limit=5&query=";
  API_PLAYER_URL = "https://open.faceit.com/data/v4/players/";
  FACEIT_TOKEN_API = "FACEIT_TOKEN_API"; 
  STYLES = `.faceit-stats {display: flex;flex-direction: column;margin-bottom: 10px;} .faceit-stats-header {font-size: 250%;font-weight: bold;} .faceit-stats-item {font-size: 16px;display: flex;align-items: center;} .faceit-stats-item span {margin-left: 5px;} .faceit-stats-icon {position: relative;top: 3px;} .faceit-stats-icon img {width: 28px;height: 28px;} .faceit-error {background-color: #ffe0e0;padding: 10px;margin-bottom: 10px;border: 1px solid #ff6666;border-radius: 8px;font-family: 'Arial', sans-serif;font-size: 14px;color: #ff3333;}`;

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
   * Промисифицирует функцию GM_xmlhttpRequest.
   * @param {Object} options - Опции запроса.
   * @returns {Promise} Промис, разрешающийся ответом от API.
   */
  promisifiedGMRequest(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
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

      return JSON.parse(response.responseText);
    } catch (error) {
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
   * Получает информацию о игроке Faceit.
   * @param {string} guid - Faceit GUID игрока.
   * @returns {Object} Информация о игроке, включая уровень навыка и Elo в CS2.
   * @throws {Error} Если игрок не найден.
   */
  async getPlayerInfo(guid) {
    try {
      const responseJson = await this.makeFaceitAPIRequest(
        this.API_PLAYER_URL + guid,
        {
          headers: {
            Authorization: `Bearer ${this.FACEIT_TOKEN_API}`,
          },
        }
      );

      if (!responseJson.games?.cs2) {
        throw new Error(this.Messages.playerNotFound[this.getLocale()]);
      }

      return {
        cs2SkillLevel: responseJson.games.cs2.skill_level,
        cs2Elo: responseJson.games.cs2.faceit_elo,
      };
    } catch (error) {
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

    if (iconSrc) {
      const iconContainer = document.createElement("span");
      iconContainer.classList.add("faceit-stats-icon");
      const iconImg = document.createElement("img");
      iconImg.src = iconSrc;
      iconImg.alt = text;
      iconImg.width = 28;
      iconImg.height = 28;
      iconContainer.appendChild(iconImg);
      textContainer.appendChild(document.createTextNode(text));
      statsItem.appendChild(textContainer);
      statsItem.appendChild(iconContainer);
    } else {
      textContainer.appendChild(document.createTextNode(text));
      statsItem.appendChild(textContainer);
    }

    return statsItem;
  }

  /**
   * Создает блок статистики Faceit и добавляет его на страницу.
   * @param {string} cs2SkillLevel - Уровень навыка CS2.
   * @param {string} cs2Elo - Elo CS2.
   */
  createStatsBlock(cs2SkillLevel, cs2Elo) {
    const statsBlock = document.createElement("div");
    statsBlock.classList.add("faceit-stats");

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

    statsBlock.appendChild(header);

    const skillLevelItem = this.createStatsItem(
      'CS2 Skill Level:',
      this.getSkillLevelIconPath(cs2SkillLevel)
    );
    const eloItem = this.createStatsItem(`CS2 Elo: ${cs2Elo}`);

    statsBlock.appendChild(skillLevelItem);
    statsBlock.appendChild(eloItem);

    document.querySelector('.responsive_status_info').appendChild(statsBlock);
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
      this.createStatsBlock(playerInfo.cs2SkillLevel, playerInfo.cs2Elo);
    } catch (error) {
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
