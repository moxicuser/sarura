# SARURA UI Wording — Kinyarwanda & English (Draft)

Source: SARURA Development Guide, Step 1 and section 4. This is the wording
draft for menus and buttons. It becomes `frontend/src/i18n/rw.json` (default)
and `frontend/src/i18n/en.json` in Step 6.

**Important:** Kinyarwanda entries marked ⚠ are a draft by a non-native speaker
and **must be reviewed by a native Kinyarwanda speaker** before launch (also
Step 14: test with real farmers). ✅ marks entries considered safe. Numbers always
carry their unit (RWF, kg).

Default language: **Kinyarwanda (rw)**. English toggle in the header.

---

## A. Header / Footer / Navigation

| Element | English | Kinyarwanda |
|---|---|---|
| Site name | SARURA | SARURA |
| Home | Home | Ahabanza ✅ |
| Marketplace | Marketplace | Isoko ✅ |
| How It Works | How It Works | Uko Bikorwa ✅ |
| Sell on SARURA | Sell on SARURA | Curuza kuri SARURA ⚠ |
| Login / Register | Log in / Register | Kwinjira / Kwiyandikisha ✅ |
| Language toggle | EN | RW |
| Footer: About | About Us | Ibyerekeye ✅ |
| Footer: Contact | Contact Us | Twandikire ✅ |
| Footer: Privacy | Privacy Policy | Ingingo ku bwumvikane bw'amakuru ⚠ |
| Footer: Policies | Platform Policies | Amategeko ya SARURA ⚠ |

## B. Auth screens

| Element | English | Kinyarwanda |
|---|---|---|
| Login title | Log in | Kwinjira ✅ |
| Register title | Create your account | Kora konti yawe ⚠ |
| Role choice | I am a buyer / I am a farmer | Ndi umuguzi / Ndi umuhinzi ✅ |
| Full name | Full name | Amazina yombi ✅ |
| Email | Email | Imeri ✅ |
| Phone | Phone number | Numero ya telefoni ✅ |
| Password | Password | Ijambobanga ✅ |
| Show password | Show password | Erekana ijambobanga ⚠ |
| Submit login | Log in | Kwinjira ✅ |
| Submit register | Create free account | Kora konti ku buntu ⚠ |
| Forgot password | Forgot your password? | Wibagiwe ijambobanga? ⚠ |
| Reset email subject | Reset your SARURA password | Hindura ijambobanga rya SARURA ⚠ |
| Logout | Log out | Gusohoka ✅ |
| Login gate modal | Log in or create a free buyer account to negotiate. | Injira cyangwa kora konti y'umuguzi ku buntu kugirango utangire igiceri. ⚠ |

## C. Marketplace and products

| Element | English | Kinyarwanda |
|---|---|---|
| Search placeholder | Search crops, e.g. beans | Shakisha, urugero: ibishyimbo ⚠ |
| Search button | Search | Shakisha ✅ |
| Categories | Categories | Ibyiciro ✅ |
| Category: Vegetables | Vegetables | Imboga ✅ |
| Category: Fruits | Fruits | Imbuto ✅ |
| Category: Grains | Grains | Ibiribwa (amasaka, ibishyimbo…) ⚠ |
| Category: Tubers | Tubers | Ibijumba n'ibirayi ⚠ |
| Category: Other | Other | Ibindi ✅ |
| Filter: District | District | Akarere ✅ |
| Filter: Sector | Sector | Umurenge ✅ |
| Filter: Price range | Price (RWF/kg) | Igiciro (RWF/kg) ✅ |
| Filter: Min quantity | Minimum quantity (kg) | Ingano nto yinyurwa (kg) ⚠ |
| Filter: Verified farmers | Verified farmers only | Abahinzi bemewe gusa ⚠ |
| Sort: Newest | Newest first | Bishya mbere ⚠ |
| Sort: Lowest price | Lowest price | Igiciro nto ⚠ |
| Sort: Nearest district | Nearest district | Akarere kwegereye ⚠ |
| Card: quantity | 500 kg available | 500 kg ziriho ⚠ |
| Card: verified badge | Verified | Yemewe ⚠ |
| Empty state | No potatoes available in this district yet | Nta birayi bihari muri aka karere kandi ⚠ |
| Load more | Show more products | Erekana ibindi bicuruzwa ⚠ |

## D. Product detail / negotiation

| Element | English | Kinyarwanda |
|---|---|---|
| Price display | 600 RWF/kg | 600 RWF/kg ✅ |
| Price basis: fixed | Fixed price | Igiciro ntigihinduka ⚠ |
| Price basis: negotiable | Negotiable | Igiciro gishobora kugiranywa ⚠ |
| Main action | Negotiate | Kuvugana ku giciro ⚠ |
| Secondary action | Save product | Bika igicuruzwa ⚠ |
| Farmer summary | Sold by | Umucuruzi ⚠ |
| Safety tips | Safe trading tips: meet in public, check produce before paying, never send money to strangers. | Inama z'umutekano: bahanganire mu cyanya cy'abantu benshi, suza igicuruzwa mbere yo kwishyura, ntuzereke amafaranga ku muntu utazi. ⚠ |
| Quantity you want | Quantity wanted (kg) | Ingano ushaka (kg) ⚠ |
| Your offer | Offered price (RWF/kg) | Igiciro utanga (RWF/kg) ⚠ |
| Send request | Send purchase request | Ohereza ikibazo cy'ugucuruza ⚠ |
| Report product | Report this listing | Tangaza iki kibazo ⚠ |

