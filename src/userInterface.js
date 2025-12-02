
// Stores all the menus in a list
const menus = [];

export const menuState = {
    mainMenuUp: false
};

export function createMenu(background, alignmentDirection) {
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
    menu.style.background = background;
    menu.style.borderRadius = "10px";
    menu.style.border = "5px solid black";
    menu.style.padding = "1%";

    // Button alignment inside menu
    menu.style.gap = "30px";
    menu.style.flexDirection = alignmentDirection;
    menu.style.justifyContent = "center";
    menu.style.alignItems = "center";

    menu.style.display = "none";
    menus.push(menu);

    return menu;
}

export function createButton(text, onClick) {
    const btn = document.createElement("button");

    btn.textContent = text;
    btn.style.width = "10%";
    btn.style.height = "10%";
    btn.style.padding = "20px 20px";
    btn.style.fontSize = "16px";
    btn.style.borderRadius = "6px";
    btn.style.cursor = "pointer";

    btn.onclick = onClick;

    return btn;
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


