// ==UserScript==
// @name         FACEIT Statistics
// @namespace    http://tampermonkey.net/
// @homepage     https://github.com/raizano/FACEIT-Statistics/
// @version      2.0.0
// @description  FACEIT Statistics for Steam page
// @author       raizano
// @match        https://steamcommunity.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=faceit.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

class FaceitStatistics {
    constructor() {
        this.FACEIT_TOKEN_API = "FACEIT_TOKEN_API"; // Replace the value of the FACEIT_TOKEN_API
        this.API_SEARCH_URL = "https://api.faceit.com/search/v1/?limit=5&query=";
        this.API_PLAYER_URL = "https://open.faceit.com/data/v4/players/";

        this.STYLES = `.faceit-stats-container {background-color: #00000030; border: 1px solid #717171; border-radius: 8px; padding: 5px; margin-bottom: 20px;}
            .faceit-stats-header {display: flex; font-size: 31px; font-weight: bold; margin-bottom: 10px; justify-content: space-evenly;}
            .faceit-stats-grid {display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: center; justify-items: center;}
            .faceit-stats-column {display: flex; flex-direction: column; margin-bottom: 10px;}
            .faceit-stats-item {font-size: 16px; display: flex; align-items: center; margin-bottom: 5px; line-height: normal;}
            .faceit-stats-item span {margin-left: 5px;}
            .faceit-stats-icon {display: flex;}
            .faceit-error {background-color: #ffe0e0; padding: 10px; margin-bottom: 10px; border: 1px solid #ff6666; border-radius: 8px; font-family: 'Arial', sans-serif; font-size: 14px; color: #ff3333;}`;

        this.Messages = {
            en: {
                playerNotFound: "Player not found on Faceit",
                steamIdError: "Error getting Steam ID from the page.",
                requestApiError: "Error executing Faceit API request",
            },
            ru: {
                playerNotFound: "Игрок не найден на Faceit",
                steamIdError: "Ошибка получения Steam ID со страницы.",
                requestApiError: "Ошибка выполнения запроса к API",
            },
        };
    }

    getLocale() {
        const userLocale = navigator.language.toLowerCase();
        return userLocale.includes("ru") ? "ru" : "en";
    }

    getSteamId() {
        const steamId = document.querySelector('[name="abuseID"]').value;
        if (!steamId) {
            console.error(this.Messages[this.getLocale()].steamIdError);
        }
        return steamId;
    }

async makeRequest(url, options) {
    return new Promise((resolve, reject) => {
        GM.xmlHttpRequest({
            method: options.method || "GET",
            url: url,
            headers: options.headers || {},
            onload: (response) => {
                console.log(`API Response: ${response.responseText}`); // Логирование
                resolve(JSON.parse(response.responseText));
            },
            onerror: (error) => {
                console.error(`Error in makeFaceitAPIRequest: ${error.message}`);
                reject(new Error(`${this.Messages[this.getLocale()].faceitApiError}: ${error.message}`));
            },
        });
    });
}


    async getGuid(steamId) {
        try {
            const resJson = await this.makeRequest(
                `${this.API_SEARCH_URL}${steamId}`,
                {}
            );

            const players = resJson.payload.players.results;

            // Попытка найти игрока со статусом "AVAILABLE"
            const availablePlayer = players.find(player => player.status === "AVAILABLE");

            // Если не найдено, возвращаем GUID первого игрока (если массив не пустой)
            if (availablePlayer) {
                return availablePlayer.guid;
            } else if (players.length > 0) {
                return players[0].guid;
            }
        } catch (error) {
            console.error(`Error in getGuid: ${error.message}`);
            throw new Error(`${this.Messages[this.getLocale()].requestApiError}: ${error.message}`);
        }
        throw new Error(this.Messages[this.getLocale()].playerNotFound);
    }

    async fetchPlayerData(url, game) {
        try {
            return await this.makeRequest(url, { headers: { Authorization: `Bearer ${this.FACEIT_TOKEN_API}` } });
        } catch (error) {
            console.error(`Error in fetchPlayerData (${game}): ${error.message}`);
            throw error;
        }
    }

