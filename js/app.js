/* Mariyam Foods demo storefront: hash router, cart, build-a-tin and demo checkout. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const P = window.MF_PRODUCTS, PACKS = window.MF_PACKS, CFG = window.MF_CONFIG;
  const byId = (id) => P.find((p) => p.id === id);
  let main = $("#main");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "₹" + Math.round(n).toLocaleString("en-IN");
  const store = {
    get(k, d) { try { const v = localStorage.getItem("mf-" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("mf-" + k, JSON.stringify(v)); } catch (e) { /* preview without storage */ } }
  };
  let cleanups = [];
  const onLeave = (fn) => cleanups.push(fn);

  /* ---------- batch logic ---------- */
  const dateText = (d) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  function batch(p) {
    const fried = new Date(); fried.setDate(fried.getDate() - p.friedAgo);
    const left = p.shelf - p.friedAgo, pct = Math.round(left / p.shelf * 100);
    const code = "MF-" + String(fried.getMonth() + 1).padStart(2, "0") + String(fried.getDate()).padStart(2, "0");
    return { fried, left, pct, code, ago: p.friedAgo === 1 ? "yesterday" : p.friedAgo + " days ago" };
  }
  const meter = (p) => {
    const b = batch(p);
    return `<div class="mf-meter">
      <div class="mf-meter__row"><span>Batch <b>${b.code}</b> · fried ${b.ago}</span><span><b>${b.left} days</b> of freshness left</span></div>
      <div class="mf-meter__track" role="img" aria-label="${b.pct} percent of shelf life left"><div class="mf-meter__fill" style="width:${b.pct}%"></div></div>
    </div>`;
  };

  /* ---------- product art ---------- */
  function hydrateArt(root) {
    $$("img[data-snack]", root).forEach((img) => {
      if (img.dataset.done) return;
      img.dataset.done = "1";
      const fallback = () => { img.src = "assets/brand/emblem.webp"; img.classList.add("is-ready"); };
      if (!window.MF3D || !window.MF3D.ok) return fallback();
      window.MF3D.thumb(img.dataset.snack).then((url) => {
        if (!url) return fallback();
        img.src = url; img.classList.add("is-ready");
      });
    });
  }
  // Snacks are static photography. Only the keepsake tin is still rendered in 3D.
  const art = (id, alt, cls = "") => id === "tin"
    ? `<img class="snack ${cls}" data-snack="tin" alt="${esc(alt)}" src="data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==">`
    : `<img class="snack is-ready ${cls}" src="assets/products/${id}.webp" alt="${esc(alt)}" decoding="async">`;
  const heatDots = (n) => n ? `<span class="heat" aria-label="Heat ${n} of 3">${[1, 2, 3].map((i) => `<i class="${i <= n ? "on" : ""}"></i>`).join("")}</span>` : "";

  /* ---------- cards ---------- */
  function card(p, extra = "") {
    const size = p.fixedPack || "250 g";
    return `<article class="mf-card ${extra}">
      ${p.flag ? `<span class="mf-badge mf-badge--gold mf-card__flag">${esc(p.flag)}</span>` : ""}
      <div class="mf-card__stage">${art(p.id, p.name)}</div>
      <div class="mf-card__body">
        <div class="mf-card__meta">${p.cat} · ${size}</div>
        <h3 class="mf-card__title"><a href="#/p/${p.id}">${esc(p.name)}</a></h3>
        <p class="mf-card__note">${esc(p.note)}</p>
        <div class="mf-card__foot">
          <span class="mf-price">${money(p.price)}</span>
          <button class="mf-btn mf-btn--sm mf-btn--quiet" data-add="${p.id}" aria-label="Add ${esc(p.name)} to cart">Add</button>
        </div>
      </div>
    </article>`;
  }
  document.addEventListener("pointermove", (e) => {
    const c = e.target.closest && e.target.closest(".mf-card");
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.style.setProperty("--mx", (e.clientX - r.left) + "px");
    c.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });

  /* ---------- cart ---------- */
  let cart = store.get("cart", []);
  const lineKey = (l) => l.tin ? "tin:" + l.tin.join(",") : l.id + ":" + l.pack;
  function linePrice(l) {
    if (l.tin) return tinPrice(l.tin).total;
    const p = byId(l.id);
    if (p.fixedPack) return p.price;
    return p.price * PACKS.find((x) => x.id === l.pack).mult;
  }
  const lineLabel = (l) => l.tin ? "Your Tin" : byId(l.id).name;
  const lineSub = (l) => l.tin ? l.tin.map((id) => byId(id).name.split(" ").slice(-1)[0]).join(" · ") : (byId(l.id).fixedPack || PACKS.find((x) => x.id === l.pack).label);
  const lineArt = (l) => l.tin ? "tin" : l.id;
  const subtotal = () => cart.reduce((s, l) => s + linePrice(l) * l.qty, 0);
  const count = () => cart.reduce((s, l) => s + l.qty, 0);
  function saveCart() {
    store.set("cart", cart);
    const c = $("#cartCount");
    c.textContent = count(); c.hidden = count() === 0;
    renderDrawer();
  }
  function addLine(line, qty = 1) {
    const k = lineKey(line), found = cart.find((l) => lineKey(l) === k);
    if (found) found.qty += qty; else cart.push(Object.assign({ qty }, line));
    saveCart();
  }
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg; t.classList.add("is-on");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove("is-on"), 2600);
  }
  function renderDrawer() {
    const d = $("#drawer"), sub = subtotal(), gap = CFG.freeShipping - sub;
    const pct = Math.min(100, sub / CFG.freeShipping * 100);
    d.innerHTML = `<div class="drawer__head">
        <h2>Your cart</h2>
        <button class="mf-icon-btn" data-close-drawer aria-label="Close cart"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>
      </div>
      ${cart.length ? `<div class="drawer__ship">
          <p>${gap > 0 ? `Add <b>${money(gap)}</b> more for free delivery` : "<b>Free delivery unlocked</b>"}</p>
          <div class="mf-meter__track"><div class="mf-meter__fill drawer__bar" style="width:${pct}%"></div></div>
        </div>
        <div class="drawer__list">${cart.map((l, i) => `<div class="mf-line">
            ${art(lineArt(l), lineLabel(l), "mf-line__img")}
            <div>
              <div class="mf-line__name">${esc(lineLabel(l))}</div>
              <div class="mf-line__sub">${esc(lineSub(l))}</div>
              <div class="mf-line__tools">
                <div class="mf-qty"><button data-dec="${i}" aria-label="Remove one">−</button><output>${l.qty}</output><button data-inc="${i}" aria-label="Add one">+</button></div>
                <button class="mf-link" data-del="${i}">Remove</button>
              </div>
            </div>
            <div class="mf-price">${money(linePrice(l) * l.qty)}</div>
          </div>`).join("")}</div>
        <div class="drawer__foot">
          <div class="sumrow"><span>Subtotal</span><span class="mf-price">${money(sub)}</span></div>
          <a class="mf-btn mf-btn--lg mf-btn--block" href="#/checkout" data-close-drawer>Go to checkout</a>
        </div>` : `<div class="drawer__empty">
          ${art("laddu", "", "drawer__emptyart")}
          <p>Your cart is empty. The murukku is a good place to start.</p>
          <a class="mf-btn" href="#/shop" data-close-drawer>Shop the snacks</a>
        </div>`}`;
    hydrateArt(d);
  }
  function openDrawer(open) {
    const d = $("#drawer");
    d.classList.toggle("is-open", open);
    d.setAttribute("aria-hidden", String(!open));
    d.inert = !open;
    $("#scrim").hidden = !open;
    document.documentElement.classList.toggle("no-scroll", open);
    if (open) { const b = $("[data-close-drawer]", d); if (b) b.focus(); } else if (openDrawer.was) { $("#cartBtn").focus(); }
    openDrawer.was = open;
  }

  /* ---------- HOME ---------- */
  function viewHome() {
    const hero = byId("murukku"), b = batch(hero);
    const bento = ["murukku", "laddu", "adhirasam", "thattai", "chips"].map(byId);
    main.innerHTML = `
    <section class="hero">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="hero__stage" aria-hidden="true">
        <svg class="hero__arch" viewBox="0 0 600 720" fill="none"><path d="M300 12c14 44 62 62 96 88 16 12 20 34 38 44 30 16 66 34 86 66 16 26 2 56 12 84 16 44 50 84 44 136-8 80-74 170-156 216-40 22-80 44-120 62-40-18-80-40-120-62C98 600 32 510 24 430c-6-52 28-92 44-136 10-28-4-58 12-84 20-32 56-50 86-66 18-10 22-32 38-44 34-26 82-44 96-88Z"/></svg>
        <img class="hero__art" src="assets/products/home-hero.webp" alt="" width="1080" height="800" fetchpriority="high">
      </div>
      <div class="hero__copy">
        <p class="mf-eyebrow">Homemade traditional snacks</p>
        <h1>Made by hand,<br>in <em>small batches.</em></h1>
        <p class="hero__lede">Murukku, laddu and adhirasam from family recipes, fried fresh and sealed the day they ship. Every pack tells you exactly when it was made.</p>
        <div class="hero__cta">
          <a class="mf-btn mf-btn--lg" href="#/shop">Shop the snacks</a>
          <a class="mf-btn mf-btn--lg mf-btn--ghost" href="#/tin">Build a tin</a>
        </div>
      </div>
      <a class="hero__batch mf-glass" href="#/p/murukku">
        <span class="live"><i></i>Latest batch</span>
        <strong>${esc(hero.name)}</strong>
        <span class="hero__batchmeta">${b.code} · fried ${b.ago}</span>
      </a>
    </section>

    <div class="ticker" aria-hidden="true"><div class="ticker__in">
      ${Array(2).fill(["Hand-twisted", "Fried in small batches", "No preservatives", "Sealed the day it ships", "Shipped across India"].map((t) => `<span>${t}</span>`).join("")).join("")}
    </div></div>

    <section class="band">
      <div class="band__in">
        <div class="head">
          <div>
            <p class="mf-eyebrow">The kitchen's favourites</p>
            <h2>Start with these five.</h2>
          </div>
          <a class="mf-btn mf-btn--ghost" href="#/shop">See all ten</a>
        </div>
        <div class="bento">${bento.map((p, i) => card(p, i === 0 ? "bento__lead" : "")).join("")}</div>
      </div>
    </section>

    <section class="band band--alt">
      <div class="band__in split">
        <div class="split__text">
          <p class="mf-eyebrow">Live batch tracking</p>
          <h2>Know exactly when it was fried.</h2>
          <p>Traditional snacks taste best in their first weeks. So every product shows its batch code, the day it was fried and how much freshness is left. No guessing from a printed date.</p>
          <a class="mf-btn mf-btn--ghost" href="#/p/thattai">See it on a product</a>
        </div>
        <div class="trackcard">
          <div class="trackcard__head">
            <div class="trackcard__art">${art("thattai", "Curry Leaf Thattai")}</div>
            <div>
              <p class="mf-eyebrow">Batch ${batch(byId("thattai")).code}</p>
              <h3>Curry Leaf Thattai</h3>
            </div>
          </div>
          ${meter(byId("thattai"))}
          <ol class="mf-steps">
            <li data-state="done">Ground<small>Mon</small></li>
            <li data-state="done">Shaped<small>Tue</small></li>
            <li data-state="done">Fried<small>Tue</small></li>
            <li data-state="now">Rested<small>Today</small></li>
            <li>Sealed<small>Next</small></li>
          </ol>
        </div>
      </div>
    </section>

    <section class="band">
      <div class="band__in tinband">
        <div class="tinband__art">${art("tin", "Mariyam Foods keepsake tin")}</div>
        <div class="tinband__text">
          <p class="mf-eyebrow">Gifting</p>
          <h2>Fill a tin <em>your way.</em></h2>
          <p>Pick any four snacks and we pack them in our forest-green keepsake tin. Four packs save you ${CFG.tinDiscount * 100}%. It keeps its place on the shelf long after the snacks are gone.</p>
          <div class="hero__cta">
            <a class="mf-btn mf-btn--lg" href="#/tin">Build a tin</a>
            <a class="mf-btn mf-btn--lg mf-btn--ghost" href="#/p/tin">Festival Tin, ${money(byId("tin").price)}</a>
          </div>
        </div>
      </div>
    </section>

    <section class="band band--alt">
      <div class="band__in">
        <div class="head"><div><p class="mf-eyebrow">Shop by craving</p><h2>Salt or sugar?</h2></div></div>
        <div class="crave">
          <a class="crave__tile" href="#/shop/savoury">
            <div><h3>Savoury</h3><p>Crunch, chilli and curry leaf.</p></div>
            ${art("ribbon", "")}
          </a>
          <a class="crave__tile crave__tile--gold" href="#/shop/sweet">
            <div><h3>Sweet</h3><p>Jaggery, ghee and cardamom.</p></div>
            ${art("achu", "")}
          </a>
        </div>
      </div>
    </section>`;
    hydrateArt(main);
  }

  /* ---------- SHOP ---------- */
  function viewShop(cat) {
    let filter = ["savoury", "sweet", "gift"].includes(cat) ? cat : "all", sort = "feat";
    const titles = { all: "All snacks", savoury: "Savoury", sweet: "Sweet", gift: "Gifts" };
    main.innerHTML = `<section class="band band--page">
      <div class="band__in">
        <div class="head head--stack">
          <div><p class="mf-eyebrow">The shop</p><h1 class="pagetitle" id="shopTitle"></h1></div>
          <div class="filters">
            <div class="filters__chips" role="group" aria-label="Filter by category">
              ${["all", "savoury", "sweet", "gift"].map((c) => `<button class="mf-chip" data-filter="${c}">${c === "gift" ? "Gifts" : c[0].toUpperCase() + c.slice(1)}</button>`).join("")}
            </div>
            <div class="mf-field filters__sort"><label for="sortSel" class="sr">Sort</label>
              <select class="mf-input" id="sortSel">
                <option value="feat">Featured</option><option value="low">Price, low to high</option><option value="high">Price, high to low</option><option value="fresh">Freshest batch</option>
              </select></div>
          </div>
        </div>
        <div class="grid" id="shopGrid"></div>
      </div>
    </section>`;
    const draw = () => {
      let list = P.filter((p) => filter === "all" || p.cat === filter);
      if (sort === "low") list = [...list].sort((a, b) => a.price - b.price);
      if (sort === "high") list = [...list].sort((a, b) => b.price - a.price);
      if (sort === "fresh") list = [...list].sort((a, b) => a.friedAgo - b.friedAgo);
      $("#shopTitle").textContent = titles[filter];
      $("#shopGrid").innerHTML = list.map((p) => card(p)).join("");
      $$("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.filter === filter)));
      hydrateArt($("#shopGrid"));
    };
    main.addEventListener("click", function h(e) {
      const b = e.target.closest("[data-filter]");
      if (b) { filter = b.dataset.filter; draw(); }
    });
    $("#sortSel").addEventListener("change", (e) => { sort = e.target.value; draw(); });
    draw();
  }

  /* ---------- PRODUCT ---------- */
  function viewProduct(id) {
    const p = byId(id);
    if (!p) return notFound();
    let pack = "250", qty = 1;
    const is3d = p.id === "tin"; // the tin is the only product still shown as a 3D model
    const priceNow = () => (p.fixedPack ? p.price : p.price * PACKS.find((x) => x.id === pack).mult) * qty;
    const related = P.filter((x) => x.id !== p.id && x.cat === p.cat).slice(0, 3);
    const fill = related.length < 3 ? P.filter((x) => x.id !== p.id && x.cat !== p.cat).slice(0, 3 - related.length) : [];
    main.innerHTML = `<section class="band band--page">
      <div class="band__in pdp">
        <div class="pdp__stage">
          <div class="pdp__halo" aria-hidden="true"></div>
          ${is3d ? `<canvas id="viewer" tabindex="0" role="img" aria-label="${esc(p.name)}, 3D model. Drag or use arrow keys to rotate."></canvas>
          <div class="pdp__fallback" hidden>${art(p.id, p.name)}</div>
          <p class="pdp__hint"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M3 12c0-2.5 4-4.5 9-4.5s9 2 9 4.5-4 4.5-9 4.5"/><path d="m9 13.5 3 3-3 3"/></svg>Drag to spin</p>`
          : `<div class="pdp__fallback">${art(p.id, p.name)}</div>`}
        </div>
        <div class="pdp__info">
          <a class="crumb" href="#/shop/${p.cat}">← ${p.cat === "gift" ? "Gifts" : p.cat[0].toUpperCase() + p.cat.slice(1)}</a>
          ${p.flag ? `<div><span class="mf-badge mf-badge--gold">${esc(p.flag)}</span></div>` : ""}
          <h1 class="pagetitle">${esc(p.name)}</h1>
          <p class="pdp__lede">${esc(p.about)}</p>
          ${p.heat ? `<p class="pdp__heat"><span class="mf-eyebrow">Heat</span>${heatDots(p.heat)}</p>` : ""}
          <div class="pdp__panel">${meter(p)}</div>
          ${p.fixedPack ? `<p class="mf-badge">${esc(p.fixedPack)}</p>` : `<fieldset class="mf-pack" id="packs"><legend class="sr">Pack size</legend>
            ${PACKS.map((x, i) => `<label><input type="radio" name="pack" id="pack${x.id}" value="${x.id}" ${i === 0 ? "checked" : ""}><span class="mf-pack__w">${x.label}</span><span class="mf-pack__p">${money(p.price * x.mult)}</span></label>`).join("")}
          </fieldset>`}
          <div class="pdp__buy">
            <div class="mf-qty"><button id="qMinus" aria-label="Remove one">−</button><output id="qVal">1</output><button id="qPlus" aria-label="Add one">+</button></div>
            <button class="mf-btn mf-btn--lg pdp__add" id="addBtn">Add to cart · <span id="priceNow"></span></button>
          </div>
          <dl class="pdp__facts">
            <div><dt>Ingredients</dt><dd>${esc(p.ingredients)}</dd></div>
            <div><dt>Contains</dt><dd>${esc(p.allergens)}</dd></div>
            <div><dt>Best within</dt><dd>${p.shelf} days of frying, in an airtight jar</dd></div>
            <div><dt>Delivery</dt><dd>Free above ${money(CFG.freeShipping)}, otherwise ${money(CFG.shipping)}</dd></div>
          </dl>
        </div>
      </div>
    </section>
    <section class="band band--alt"><div class="band__in">
      <div class="head"><div><p class="mf-eyebrow">Goes well with</p><h2>Add one more.</h2></div></div>
      <div class="grid grid--3">${[...related, ...fill].map((x) => card(x)).join("")}</div>
    </div></section>`;
    const updatePrice = () => { $("#priceNow").textContent = money(priceNow()); $("#qVal").textContent = qty; };
    updatePrice();
    const packs = $("#packs");
    if (packs) packs.addEventListener("change", (e) => { pack = e.target.value; updatePrice(); });
    $("#qMinus").onclick = () => { qty = Math.max(1, qty - 1); updatePrice(); };
    $("#qPlus").onclick = () => { qty = Math.min(20, qty + 1); updatePrice(); };
    $("#addBtn").onclick = () => { addLine({ id: p.id, pack: p.fixedPack ? "fixed" : pack }, qty); openDrawer(true); };
    hydrateArt(main);
    if (!is3d) return;
    if (window.MF3D && window.MF3D.ok) {
      try { const v = window.MF3D.mountViewer($("#viewer"), p.id); onLeave(() => v.destroy()); }
      catch (e) { console.warn(e); $("#viewer").hidden = true; $(".pdp__fallback").hidden = false; $(".pdp__hint").hidden = true; }
    } else { $("#viewer").hidden = true; $(".pdp__fallback").hidden = false; $(".pdp__hint").hidden = true; }
  }

  /* ---------- BUILD A TIN ---------- */
  function tinPrice(ids) {
    const sum = ids.reduce((s, id) => s + byId(id).price, 0);
    const full = ids.length === CFG.tinSlots;
    const saved = full ? sum * CFG.tinDiscount : 0;
    return { sum, saved, fee: CFG.tinFee, total: sum - saved + CFG.tinFee };
  }
  function viewTin() {
    let picks = [];
    const options = P.filter((p) => p.cat !== "gift");
    main.innerHTML = `<section class="band band--page">
      <div class="band__in tin">
        <div class="tin__pick">
          <p class="mf-eyebrow">Build a tin</p>
          <h1 class="pagetitle">Pick four snacks.</h1>
          <p class="pdp__lede">Each one is a 250 g pack. A full tin saves you ${CFG.tinDiscount * 100}% on the snacks. Doubles are welcome.</p>
          <div class="tin__options">${options.map((p) => `<button class="tinopt" data-pick="${p.id}" aria-label="Add ${esc(p.name)} to tin">
              ${art(p.id, "")}
              <span class="tinopt__name">${esc(p.name)}</span>
              <span class="tinopt__price">${money(p.price)}</span>
              <span class="tinopt__n" hidden></span>
            </button>`).join("")}</div>
        </div>
        <aside class="tin__box">
          <div class="tin__hero">${art("tin", "Keepsake tin")}</div>
          <div class="tin__slots" id="slots"></div>
          <div id="tinSum"></div>
          <button class="mf-btn mf-btn--lg mf-btn--block" id="tinAdd" disabled></button>
        </aside>
      </div>
    </section>`;
    const draw = () => {
      const slots = [];
      for (let i = 0; i < CFG.tinSlots; i++) {
        const id = picks[i];
        slots.push(id ? `<button class="slot slot--on" data-unpick="${i}" aria-label="Remove ${esc(byId(id).name)}">${art(id, "")}<span>${esc(byId(id).name)}</span></button>`
          : `<div class="slot"><span>Slot ${i + 1}</span></div>`);
      }
      $("#slots").innerHTML = slots.join("");
      const t = tinPrice(picks);
      $("#tinSum").innerHTML = `<div class="sumrow"><span>Snacks</span><span class="mf-price">${money(t.sum)}</span></div>
        <div class="sumrow"><span>Full tin saving</span><span class="mf-price" style="color:var(--fresh)">${t.saved ? "−" + money(t.saved) : "Add " + (CFG.tinSlots - picks.length) + " more"}</span></div>
        <div class="sumrow"><span>Keepsake tin</span><span class="mf-price">${money(t.fee)}</span></div>`;
      const btn = $("#tinAdd"), full = picks.length === CFG.tinSlots;
      btn.disabled = !full;
      btn.textContent = full ? `Add tin to cart · ${money(t.total)}` : `${CFG.tinSlots - picks.length} more to go`;
      $$("[data-pick]").forEach((b) => {
        const n = picks.filter((x) => x === b.dataset.pick).length, tag = $(".tinopt__n", b);
        tag.hidden = !n; tag.textContent = "×" + n;
        b.classList.toggle("is-on", n > 0);
      });
      hydrateArt($("#slots"));
    };
    const handler = (e) => {
      const a = e.target.closest("[data-pick]"), r = e.target.closest("[data-unpick]");
      if (a) { if (picks.length < CFG.tinSlots) { picks.push(a.dataset.pick); draw(); } else toast("Your tin is full. Tap a slot to swap one out."); }
      if (r) { picks.splice(+r.dataset.unpick, 1); draw(); }
    };
    main.addEventListener("click", handler);
    onLeave(() => main.removeEventListener("click", handler));
    $("#tinAdd").onclick = () => { addLine({ tin: [...picks], pack: "tin" }); picks = []; draw(); openDrawer(true); };
    hydrateArt(main);
    draw();
  }

  /* ---------- CHECKOUT ---------- */
  const SAMPLE = { name: "Sample Customer", phone: "90000 00000", address: "12 Sample Street, Sample Nagar", city: "Chennai", pin: "600001" };
  function viewCheckout() {
    if (!cart.length) {
      main.innerHTML = `<section class="band band--page"><div class="band__in empty">
        <h1 class="pagetitle">Your cart is empty.</h1><p class="pdp__lede">Add a snack or two and come back here to check out.</p>
        <a class="mf-btn mf-btn--lg" href="#/shop">Shop the snacks</a></div></section>`;
      return;
    }
    let ship = "standard";
    main.innerHTML = `<section class="band band--page">
      <div class="band__in checkout">
        <form id="coForm" novalidate>
          <p class="mf-eyebrow">Checkout</p>
          <h1 class="pagetitle">Where should it go?</h1>
          <div class="co__section">
            <div class="co__head"><h2>Delivery details</h2><button type="button" class="mf-btn mf-btn--sm mf-btn--quiet" id="fillSample">Fill sample details</button></div>
            <div class="co__fields">
              ${field("name", "Full name", "Your name", "name")}
              ${field("phone", "Mobile number", "10 digit mobile", "tel")}
              <div class="mf-field co__wide"><label for="address">Address</label><textarea class="mf-input" id="address" name="address" placeholder="House, street, area"></textarea></div>
              ${field("city", "City", "City", "text")}
              ${field("pin", "PIN code", "6 digits", "text")}
            </div>
          </div>
          <div class="co__section">
            <h2>Delivery speed</h2>
            <fieldset class="mf-choice" id="shipChoice"><legend class="sr">Delivery speed</legend>
              <label><input type="radio" name="ship" id="shipStd" value="standard" checked><span>Standard<small>3 to 5 days</small></span><span class="mf-price" id="stdPrice"></span></label>
              <label><input type="radio" name="ship" id="shipExp" value="express"><span>Express<small>1 to 2 days</small></span><span class="mf-price">${money(CFG.express)}</span></label>
            </fieldset>
          </div>
          <div class="co__section">
            <h2>Payment</h2>
            <fieldset class="mf-choice"><legend class="sr">Payment method</legend>
              <label><input type="radio" name="pay" id="payUpi" value="UPI" checked><span>UPI<small>Live payment gateway connects in the real store</small></span><span></span></label>
              <label><input type="radio" name="pay" id="payCod" value="Cash on delivery"><span>Cash on delivery<small>Pay when your snacks arrive</small></span><span></span></label>
            </fieldset>
            <p class="co__note">This is a demo. No payment is taken and no order is sent.</p>
          </div>
        </form>
        <aside class="co__summary">
          <h2>Order summary</h2>
          <div>${cart.map((l) => `<div class="mf-line mf-line--tight">
            ${art(lineArt(l), "", "mf-line__img")}
            <div><div class="mf-line__name">${esc(lineLabel(l))}</div><div class="mf-line__sub">${esc(lineSub(l))} × ${l.qty}</div></div>
            <div class="mf-price">${money(linePrice(l) * l.qty)}</div>
          </div>`).join("")}</div>
          <div id="totals"></div>
          <button class="mf-btn mf-btn--lg mf-btn--block" form="coForm" type="submit" id="placeBtn">Place demo order</button>
        </aside>
      </div>
    </section>`;
    function field(id, label, ph, type) {
      const auto = { name: "name", phone: "tel" }[id] || "off";
      return `<div class="mf-field"><label for="${id}">${label}</label><input class="mf-input" id="${id}" name="${id}" type="${type === "tel" ? "tel" : "text"}" placeholder="${ph}" autocomplete="${auto}"></div>`;
    }
    const shipCost = () => ship === "express" ? CFG.express : (subtotal() >= CFG.freeShipping ? 0 : CFG.shipping);
    const totals = () => {
      const free = subtotal() >= CFG.freeShipping;
      $("#stdPrice").textContent = free ? "Free" : money(CFG.shipping);
      $("#totals").innerHTML = `<div class="sumrow"><span>Subtotal</span><span class="mf-price">${money(subtotal())}</span></div>
        <div class="sumrow"><span>Delivery</span><span class="mf-price">${shipCost() ? money(shipCost()) : "Free"}</span></div>
        <div class="sumrow sumrow--total"><span>Total</span><span class="mf-price">${money(subtotal() + shipCost())}</span></div>`;
    };
    totals();
    $("#shipChoice").addEventListener("change", (e) => { ship = e.target.value; totals(); });
    $("#fillSample").onclick = () => { Object.keys(SAMPLE).forEach((k) => { $("#" + k).value = SAMPLE[k]; }); clearErrors(); };
    const clearErrors = () => { $$(".mf-field[data-error]").forEach((f) => { f.removeAttribute("data-error"); const m = $(".mf-field__error", f); if (m) m.remove(); }); };
    const fail = (id, msg) => {
      const f = $("#" + id).closest(".mf-field");
      f.setAttribute("data-error", "1");
      f.insertAdjacentHTML("beforeend", `<span class="mf-field__error">${msg}</span>`);
    };
    $("#coForm").addEventListener("submit", (e) => {
      e.preventDefault();
      clearErrors();
      const v = {}; ["name", "phone", "address", "city", "pin"].forEach((k) => { v[k] = $("#" + k).value.trim(); });
      if (!v.name) fail("name", "Enter the name for delivery.");
      if (v.phone.replace(/\D/g, "").length !== 10) fail("phone", "Enter a 10 digit mobile number.");
      if (!v.address) fail("address", "Enter the delivery address.");
      if (!v.city) fail("city", "Enter the city.");
      if (!/^\d{6}$/.test(v.pin)) fail("pin", "Enter a 6 digit PIN code.");
      const bad = $(".mf-field[data-error] .mf-input");
      if (bad) { bad.focus(); return; }
      const order = {
        id: "MF" + Math.floor(100000 + Math.random() * 900000),
        name: v.name, city: v.city, pay: $("input[name=pay]:checked").value, ship,
        lines: cart.map((l) => ({ art: lineArt(l), label: lineLabel(l), sub: lineSub(l), qty: l.qty, total: linePrice(l) * l.qty })),
        total: subtotal() + shipCost()
      };
      store.set("order", order);
      cart = []; saveCart();
      location.hash = "#/order";
    });
    hydrateArt(main);
  }

  /* ---------- ORDER ---------- */
  function viewOrder() {
    const o = store.get("order", null);
    if (!o) { location.hash = "#/shop"; return; }
    const eta = new Date(); eta.setDate(eta.getDate() + (o.ship === "express" ? 2 : 5));
    main.innerHTML = `<section class="band band--page">
      <div class="band__in order">
        <div class="order__art">${art("tin", "")}</div>
        <p class="mf-eyebrow">Demo order ${esc(o.id)}</p>
        <h1 class="pagetitle">Thank you, ${esc(o.name.split(" ")[0])}.</h1>
        <p class="pdp__lede">In the real store, this page would confirm your order and follow it from our kitchen to ${esc(o.city)}. Expected by ${dateText(eta)}.</p>
        <ol class="mf-steps order__steps">
          <li data-state="now">Order received<small>Just now</small></li>
          <li>Fried fresh<small>Next</small></li>
          <li>Sealed<small>Next</small></li>
          <li>On its way<small>Next</small></li>
          <li>Delivered<small>By ${dateText(eta)}</small></li>
        </ol>
        <div class="order__box">
          ${o.lines.map((l) => `<div class="mf-line mf-line--tight">${art(l.art, "", "mf-line__img")}
            <div><div class="mf-line__name">${esc(l.label)}</div><div class="mf-line__sub">${esc(l.sub)} × ${l.qty}</div></div>
            <div class="mf-price">${money(l.total)}</div></div>`).join("")}
          <div class="sumrow sumrow--total"><span>Total · ${esc(o.pay)}</span><span class="mf-price">${money(o.total)}</span></div>
        </div>
        <a class="mf-btn mf-btn--lg" href="#/shop">Keep shopping</a>
      </div>
    </section>`;
    hydrateArt(main);
  }

  function notFound() {
    main.innerHTML = `<section class="band band--page"><div class="band__in empty"><h1 class="pagetitle">We can't find that page.</h1><a class="mf-btn" href="#/shop">Go to the shop</a></div></section>`;
  }

  /* ---------- router ---------- */
  function route() {
    cleanups.forEach((f) => f()); cleanups = [];
    const fresh = main.cloneNode(false); main.replaceWith(fresh); main = fresh; // drops per-view listeners
    const parts = location.hash.replace(/^#\/?/, "").split("/");
    const r = parts[0];
    if (!r) viewHome();
    else if (r === "shop") viewShop(parts[1]);
    else if (r === "p") viewProduct(parts[1]);
    else if (r === "tin") viewTin();
    else if (r === "checkout") viewCheckout();
    else if (r === "order") viewOrder();
    else notFound();
    document.documentElement.dataset.route = r || "home";
    $$(".nav__links a").forEach((a) => a.toggleAttribute("aria-current", a.getAttribute("href") === location.hash));
    scrollTo(0, 0);
    openDrawer(false);
    closeSearch();
  }

  /* ---------- global events ---------- */
  document.addEventListener("click", (e) => {
    const add = e.target.closest("[data-add]");
    if (add) {
      const p = byId(add.dataset.add);
      addLine({ id: p.id, pack: p.fixedPack ? "fixed" : "250" });
      toast(`${p.name} added to cart`);
      add.textContent = "Added"; setTimeout(() => { add.textContent = "Add"; }, 1200);
      return;
    }
    if (e.target.closest("[data-close-drawer]") || e.target.id === "scrim") openDrawer(false);
    const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), del = e.target.closest("[data-del]");
    if (inc) { cart[+inc.dataset.inc].qty++; saveCart(); }
    if (dec) { const l = cart[+dec.dataset.dec]; l.qty--; if (l.qty < 1) cart.splice(+dec.dataset.dec, 1); saveCart(); }
    if (del) { cart.splice(+del.dataset.del, 1); saveCart(); }
    if (location.hash.startsWith("#/checkout") && (inc || dec || del)) route();
  });
  $("#cartBtn").onclick = () => openDrawer(true);

  // theme
  const setTheme = (t) => {
    document.documentElement.dataset.theme = t;
    $("#themeBtn").setAttribute("aria-label", t === "night" ? "Switch to ivory theme" : "Switch to night theme");
    store.set("theme-v2", t); // new key so earlier visitors, who had "night" saved by default, get the light default
  };
  setTheme(store.get("theme-v2", "ivory"));
  $("#themeBtn").onclick = () => setTheme(document.documentElement.dataset.theme === "night" ? "ivory" : "night");

  // search
  const sBox = $("#search");
  function closeSearch() { sBox.hidden = true; }
  $("#searchBtn").onclick = () => { sBox.hidden = false; const i = $("#searchInput"); i.value = ""; drawSearch(""); i.focus(); };
  sBox.addEventListener("click", (e) => { if (e.target === sBox) closeSearch(); });
  function drawSearch(q) {
    q = q.toLowerCase().trim();
    const list = P.filter((p) => !q || (p.name + " " + p.note + " " + p.cat).toLowerCase().includes(q));
    $("#searchResults").innerHTML = list.length ? list.map((p) => `<a class="sr-row" href="#/p/${p.id}">${art(p.id, "")}<span><b>${esc(p.name)}</b><small>${esc(p.note)}</small></span><span class="mf-price">${money(p.price)}</span></a>`).join("")
      : `<p class="search__none">Nothing matches that. Try "murukku" or "sweet".</p>`;
    hydrateArt($("#searchResults"));
  }
  $("#searchInput").addEventListener("input", (e) => drawSearch(e.target.value));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { closeSearch(); if ($("#drawer").classList.contains("is-open")) openDrawer(false); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); $("#searchBtn").click(); }
  });

  // newsletter
  $("#newsForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const i = $("#newsEmail");
    if (!/.+@.+\..+/.test(i.value)) { toast("Enter a valid email address."); i.focus(); return; }
    i.value = ""; toast("Demo only: no email was saved.");
  });

  window.addEventListener("hashchange", route);
  saveCart();
  route();
})();
