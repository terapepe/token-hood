// Renders config values (js/config.js, already synced with hybot) into the page
(function () {
  var C = window.HOOD_CONFIG;
  var T = C.project.ticker;
  var isSingle = C.mode !== "multi";
  var ids = isSingle ? [C.singleNetwork] : C.multiOrder;
  var caOf = function (id) { var n = C.networks[id]; return (n.ca || (n.type === "solana" ? C.token.sol : C.token.address) || "").trim(); };
  var main = C.networks[ids[0]];
  var mainCa = caOf(ids[0]);
  var short = function (a) { return a ? a.slice(0, 6) + "…" + a.slice(-4) : "TBA"; };
  var set = function (k, v) { document.querySelectorAll('[data-t="' + k + '"]').forEach(function (e) { e.textContent = v; }); };

  set("name", C.project.name); set("ticker", T); set("minHold", Number(C.minHold).toLocaleString("en-US"));
  set("netShort", isSingle ? main.short : ids.length + " chains"); set("caShort", short(mainCa));
  document.querySelectorAll("[data-glitch]").forEach(function (e) { e.textContent = "$" + T; e.setAttribute("data-text", "$" + T); });
  document.querySelector("[data-year]").textContent = new Date().getFullYear();
  var nl = document.querySelector("[data-net-line]");
  if (isSingle && main.tagline) { nl.textContent = main.name + " · " + main.tagline; nl.style.color = main.color; }
  document.title = "$" + T + " TERMINAL — " + C.project.tagline;

  // buy / explorer / community links
  var buy = mainCa && main.buyUrl ? main.buyUrl.replace("{ca}", mainCa) : "";
  document.querySelectorAll("[data-buy]").forEach(function (a) { if (buy) { a.href = buy; a.target = "_blank"; a.rel = "noopener"; } });
  var ex = document.querySelector("[data-explorer]");
  if (mainCa) { ex.href = main.explorer + mainCa; ex.target = "_blank"; ex.rel = "noopener"; } else ex.style.display = "none";
  var community = C.social.telegram || C.social.discord || C.social.x;
  var cm = document.querySelector("[data-community]");
  if (community) { cm.href = community; cm.target = "_blank"; cm.rel = "noopener"; } else cm.style.display = "none";

  // CA cards (click / button to copy)
  var list = document.querySelector("[data-ca-list]");
  ids.forEach(function (id) {
    var n = C.networks[id], ca = caOf(id);
    var el = document.createElement("div");
    el.className = "panel ca";
    el.innerHTML = '<img src="' + n.icon + '" alt="" /><div class="net"><b>' + n.name + "</b><small>" + n.tagline + "</small></div>" +
      '<code class="' + (ca ? "" : "tba") + '" title="Click to copy">' + (ca || "Contract address coming soon") + "</code>" +
      (ca ? '<button class="btn sm" type="button">Copy</button>' + (n.buyUrl ? '<a class="btn primary sm" target="_blank" rel="noopener" href="' + n.buyUrl.replace("{ca}", ca) + '">Buy</a>' : "") : "");
    var copy = function () { if (!ca) return; navigator.clipboard && navigator.clipboard.writeText(ca); var b = el.querySelector("button"); if (b) { b.textContent = "Copied ✓"; setTimeout(function () { b.textContent = "Copy"; }, 1400); } };
    el.querySelector("code").onclick = copy; var b = el.querySelector("button"); if (b) b.onclick = copy;
    list.appendChild(el);
  });

  // footer socials
  var ul = document.querySelector("[data-socials]");
  var li = function (href, label) { if (!href) return; ul.insertAdjacentHTML("beforeend", '<li><a target="_blank" rel="noopener" href="' + href + '">&gt; ' + label + "</a></li>"); };
  li(C.social.x, "X " + (C.social.xHandle || ""));
  li(C.social.telegram, "Telegram");
  li(C.social.discord, "Discord");
  li(buy, "Buy $" + T);
  if (mainCa) li(main.explorer + mainCa, "Explorer");
})();
