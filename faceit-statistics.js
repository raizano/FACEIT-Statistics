// ==UserScript==
// @name         FACEIT Statistics
// @namespace    http://tampermonkey.net/
// @homepage     https://github.com/raizano/FACEIT-Statistics/
// @version      2023-12-23
// @description  Make a Faceit API request and display statistics on Steam profile
// @author       raizano
// @match        https://steamcommunity.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=steamcommunity.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(async function () {
    'use strict';

    const API_SEARCH_URL = "https://api.faceit.com/search/v1/?limit=5&query=";
    const API_PLAYER_URL = "https://open.faceit.com/data/v4/players/";
    const API_KEY = "ENTER-API-KEY-FACEIT";

    const STYLES = `
        .faceit-stats {
            display: flex;
            flex-direction: column;
            margin-bottom: 10px;
        }

        .faceit-stats-header {
            font-size: 250%;
            font-weight: bold;
        }

        .faceit-stats-item {
            font-size: 16px;
            display: flex; /* Добавлено свойство display: flex */
            align-items: center; /* Выравнивание по центру по вертикали */
        }

        .faceit-stats-item span {
            font-weight: bold;
            margin-left: 5px; /* Добавлено отступ слева для разделения иконки и текста */
        }

       .faceit-stats-icon {
        position: relative;
        top: 3px; /* Выберите подходящее значение для вас */
       }

        .faceit-stats-icon svg {
            width: 28px;
            height: 28px;
        }

        .faceit-error {
            background-color: #ffe0e0;
            padding: 10px;
            margin-bottom: 10px;
            border: 1px solid #ff6666;
            border-radius: 8px;
            font-family: 'Arial', sans-serif;
            font-size: 14px;
        }
    `;

    function addStyles() {
        var styleElement = document.createElement("style");
        styleElement.textContent = STYLES;
        document.head.appendChild(styleElement);
    }

    function promisifiedGMRequest(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: response => resolve(response),
                onerror: error => reject(error),
            });
        });
    }

    function getSteamId() {
        var url = window.location.href;
        var steamId = document.getElementsByName("abuseID")[0]?.value || url.replace(/^https:\/\/steamcommunity\.com\/profiles\//, '') || null;
        if (!steamId) {
            throw new Error("Ошибка получения Steam ID со страницы.");
        }
        return steamId;
    }

    async function makeFaceitAPIRequest(url, options) {
        try {
            const response = await promisifiedGMRequest({
                method: options.method || "GET",
                url: url,
                headers: options.headers || {},
            });
            return JSON.parse(response.responseText);
        } catch (error) {
            throw new Error(`Ошибка при выполнении запроса Faceit API: ${error.message}`);
        }
    }

    async function searchFaceitAPI(steamId) {
        let playerFound = false;

        try {
            const resJson = await makeFaceitAPIRequest(API_SEARCH_URL + steamId, {});
            if (resJson.payload.players.results && resJson.payload.players.results.length > 0) {
                playerFound = true;
                return resJson.payload.players.results[0].guid;
            }
        } catch (error) {
            // Проверяем, является ли ошибка ошибкой 404 (ресурс не найден) и содержит код "err_nf0"
            if (error.response && error.response.status === 404) {
                const errorJson = error.responseJSON;
                // Проверяем наличие кода ошибки "err_nf0" в JSON
                if (errorJson && errorJson.errors && errorJson.errors[0] && errorJson.errors[0].code === "err_nf0") {
                    throw new Error("Игрок не найден на Faceit");
                }
            }
            // Если не удалось определить код ошибки, бросаем общее сообщение об ошибке
            throw new Error(`Ошибка при выполнении запроса Faceit API: ${error.message}`);
        }

        if (!playerFound) {
            throw new Error("Игрок не найден на Faceit");
        }
    }

    function getSkillLevelIcon(skillLevel) {
        // Здесь вы можете добавить другие уровни и соответствующие им иконки
        const levelIcons = {
            1:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 1</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.685 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.563-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M5.894 15.816L3.858 17.09a9.656 9.656 0 0 0 1.894 2.2l1.562-1.822a7.206 7.206 0 0 1-1.42-1.65z" fill="#EEE"></path><path d="M11.765 10.233l-1.487.824v-1.034L12 8.948h.991V14.4h-1.226v-4.167z" fill="#EEE"></path></svg>',
            2:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 2</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.685 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.563-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M5.257 14.53l-2.249.842a9.613 9.613 0 0 0 2.743 3.917l1.563-1.822a7.206 7.206 0 0 1-2.057-2.938z" fill="#1CE400"></path><path d="M10.05 13.157c0-.303.084-.566.252-.79a1.6 1.6 0 0 1 .655-.512 8.17 8.17 0 0 1 .748-.286 2.78 2.78 0 0 0 .663-.302c.157-.107.235-.233.235-.378v-.698c0-.173-.07-.288-.21-.344-.15-.062-.386-.092-.705-.092-.387 0-.896.07-1.529.21V9.04a8.523 8.523 0 0 1 1.756-.177c.66 0 1.15.101 1.47.303.324.201.487.537.487 1.008v.756c0 .285-.087.534-.26.747a1.567 1.567 0 0 1-.656.47c-.252.107-.51.202-.773.286a2.65 2.65 0 0 0-.68.336c-.162.123-.244.27-.244.437v.277h2.621v.916h-3.83v-1.243z" fill="#1CE400"></path></svg>',
            3:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 3</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M2.4 12a9.58 9.58 0 0 0 3.352 7.29l1.562-1.823A7.184 7.184 0 0 1 4.801 12H2.4z" fill="#1CE400"></path><path d="M11.79 14.484c-.47 0-1.08-.042-1.831-.126v-.975l.269.05c.106.023.165.037.176.043l.286.05c.067.011.21.028.428.05.168.017.339.026.513.026.324 0 .548-.04.672-.118.128-.078.193-.227.193-.445v-.63c0-.263-.283-.395-.849-.395h-.99v-.84h.99c.437 0 .656-.16.656-.479v-.529a.453.453 0 0 0-.068-.269c-.044-.067-.126-.114-.243-.142a2.239 2.239 0 0 0-.504-.042c-.32 0-.812.033-1.479.1V8.94c.762-.05 1.3-.076 1.613-.076.683 0 1.176.079 1.479.235.308.157.462.434.462.832v.899a.62.62 0 0 1-.152.42.703.703 0 0 1-.37.227c.494.173.74.445.74.814v.89c0 .466-.16.799-.479 1-.319.202-.823.303-1.512.303z" fill="#1CE400"></path></svg>',
            4: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 4</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M6.91 6.91L5.211 5.211A9.57 9.57 0 0 0 2.4 12a9.58 9.58 0 0 0 3.352 7.289l1.562-1.822A7.184 7.184 0 0 1 4.801 12c0-1.988.805-3.788 2.108-5.09z" fill="#FFC800"></path><path d="M12.303 13.3h-2.52v-.967l2.243-3.385h1.386v3.47H14v.881h-.588v1.1h-1.109v-1.1zm0-.883v-2.31l-1.47 2.31h1.47z" fill="#FFC800"></path></svg>',
            5:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 5</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M12 2.4A9.6 9.6 0 0 0 2.4 12a9.58 9.58 0 0 0 3.352 7.29l1.562-1.823A7.2 7.2 0 0 1 12 4.8V2.4z" fill="#FFC800"></path><path d="M11.815 14.484c-.386 0-.966-.031-1.739-.093v-1.016c.695.129 1.218.193 1.571.193.308 0 .532-.033.672-.1a.357.357 0 0 0 .21-.337v-.814c0-.152-.05-.258-.151-.32-.101-.067-.266-.1-.496-.1h-1.68V8.948h3.444v.941H11.43v1.109h.856c.325 0 .642.061.95.185a.909.909 0 0 1 .554.865v1.142c0 .219-.042.415-.126.588-.084.168-.19.297-.32.387a1.315 1.315 0 0 1-.453.201c-.185.05-.364.084-.537.101a10.05 10.05 0 0 1-.538.017z" fill="#FFC800"></path></svg>',
            6:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 6</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M15.816 5.895a7.2 7.2 0 0 0-8.502 11.572l-1.562 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4c1.87 0 3.613.535 5.089 1.458l-1.273 2.037z" fill="#FFC800"></path><path d="M11.992 14.484a5.99 5.99 0 0 1-.613-.025 2.48 2.48 0 0 1-.496-.11 1.24 1.24 0 0 1-.453-.243 1.184 1.184 0 0 1-.286-.437 1.89 1.89 0 0 1-.118-.689v-2.537c0-.268.045-.506.135-.714.095-.212.215-.375.361-.487.123-.095.288-.173.496-.235a2.71 2.71 0 0 1 .604-.126c.213-.011.406-.017.58-.017.24 0 .745.028 1.512.084v.9c-.756-.09-1.296-.135-1.621-.135-.269 0-.46.014-.571.042-.112.028-.188.084-.227.168-.034.078-.05.22-.05.428v.647h.898c.303 0 .521.005.655.017.135.005.286.03.454.075.18.045.31.11.395.193.09.079.168.2.235.362.062.168.092.366.092.596v.74c0 .257-.039.484-.117.68-.079.19-.18.338-.303.445-.112.1-.26.182-.445.243a2.04 2.04 0 0 1-.537.11 5.58 5.58 0 0 1-.58.025zm.017-.815c.246 0 .417-.014.512-.042.101-.028.165-.081.193-.16a1.51 1.51 0 0 0 .042-.428v-.79c0-.134-.016-.23-.05-.285-.034-.062-.104-.104-.21-.126a2.557 2.557 0 0 0-.496-.034h-.756v1.243c0 .19.014.328.042.412.034.084.101.14.202.168.106.028.28.042.52.042z" fill="#FFC800"></path></svg>',
            7:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 7</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M17.934 7.92a7.2 7.2 0 1 0-10.62 9.546L5.752 19.29A9.58 9.58 0 0 1 2.4 12a9.6 9.6 0 0 1 17.512-5.44l-1.978 1.36z" fill="#FFC800"></path><path d="M12.546 9.906H9.9v-.958h4v.84L11.807 14.4h-1.36l2.1-4.494z" fill="#FFC800"></path></svg>',
            8: '<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 8</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M19.2 12h2.4A9.6 9.6 0 0 0 12 2.4 9.6 9.6 0 0 0 2.4 12a9.58 9.58 0 0 0 3.352 7.29l1.562-1.823A7.2 7.2 0 1 1 19.2 12z" fill="#FF6309"></path><path d="M12 14.484c-.723 0-1.252-.09-1.588-.269-.33-.18-.496-.49-.496-.932v-.941c0-.18.09-.347.269-.504.179-.157.392-.263.638-.32v-.033a.879.879 0 0 1-.504-.235.614.614 0 0 1-.218-.462v-.781c0-.392.143-.68.428-.866.291-.184.781-.277 1.47-.277s1.176.093 1.462.277c.291.185.437.474.437.866v.78a.614.614 0 0 1-.219.463.879.879 0 0 1-.504.235v.034c.247.056.46.162.639.319s.268.325.268.504v.94c0 .454-.17.768-.512.941-.342.174-.865.26-1.57.26zm0-3.293c.246 0 .416-.034.512-.1.1-.074.15-.188.15-.345v-.63c0-.163-.05-.277-.15-.345-.096-.072-.266-.109-.513-.109-.246 0-.42.037-.52.11-.096.067-.143.181-.143.344v.63a.41.41 0 0 0 .142.336c.09.073.264.11.521.11zm0 2.495c.24 0 .414-.014.52-.042.112-.028.185-.076.218-.143.04-.067.06-.174.06-.32v-.738c0-.163-.048-.283-.144-.362-.095-.072-.31-.109-.646-.109-.32 0-.535.037-.647.11-.107.067-.16.187-.16.36v.74c0 .145.017.252.05.32.04.066.113.114.219.142.112.028.288.042.53.042z" fill="#FF6309"></path></svg>',
            9:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 9</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M18.517 15.066a7.2 7.2 0 1 0-11.202 2.4L5.751 19.29A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.563 9.563 0 0 1-.91 4.089l-2.173-1.023z" fill="#FF6309"></path><path d="M11.84 14.484c-.48 0-.999-.028-1.553-.084v-.874c.717.079 1.229.118 1.537.118.286 0 .493-.02.622-.059.128-.04.212-.112.252-.218.044-.107.067-.275.067-.504v-.513h-.907c-.303 0-.521-.003-.656-.008a2.63 2.63 0 0 1-.453-.084.898.898 0 0 1-.395-.193 1.052 1.052 0 0 1-.235-.37 1.706 1.706 0 0 1-.093-.588v-.74c0-.257.04-.48.118-.671.078-.196.18-.35.302-.462.112-.095.258-.174.437-.235.185-.062.367-.101.546-.118.213-.011.406-.017.58-.017.263 0 .47.009.621.025.157.012.322.045.496.101a1.129 1.129 0 0 1 .74.689 1.9 1.9 0 0 1 .117.689v2.537c0 .565-.171.971-.513 1.218-.336.24-.879.36-1.63.36zm.925-2.949V10.26c0-.19-.017-.322-.05-.395-.029-.073-.093-.12-.194-.143a2.73 2.73 0 0 0-.529-.034 2.11 2.11 0 0 0-.504.042.26.26 0 0 0-.193.152c-.034.072-.05.198-.05.378v.831c0 .135.016.233.05.294.033.056.1.095.201.118a2.7 2.7 0 0 0 .504.033h.765z" fill="#FF6309"></path></svg>',
            10:'<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="sc-TOgAA cqhHC" size="3"><title>Skill level 10</title><circle cx="12" cy="12" r="12" fill="#1F1F22"></circle><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#CDCDCD" fill-opacity=".1"></path><path fill-rule="evenodd" clip-rule="evenodd" d="M16.686 17.467a7.2 7.2 0 1 0-9.371 0l-1.563 1.822A9.58 9.58 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4a9.6 9.6 0 0 1 9.6 9.6 9.58 9.58 0 0 1-3.352 7.29l-1.562-1.823z" fill="#FE1F00"></path><path d="M9.233 10.233l-1.487.824v-1.034l1.722-1.075h.991V14.4H9.233v-4.167zm4.595 4.251c-.246 0-.448-.009-.604-.025a3.295 3.295 0 0 1-.513-.101 1.237 1.237 0 0 1-.462-.235 1.202 1.202 0 0 1-.294-.454 1.7 1.7 0 0 1-.126-.689v-2.612c0-.258.04-.485.118-.68a1.23 1.23 0 0 1 .302-.463c.107-.095.252-.17.437-.226a2.45 2.45 0 0 1 .554-.118c.213-.011.41-.017.588-.017.252 0 .454.009.605.025a2.4 2.4 0 0 1 .504.101c.202.062.361.143.479.244.118.1.218.246.302.437.084.19.126.422.126.697v2.612c0 .258-.042.485-.126.68a1.15 1.15 0 0 1-.302.454 1.32 1.32 0 0 1-.462.235c-.19.062-.372.098-.546.11a5.58 5.58 0 0 1-.58.025zm.017-.79c.235 0 .403-.014.504-.042a.306.306 0 0 0 .202-.176c.033-.084.05-.221.05-.412v-2.78c0-.19-.017-.328-.05-.412a.282.282 0 0 0-.202-.168c-.1-.033-.269-.05-.504-.05-.24 0-.414.017-.52.05a.282.282 0 0 0-.202.168c-.034.084-.05.221-.05.412v2.78c0 .19.016.328.05.412.033.084.1.143.201.176.107.028.28.042.521.042z" fill="#FE1F00"></path></svg>'
            // Добавьте другие уровни и их иконки по аналогии
        };

        return levelIcons[skillLevel] || ''; // Возвращаем иконку для уровня или пустую строку, если уровень не найден
    }

    async function getPlayerInfo(guid) {
        try {
            const responseJson = await makeFaceitAPIRequest(API_PLAYER_URL + guid, {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                },
            });

            if (!responseJson.games || !responseJson.games.cs2) {
                throw new Error("Игрок не найден на Faceit");
            }

            return {
                cs2SkillLevel: responseJson.games.cs2.skill_level,
                cs2Elo: responseJson.games.cs2.faceit_elo,
            };
        } catch (error) {
            throw new Error(` ${error.message}`);
        }
    }

    function createStatsBlock(cs2SkillLevel, cs2Elo) {
        var statsBlock = document.createElement("div");
        statsBlock.classList.add("faceit-stats");

        const levelIcon = getSkillLevelIcon(cs2SkillLevel);

        statsBlock.innerHTML = `
            <div class="faceit-stats-header">FACE<span style="color: orange;">I</span>T Statistics</div>
            <div class="faceit-stats-item">
                CS2 Skill Level: <span class="faceit-stats-icon">${levelIcon}</span>
            </div>
            <div class="faceit-stats-item">CS2 Elo: ${cs2Elo}</div>
        `;
        document.querySelector('.responsive_status_info').appendChild(statsBlock);
    }

    function createErrorBlock(errorMessage) {
        var errorBlock = document.createElement("div");
        errorBlock.classList.add("faceit-error");
        errorBlock.innerHTML = errorMessage;
        document.querySelector('.responsive_status_info').appendChild(errorBlock);
    }

    // Main execution code
    try {
        addStyles();
        const steamId = getSteamId();
        const guid = await searchFaceitAPI(steamId);

        const playerInfo = await getPlayerInfo(guid);
        createStatsBlock(playerInfo.cs2SkillLevel, playerInfo.cs2Elo);
    } catch (error) {
        if (error.message === "Игрок не найден Faceit") {
            // Обработка ошибки, когда игрок не найден
            console.error("Player not found on Faceit");
        } else {
            // Обработка других ошибок
            createErrorBlock(error.message);
        }
    }
})();