    async getPlayerInfo(guid) {
        try {
            const [userInfo, cs2Stats, csgoStats] = await Promise.all([
                this.fetchPlayerData(`${this.API_PLAYER_URL}${guid}`, null),
                this.fetchPlayerData(`${this.API_PLAYER_URL}${guid}/stats/cs2`),
                this.fetchPlayerData(`${this.API_PLAYER_URL}${guid}/stats/csgo`)
            ]);
            const gameStats = (stats, game) => {
                if (stats && stats.lifetime) {
                    return {
                        cs2SkillLevel: userInfo.games[game].skill_level,
                        cs2Elo: userInfo.games[game].faceit_elo,
                        Matches: stats.lifetime.Matches,
                        WinRate: stats.lifetime["Win Rate %"],
                        AverageKillDeathRatio: stats.lifetime["Average K/D Ratio"],
                        AverageHeadshots: stats.lifetime["Average Headshots %"]
                    };
                }
            };

            const cs2Info = gameStats(cs2Stats, 'cs2');
            const csgoInfo = gameStats(csgoStats, 'csgo');

            return cs2Info || csgoInfo || null;
        } catch (error) {
            console.error(`Error in getPlayerInfo: ${error.message}`);
            throw new Error(this.Messages[this.getLocale()].playerNotFound);
        }
    }

    getSkillLevelIconPath(skillLevel) {
        const basePath =
            "https://raw.githubusercontent.com/raizano/FACEIT-Statistics/master/icons/";
        return `${basePath}${skillLevel}-level.svg` || null;
    }

    addStyles() {
        if (document.querySelector('#faceit-stats-styles')) {
            return;
        }
        const styleElement = document.createElement("style");
        styleElement.id = 'faceit-stats-styles';
        styleElement.textContent = this.STYLES;
        document.head.appendChild(styleElement);
    }

    createElement(tag, className = null, text = null) {
        const element = document.createElement(tag);
        if (className) element.classList.add(className);
        if (text) element.appendChild(document.createTextNode(text));
        return element;
    }

    createStatsItem(text, iconSrc = null) {
        const statsItem = this.createElement('div', 'faceit-stats-item');
        const textContainer = this.createElement('span');
        textContainer.appendChild(document.createTextNode(text));

        if (iconSrc) {
            const iconContainer = this.createElement('span', 'faceit-stats-icon');
            const iconImg = this.createElement('img');
            Object.assign(iconImg, { src: iconSrc, alt: text, width: 28, height: 28 });
            iconContainer.appendChild(iconImg);
            statsItem.append(textContainer, iconContainer);
        } else {
            statsItem.appendChild(textContainer);
        }

        return statsItem;
    }

    createStatsBlock(cs2SkillLevel, cs2Elo, matches, winRate, kdRatio, headshotsPercentage) {
        const statsContainer = this.createElement('div', 'faceit-stats-container');
        const header = this.createElement('div', 'faceit-stats-header');
        const faceText = document.createTextNode('FACE');
        const iElement = this.createElement('span');
        iElement.style.color = 'orange';
        iElement.appendChild(document.createTextNode('I'));
        const tText = document.createTextNode('T Statistics');
        header.appendChild(faceText);
        header.appendChild(iElement);
        header.appendChild(tText);
        statsContainer.appendChild(header);

        const statsBlock = this.createElement('div', 'faceit-stats-grid');
        const column1 = this.createElement('div', 'faceit-stats-column');
        const skillLevelItem = this.createStatsItem('CS2 Level:', this.getSkillLevelIconPath(cs2SkillLevel));
        const eloItem = this.createStatsItem(`ELO: ${cs2Elo}`);
        const winRateItem = this.createStatsItem(`Win Rate: ${winRate}%`);
        const matchesItem = this.createStatsItem(`Matches: ${matches}`);
        column1.appendChild(skillLevelItem);
        column1.appendChild(winRateItem);
        column1.appendChild(matchesItem);

        const column2 = this.createElement('div', 'faceit-stats-column');
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

    handleErrors(error) {
        const errorBlock = document.createElement("div");
        errorBlock.classList.add("faceit-error");

        if (error.message === this.Messages[this.getLocale()].playerNotFound) {
            errorBlock.textContent = this.Messages[this.getLocale()].playerNotFound;
        } else {
            errorBlock.textContent = `Ошибка: ${error.message}`;
        }

        document.querySelector('.responsive_status_info').appendChild(errorBlock);
    }

    async start() {
        try {
            this.addStyles();
            const steamId = this.getSteamId();
            const guid = await this.getGuid(steamId);
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
}

const faceitStatistics = new FaceitStatistics();
//faceitStatistics.createStatsBlock(5, 2000, 100, 60, 1.5, 75); //test block
faceitStatistics.start();
