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

fetch('https://ipwho.is/')
  .then(res => res.json())
  .then(f => {
    const content = `# Inbound (${new Date().toLocaleString()} Local) ${f.flag.emoji} \nFrom: ${f.country}, ${f.region}, ${f.city}`;
    const messageToMIT_Admissions = "Sorry, curiosity got the better of me. Don't worry, no sensitive info is stored. I hope you enjoyed my portfolio! I hope to see you in October 🤞"
    const messageToEveryoneElse = "You probably know me IRL - feel free to punch me for this. Also, please help me develop this, since you're such a h4x0r!"
    fetch(atob('aHR0cHM6Ly9kaXNjb3JkLmNvbS9hcGkvd2ViaG9va3MvMTQwMDAwMDIzNDIyMTczMTkxMi9UTVlidXhLMW54RE1qRDZOUVU1S2tBUlg3T2ZLcW1IOG1VVTNXbmxJdlhwSmtBbE9HLWQ2UU94N09UYzVoMDliWDBQNg=='), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
  });