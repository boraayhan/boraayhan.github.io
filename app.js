function toggleMobileMenu(menu) {
    menu.classList.toggle('open');
}


var l = ["A web developer", "A test code writer", "An idiot"];
var el = document.getElementById("app");

for (var s of l) {
    var i = 0;
    while(i < s.length) {
        el.innerHTML += s.charAt(i);
        i++;
    }
}
