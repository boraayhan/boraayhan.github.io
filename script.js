function revealMore(elid) {
  const el_info = document.getElementById(elid);
  const el_title = document.getElementById(elid + "-title");
  const isHidden = el_info.style.display === "none" || el_info.style.display === "";
  if (isHidden) {
    el_info.style.display = "block";
    el_title.classList.add("visible");
    el_title.style.filter = "brightness(100%)";
  } else {
    el_info.style.display = "none";
    el_title.classList.remove("visible");
  }
}

if (window.location.href.includes("portfolio")) {
  window.location.replace("https://www.youtube.com/watch?v=taGMaZh1usw");
}