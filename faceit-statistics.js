// ==UserScript==
// @name         FACEIT Statistics for Steam
// @namespace    http://tampermonkey.net/
// @homepage     https://github.com/raizano/FACEIT-Statistics/
// @version      1.4.2
// @description  Integrates Faceit statistics into the Steam profile
// @author       raizano
// @match        https://steamcommunity.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=faceit.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

class FaceitStats {
  API_SEARCH_URL = "https://api.faceit.com/search/v1/?limit=5&query=";
  API_PLAYER_URL = "https://open.faceit.com/data/v4/players/";
  FACEIT_TOKEN_API = "FACEIT_TOKEN_API"; 
  STYLES = `.faceit-stats {display: flex;flex-direction: column;margin-bottom: 10px;} .faceit-stats-header {font-size: 250%;font-weight: bold;} .faceit-stats-item {font-size: 16px;display: flex;align-items: center;} .faceit-stats-item span {margin-left: 5px;} .faceit-stats-icon {position: relative;top: 3px;} .faceit-stats-icon img {width: 28px;height: 28px;} .faceit-error {background-color: #ffe0e0;padding: 10px;margin-bottom: 10px;border: 1px solid #ff6666;border-radius: 8px;font-family: 'Arial', sans-serif;font-size: 14px;color: #ff3333;}`;

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

  addStyles() {
    const styleElement = document.createElement("style");
    styleElement.textContent = this.STYLES;
    document.head.appendChild(styleElement);
  }

  getSteamId() {
    const url = new URL(window.location.href);
    const steamId =
      document.querySelector('[name="abuseID"]').value ||
      url.pathname.replace(/^\/profiles\//, '') ||
      null;

    if (!steamId) console.error(this.Messages.steamIdError[this.getLocale()]);

    return steamId;
  }

  promisifiedGMRequest(options) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        ...options,
        onload: resolve,
        onerror: reject,
      });
    });
  }

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

  async searchFaceitAPI(steamId) {
    try {
      const resJson = await this.makeFaceitAPIRequest(
        this.API_SEARCH_URL + steamId,
        {}
      );
      const results = resJson.payload.players.results;

      if (results && results.length > 0) return results[0].guid;
    } catch (error) {
      throw new Error(`${this.Messages.faceitApiError[this.getLocale()]}: ${error.message}`);
    }

    throw new Error(this.Messages.playerNotFound[this.getLocale()]);
  }

  getSkillLevelIconPath(skillLevel) {
    const basePath =
      "https://raw.githubusercontent.com/raizano/FACEIT-Statistics/master/icons/";
    return `${basePath}${skillLevel}-level.svg` || null;
  }

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

  handleErrors(error) {
    const errorBlock = document.createElement("div");
    errorBlock.classList.add("faceit-error");

    if (error.message === this.Messages.playerNotFound[this.getLocale()]) {
      errorBlock.textContent = this.Messages.playerNotFound[this.getLocale()];
    } else {
      errorBlock.textContent = `Error: ${error.message}`;
    }

    document.querySelector('.responsive_status_info').appendChild(errorBlock);
  }

  getLocale() {
    const userLocale = navigator.language.toLowerCase();
    return userLocale.includes("ru") ? "ru" : "en";
  }
}

const faceitStats = new FaceitStats();
faceitStats.start();