## E. Dashboards

| Element | English | Kinyarwanda |
|---|---|---|
| Buyer: Overview | Overview | Igaragaza ⚠ |
| Buyer: My requests | My requests | Ibisaba byanjye ⚠ |
| Buyer: My orders | My orders | Amabwiriza yanjye ⚠ |
| Buyer: Messages | Messages | Ubutumwa ✅ |
| Buyer: Saved products | Saved products | Ibicuruzwa nabitswe ⚠ |
| Buyer: Profile | Profile | Umirondoro ✅ (umwirondoro) |
| Farmer: Overview | Overview | Igaragaza ⚠ |
| Farmer: My products | My products | Ibicuruzwa byanjye ⚠ |
| Farmer: Add product | Add product | Ongeraho igicuruzwa ✅ |
| Farmer: Requests received | Requests received | Ibisaba nakiriye ⚠ |
| Farmer: Orders | Orders | Amabwiriza ⚠ |
| Farmer: Edit | Edit | Hindura ✅ |
| Farmer: Mark as sold | Mark as sold | Andika ko byacurujwe ⚠ |
| Farmer: Hide | Hide listing | Hisha igicuruzwa ⚠ |
| Notifications | Notifications | Amatangazo ⚠ |
| Unread badge | (count) | (umubare) |

## F. Requests, offers, orders (statuses always as word + icon, never color alone)

| Element | English | Kinyarwanda |
|---|---|---|
| Status: Pending | Pending | Kirindwa ⚠ |
| Status: Negotiating | Negotiating | Kuvugana ⚠ |
| Status: Confirmed | Confirmed | Yemejwe ⚠ |
| Status: Completed | Completed | Byarangiye ✅ |
| Status: Cancelled | Cancelled | Yaretse ⚠ |
| Farmer: Accept | Accept | Emeza ✅ |
| Farmer: Reject | Reject | Yanka ⚠ |
| Farmer: Counter offer | Counter offer | Tanga igiciro rindi ⚠ |
| Cancel order | Cancel order | Reka icuruzwa ⚠ |
| Cancel reason | Why are you cancelling? | Ni iki uteza ukureka? ⚠ |
| Dispute / report order | Report a problem | Tangaza ikibazo ⚠ |

## G. Chat

| Element | English | Kinyarwanda |
|---|---|---|
| Messages title | Messages | Ubutumwa ✅ |
| Conversation | Conversation | Ikiganiro ✅ |
| Input placeholder | Write a message… | Andika ubutumwa… ⚠ |
| Send | Send | Ohereza ✅ |
| Report | Report | Tangaza ikibazo ⚠ |
| Block | Block user | Funga umukoresha ⚠ |
| Delete conversation | Delete this conversation | Siba iki kiganiro ⚠ |
| Unread | unread | ntabutumwa ⚠ |

## H. Forms and errors

| Element | English | Kinyarwanda |
|---|---|---|
| Required error | This field is required | Iki cyerekezo nticyuzuye ⚠ |
| Password error | Your password must have at least 8 characters | Ijambobanga ryawe rigomba kugira inyuguti 8 cyangwa zirenze ⚠ |
| Wrong login | Wrong email or password | Imeri cyangwa ijambobanga sibyo ⚠ |
| Server error | Something went wrong. Please try again. | Habaye ikibazo. Ongera ugerageze. ⚠ |
| Saved | Saved successfully | Byabitswe neza ⚠ |
| Confirm delete | Are you sure? This cannot be undone. | Urabyizeye? Iki ntigishobora guhinduka. ⚠ |

## I. Crop glossary (autocomplete list, all ⚠ pending native review)

| English | Kinyarwanda |
|---|---|
| Irish potato | Ibirayi |
| Sweet potato | Ibijumba |
| Cassava | Imbondo (kawunga = flour) |
| Beans | Ibishyimbo |
| Maize | ⚠ confirm term |
| Rice | Umuceri |
| Wheat | Ingano |
| Sorghum | Amasaka |
| Banana | Imineke |
| Tomato | Inyanya |
| Onion | Tunguru |
| Cabbage | Kabichi |
| Carrot | Karoti |
| Avocado | Igihaza |
| Mango | Imango |
| Passion fruit | Amaraza |
| Pineapple | ⚠ confirm term |
| Papaya | Imapapayi |
| Orange | Umucungwa |
| Peas | Ubushaza |
| Honey | Ubuki |
| Eggs | Amagi |
| Milk | Amata |

## Conventions

- Kinyarwanda file (`rw.json`) is written first; English (`en.json`) mirrors its keys.
- Every price string includes `RWF`, every quantity includes `kg`.
- Buttons are short (1–3 words); sentences are kept simple for low-literacy users.
- Interpolated values use i18next placeholders, e.g. `"500 kg ziriho": "{{qty}} kg ziriho"`.
