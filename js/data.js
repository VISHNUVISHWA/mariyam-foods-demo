/* Sample catalogue for the client demo. Replace with the client's real products, prices and shelf life. */
window.MF_PRODUCTS = [
  { id: "murukku", name: "Kai Murukku", cat: "savoury", price: 240, flag: "Bestseller", heat: 2, shelf: 30, friedAgo: 2,
    note: "Hand-twisted rings with a loud, clean crunch.",
    about: "Rice flour and urad dal, twisted by hand into tight rings and fried slowly until the ridges turn deep gold. Every ring has its maker's hand in it, so no two look quite the same.",
    ingredients: "Rice flour, roasted urad dal flour, sesame, cumin, butter, salt, gingelly oil", allergens: "Sesame, milk" },
  { id: "laddu", name: "Cashew Besan Laddu", cat: "sweet", price: 320, flag: "Festive favourite", heat: 0, shelf: 21, friedAgo: 3,
    note: "Slow-roasted gram flour and ghee, topped with a whole cashew.",
    about: "Gram flour roasted in ghee until it smells of toasted nuts, then rolled warm with cardamom and finished with one whole cashew. Soft in the middle, with a slight grain.",
    ingredients: "Gram flour, cane sugar, ghee, cashew, cardamom", allergens: "Tree nuts, milk" },
  { id: "adhirasam", name: "Jaggery Adhirasam", cat: "sweet", price: 300, flag: "", heat: 0, shelf: 18, friedAgo: 4,
    note: "Dark jaggery and rice, chewy in the centre, crisp at the rim.",
    about: "The dough rests for days before it reaches the oil, which gives adhirasam its chew. Palm-dark jaggery, cardamom and a coat of sesame finish it.",
    ingredients: "Raw rice flour, jaggery, sesame, cardamom, dry ginger, gingelly oil", allergens: "Sesame" },
  { id: "ribbon", name: "Ribbon Pakoda", cat: "savoury", price: 220, flag: "", heat: 2, shelf: 30, friedAgo: 1,
    note: "Flat, ruffled ribbons with chilli and asafoetida.",
    about: "Pressed through a slotted mould straight into hot oil, so each ribbon keeps its ridges. Thin enough to shatter and seasoned enough to keep you reaching back.",
    ingredients: "Rice flour, gram flour, red chilli, asafoetida, butter, salt, gingelly oil", allergens: "Milk" },
  { id: "thattai", name: "Curry Leaf Thattai", cat: "savoury", price: 230, flag: "New batch", heat: 3, shelf: 25, friedAgo: 1,
    note: "Thin rice crackers flecked with curry leaf and chana dal.",
    about: "Patted out by hand and fried flat. Soaked chana dal gives each disc its bumps, and curry leaf and black pepper give it heat that builds.",
    ingredients: "Rice flour, urad dal flour, chana dal, curry leaf, black pepper, red chilli, salt, gingelly oil", allergens: "None declared" },
  { id: "seedai", name: "Uppu Seedai", cat: "savoury", price: 210, flag: "", heat: 1, shelf: 30, friedAgo: 5,
    note: "Crunchy little rice balls, the taste of Gokulashtami.",
    about: "Marble-sized balls of rice flour and coconut, rolled one at a time and fried until they rattle in the jar. Small, salty and very hard to stop eating.",
    ingredients: "Rice flour, urad dal flour, coconut, sesame, cumin, salt, gingelly oil", allergens: "Sesame" },
  { id: "chips", name: "Nendran Banana Chips", cat: "savoury", price: 260, flag: "", heat: 1, shelf: 28, friedAgo: 2,
    note: "Thin Nendran slices, fried in coconut oil with sea salt.",
    about: "Nendran bananas sliced straight into coconut oil, salted while they fry. They come out glassy, golden and faintly sweet at the centre.",
    ingredients: "Nendran banana, coconut oil, sea salt, turmeric", allergens: "None declared" },
  { id: "burfi", name: "Coconut Burfi", cat: "sweet", price: 340, flag: "", heat: 0, shelf: 12, friedAgo: 2,
    note: "Fresh coconut and cardamom, cut into soft diamonds.",
    about: "Fresh-grated coconut cooked down with sugar and milk until it just sets, then cut while warm. It has the shortest life on the shelf, so we make it most often.",
    ingredients: "Coconut, cane sugar, milk, ghee, cardamom, cashew, pistachio", allergens: "Milk, tree nuts" },
  { id: "achu", name: "Achu Murukku", cat: "sweet", price: 280, flag: "", heat: 0, shelf: 30, friedAgo: 3,
    note: "Lacy rose cookies, crisp and lightly sweet.",
    about: "A hot iron mould dipped in rice and coconut milk batter and lowered into the oil, where the flower lets go by itself. It takes years to get the timing right.",
    ingredients: "Rice flour, coconut milk, cane sugar, sesame, cardamom, gingelly oil", allergens: "Sesame" },
  { id: "tin", name: "Festival Tin", cat: "gift", price: 1240, flag: "Gift", heat: 1, shelf: 18, friedAgo: 1, fixedPack: "4 × 250 g",
    note: "Our keepsake tin with murukku, laddu, adhirasam and thattai.",
    about: "Four of our best-loved snacks packed in a reusable forest-green tin with a gold band. Sealed the day it ships and ready to give.",
    ingredients: "Kai Murukku, Cashew Besan Laddu, Jaggery Adhirasam, Curry Leaf Thattai", allergens: "Sesame, milk, tree nuts" }
];

window.MF_PACKS = [
  { id: "250", label: "250 g", mult: 1 },
  { id: "500", label: "500 g", mult: 1.9 },
  { id: "1000", label: "1 kg", mult: 3.6 }
];

window.MF_CONFIG = { freeShipping: 999, shipping: 60, express: 120, tinDiscount: .1, tinSlots: 4, tinFee: 150 };
