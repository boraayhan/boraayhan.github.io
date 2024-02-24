function toggleMobileMenu(menu) {
    menu.classList.toggle('open');
    var el = document.getElementById("mobile");
    if (el.style.display === "none") {
        el.style.display = "block";
    } 
    else {
        el.style.display = "none";
    } 
}