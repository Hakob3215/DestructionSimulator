
// Stores all the menus in a list
const menus = [];

export const menuState = {
    mainMenuUp: false
};

export function createMenu(color, alignmentDirection) {
    const menu = document.createElement("div");

    // Menu Positioning
    menu.style.position = "absolute";
    menu.style.top = "10%";
    menu.style.left = "50%";
    menu.style.width = "80%";
    menu.style.height = "80%";
    menu.style.transform = "translate(-50%, -1%)";
    menu.style.zIndex = 150;

    // Menu appearance
    menu.style.background = color;
    menu.style.borderRadius = "30px";
    menu.style.border = "5px solid white";
    menu.style.padding = "1%";

    // Button alignment inside menu
    menu.style.gap = "40px";
    menu.style.flexDirection = alignmentDirection;
    menu.style.justifyContent = "center";
    menu.style.alignItems = "center";

    menu.style.display = "none";
    menus.push(menu);

    return menu;
}

export function createButton(text, color, width, height, onClick) {
    const btn = document.createElement("button");

    btn.textContent = text;
    btn.style.fontSize = "30px";
    btn.style.color = "white";

    btn.style.width = width;
    btn.style.height = height;
    btn.style.padding = "20px 20px";
    btn.style.borderRadius = "10px";
    btn.style.border = "3px solid white";

    btn.style.background = color

    btn.style.cursor = "pointer";

    btn.onclick = onClick;

    return btn;
}

export function createTitleText(titleText, color) {
    const text = document.createElement('h1');

    text.textContent = titleText;
    text.style.fontSize = "50px";
    text.style.color = color;
    
    return text;
}

export function showMenu(menuToShow) {
    // hide all menus
    for (const menu of menus) {
        menu.style.display = "none";
    } 
    menuToShow.style.display = "flex";     // show desired menu                 
}

export function hideAllMenus(rendererDomElement) {
    for (const menu of menus) {
        menu.style.display = "none";
    } 
    menuState.mainMenuUp = false;
    rendererDomElement.requestPointerLock();
}


