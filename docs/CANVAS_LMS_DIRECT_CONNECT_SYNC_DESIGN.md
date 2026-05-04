# Canvas LMS / Direct Connect Sync Design

> ?묒꽦?? 2026-04-28
> ???釉뚮옖移? `feat#108-canvas-lms-direct-connect-sync`
> 紐⑹쟻: backend 理쒖떊 ?곹깭??留욎떠 `canvas_lms` source ?몄텧, direct-connect OAuth UX, service key 湲곕컲 restore/presentation ?뺥빀??FE?먯꽌 ?대뼸寃??섏슜?좎? ?ㅺ퀎?쒕떎.

---

## 1. 諛곌꼍

source/sink editor 1李??꾪솚? ?대? ?꾨즺?섏뿀??

- ?쒖옉 ?몃뱶: source service picker
- 以묎컙 泥섎━: `mapping_rules` 湲곕컲 wizard
- ?꾩갑 ?몃뱶: sink service picker
- lifecycle: backend `nodeStatuses` 湲곗? 諛섏쁺

?대쾲 ?댁뒋????援ъ“瑜??ㅼ떆 諛붽씀???묒뾽???꾨땲??

???backend 理쒖떊 援ы쁽?먯꽌 ?덈줈 ?쒕윭???꾨옒 ??媛吏瑜?FE媛 ?섏슜?섎룄濡??뺣젹?섎뒗 ?묒뾽?대떎.

1. Spring source catalog??`canvas_lms`媛 異붽??섏뿀??
2. OAuth connect ?묐떟??`redirect`留??덈뒗 寃껋씠 ?꾨땲??`directly connected`??議댁옱?쒕떎.
3. FastAPI runtime?먯꽌 `canvas_lms` source媛 ?ㅼ젣濡??ㅽ뻾?섏?留? payload ?섎???湲곗〈 `google_drive`/`slack`? ?ㅻⅤ??

利??대쾲 ?댁뒋??蹂몄쭏? `source/sink editor 2李?由щ뵒?먯씤`???꾨땲??
`??source + ??connect 諛⑹떇 + service presentation ?뺥빀`?대떎.

---

## 2. Backend 湲곗? ?ъ떎

## 2.1 Spring public contract

### 2.1.1 `canvas_lms` source catalog

Spring `source_catalog.json` 湲곗? `canvas_lms`???대? public catalog???ы븿?섏뼱 ?덈떎.

- service key: `canvas_lms`
- `auth_required: true`
- source modes:
  - `course_files` -> `FILE_LIST`
  - `course_new_file` -> `SINGLE_FILE`
  - `term_all_files` -> `FILE_LIST`
- target schema:
  - ?꾨? `text_input`
  - ?덉떆 placeholder:
    - 怨쇰ぉ ID
    - ?숆린紐?

?뺣━?섎㈃ FE??`canvas_lms`瑜??꾪빐 ??picker control??留뚮뱾 ?꾩슂媛 ?녿떎.
湲곗〈 `text_input` target step??洹몃?濡??ъ궗?⑺븯硫??쒕떎.

### 2.1.2 OAuth connect 寃곌낵媛 2醫낅쪟??

`POST /api/oauth-tokens/{service}/connect`??connector???곕씪 ?쒕줈 ?ㅻⅨ 寃곌낵瑜??뚮젮以??

- redirect required:
  - ?? Slack, Google Drive
  - ?묐떟 shape: `{ "authUrl": "..." }`
- directly connected:
  - ?? Notion, GitHub, Canvas LMS
  - ?묐떟 shape: `{ "connected": "true", "service": "<serviceKey>" }`

以묒슂????

- backend ?묐떟?먮뒗 `kind` 媛숈? ?먮퀎?먭? ?녿떎.
- FE媛 ?묐떟 shape瑜?蹂닿퀬 遺꾧린?댁빞 ?쒕떎.

### 2.1.3 backend connector 吏??踰붿쐞

?꾩옱 FE媛 connectable濡?蹂????덈뒗 ?쒕퉬?ㅻ뒗 backend connector 湲곗??쇰줈 ?ㅼ쓬怨?媛숇떎.

- `slack`
- `google_drive`
- `notion`
- `github`
- `canvas_lms`

諛섎?濡??꾨옒 ?쒕퉬?ㅻ뱾? catalog??蹂댁뿬???꾩옱 ???댁뒋 踰붿쐞?먯꽌??connectable濡?媛꾩＜?섏? ?딅뒗??

- `gmail`
- `google_sheets`
- `google_calendar`

利?FE??`auth_required === true`留뚯쑝濡?"?곌껐 ?쒖옉 媛?????먮떒?섎㈃ ???쒕떎.

## 2.2 FastAPI runtime semantics

### 2.2.1 `canvas_lms` source ?ㅽ뻾? ?대? 議댁옱?쒕떎

FastAPI `InputNodeStrategy` 湲곗? `canvas_lms`???ㅼ젣 ?ㅽ뻾 ??곸씠??

- `course_files` -> `FILE_LIST`
- `course_new_file` -> `SINGLE_FILE`
- `term_all_files` -> `FILE_LIST`

### 2.2.2 payload ?섎?

`canvas_lms` source媛 ?대젮二쇰뒗 payload???泥대줈 `url` 以묒떖?대떎.

- `course_files` / `term_all_files`
  - `items[*].filename`
  - `items[*].mime_type`
  - `items[*].size`
  - `items[*].url`
- `course_new_file`
  - `filename`
  - `mime_type`
  - `url`
  - `content: null`

利?FE媛 湲곕???寃껋? ?ㅼ쓬?대떎.

- source/sink editor ?④퀎?먯꽌 canonical type? 留욊쾶 ?곌껐??
- runtime?먯꽌 ?ㅼ젣 ?뚯씪 諛붿씠?덈━ handoff ?щ???FE媛 蹂댁옣?섏? ?딆쓬

### 2.2.3 ?대쾲 FE ?댁뒋??鍮꾩콉??踰붿쐞

?꾩옱 backend runtime?먮뒗 ?꾨옒 ?섎? 李⑥씠媛 ?⑥븘 ?덈떎.

- `FILE_LIST` + `url only` item
- `SINGLE_FILE` + `content: null`

?닿쾬??Google Drive sink?먯꽌 ?ㅼ젣 ?뚯씪 ?ㅼ슫濡쒕뱶/?낅줈?쒕줈 ?꾩쟾???댁뼱吏?붿???backend runtime 梨낆엫?대떎.

FE???대쾲 ?댁뒋?먯꽌 ???숈옉??異붾줎?섍굅??蹂댁젙?섏? ?딅뒗??

---

## 3. ?꾩옱 FE 媛?

?꾩옱 ?꾨줎??援ъ“?먯꽌 ?ㅼ젣濡?鍮꾩뼱 ?덈뒗 吏?먯? ?ㅼ쓬?대떎.

## 3.1 source rollout

`source-rollout.ts`??`canvas_lms`媛 ?녿떎.

寃곌낵:

- catalog???덉뼱???쒖옉 ?몃뱶 picker???몄텧?섏? ?딅뒗??

## 3.2 connect response model

?꾩옱 connect ?묐떟 ??낆? `authUrl`留?媛?뺥븳??

- `OAuthConnectResponse = { authUrl: string }`
- `window.location.assign(result.authUrl)`瑜??꾩젣濡???

寃곌낵:

- `DirectlyConnected` ?묐떟??FE媛 泥섎━?????녿떎.

## 3.3 connect support matrix

?꾩옱 connectable service allowlist???ъ떎??`slack`留?吏?먰븳??

寃곌낵:

- `canvas_lms`
- `google_drive`
- `notion`
- `github`

紐⑤몢 backend??connect 媛?ν빐??FE??unsupported泥섎읆 ?숈옉?쒕떎.

## 3.4 service key -> visual node mapping

?꾩옱 `workflow-node-adapter`??`canvas_lms`瑜?紐⑤Ⅸ??

寃곌낵:

- start node ?앹꽦 ??visual node type??李얠? 紐삵븳??
- backend?먯꽌 ??λ맂 `type = canvas_lms` node瑜?hydrate???뚮룄 presentation???덉젙?곸씠吏 ?딅떎.

## 3.5 presentation / badge / icon layer

?꾩옱 FE??`canvas_lms` ?꾩슜 label/icon/badge媛 ?녿떎.

寃곌낵:

- picker, account, workflow list, dashboard, node title?먯꽌 ?쇨????쒕퉬???쒗쁽???대졄??

## 3.6 `web-scraping` node config ?섎?

?꾩옱 `web-scraping` config???ъ떎??URL scraping ?꾩젣??

- `targetUrl`
- `selector`
- `outputFields`

洹몃윴??`canvas_lms`??媛숈? visual node carrier瑜??곕뜑?쇰룄
?ㅼ젣 config ?섎???`service/source_mode/target`??媛源앸떎.

利?FE??"visual node type"怨?"persisted service semantics"瑜???紐낇솗??遺꾨━?댁빞 ?쒕떎.

---

## 4. ?ㅺ퀎 ?먯튃

## 4.1 ??editor瑜?留뚮뱾吏 ?딅뒗??

`canvas_lms`??source/sink editor 1李?援ъ“ ?꾩뿉 ?밸뒗??

- ?쒖옉 ?몃뱶 flow ?ъ궗??
- auth step ?ъ궗??
- source mode step ?ъ궗??
- target step ?ъ궗??

## 4.2 ??visual node type? ?대쾲 ?댁뒋 踰붿쐞媛 ?꾨땲??

?대쾲 ?댁뒋?먯꽌??`canvas_lms` ?꾩슜 `NodeType`??留뚮뱾吏 ?딅뒗??

?댁쑀:

- ?꾩옱 editor??generic domain node type ?꾩뿉 service key瑜??밸뒗 援ъ“??
- `canvas_lms` 異붽?留뚯쑝濡?taxonomy瑜??ㅼ떆 ?섎늻湲??쒖옉?섎㈃ 踰붿쐞媛 而ㅼ쭊??
- backend persisted contract??service key媛 蹂몄껜?닿퀬, visual type? FE ?쒗쁽 ?덉씠?대떎.

?곕씪???대쾲 ?댁뒋?먯꽌 `canvas_lms`??湲곗〈 `web-scraping` visual node瑜?carrier濡??ъ슜?쒕떎.

## 4.3 connectability??catalog媛 ?꾨땲??verified support matrix濡??먮떒?쒕떎

`auth_required`??"?몄쬆???꾩슂?섎떎"瑜??삵븷 肉?
"吏湲?FE?먯꽌 ?곌껐 ?쒖옉??媛?ν븯??瑜??삵븯吏 ?딅뒗??

FE??蹂꾨룄 support matrix瑜??좎??쒕떎.

- connectable:
  - `slack`
  - `google_drive`
  - `notion`
  - `github`
  - `canvas_lms`
- not yet connectable:
  - `gmail`
  - `google_sheets`
  - `google_calendar`

??allowlist??backend媛 capability endpoint瑜??대젮二쇨린 ?꾧퉴吏 ?좎??섎뒗
?꾩떆 FE ?뺤콉?대떎.

## 4.4 direct connect??redirect flow???덉쇅媛 ?꾨땲??媛숈? connect flow????醫낅쪟??

FE??connect瑜??ㅼ쓬 ??媛吏 以??섎굹濡?泥섎━?쒕떎.

- `redirect`
- `direct`

吏곸젒 ?곌껐? 蹂꾨룄 ?꾩떆 UX媛 ?꾨땲???숈씪??service auth step ?덉뿉??泥섎━?쒕떎.

## 4.5 FE??runtime payload ?섎?瑜?怨쇰?異붾줎?섏? ?딅뒗??

`canvas_lms -> google_drive`媛 editor?먯꽌 ?곌껐 媛?ν븯?ㅻ뒗 ?ъ떎怨?
"?ㅼ젣 ?뚯씪??諛붿씠???⑥쐞濡??낅줈?쒕맂?????ъ떎? ?ㅻⅤ??

?대쾲 ?댁뒋?먯꽌 FE???ㅼ쓬源뚯?留?梨낆엫吏꾨떎.

- source ?좏깮 媛??
- connect 媛??
- mode/target ?ㅼ젙 媛??
- node ???蹂듭썝 媛??
- canonical data type ?먮쫫 ?곌껐 媛??

---

## 5. ?곸꽭 ?ㅺ퀎

## 5.1 Source rollout ?ㅺ퀎

`canvas_lms`瑜?source rollout allowlist??異붽??쒕떎.

異붽? mode:

- `course_files`
- `course_new_file`
- `term_all_files`

### UX ?숈옉

- ?쒖옉 ?몃뱶 service picker?먯꽌 `Canvas LMS` ?몄텧
- auth state ?쒖떆
- mode ?좏깮 吏꾩엯
- target step?먯꽌 湲곗〈 `text_input` ?ъ슜

### target ?낅젰 洹쒖튃

- `course_files`
  - 怨쇰ぉ ID 臾몄옄??
- `course_new_file`
  - 怨쇰ぉ ID 臾몄옄??
- `term_all_files`
  - ?숆린紐?臾몄옄??

???낅젰媛믪? FE媛 ?섎?瑜??댁꽍?섏? ?딄퀬 backend contract string?쇰줈 ??ν븳??

## 5.2 OAuth connect domain model ?ㅺ퀎

### 5.2.1 Raw response

backend raw response???ㅼ쓬 union?대떎.

```ts
type RawOAuthConnectResponse =
  | { authUrl: string }
  | { connected: "true"; service: string };
```

### 5.2.2 FE normalized response

FE ?대??먯꽌???먮퀎 媛?ν븳 union?쇰줈 ?뺢퇋?뷀븳??

```ts
type OAuthConnectResult =
  | { kind: "redirect"; authUrl: string }
  | { kind: "direct"; service: string; connected: true };
```

?뺢퇋??梨낆엫? API layer ?먮뒗 entity adapter???붾떎.
UI??raw map??吏곸젒 ?댁꽍?섏? ?딅뒗??

### 5.2.3 connect action 泥섎━

#### redirect result

- 湲곗〈?濡?`window.location.assign(authUrl)`

#### direct result

- ?꾩옱 ?붾㈃???⑥븘 ?덉쓬
- `useOAuthTokensQuery` refetch
- connected state 諛섏쁺
- ?꾩옱 wizard step???ㅼ쓬 ?④퀎濡?吏꾪뻾

利?direct connect??callback ?섏씠吏瑜?嫄곗튂吏 ?딅뒗??

## 5.3 Auth step UX ?ㅺ퀎

## 5.3.1 ServiceSelectionPanel

start/end auth step?먯꽌 `?곌껐 ?쒖옉` ?대┃ ??

- `redirect`硫??몃?濡??대룞
- `direct`硫?媛숈? panel ?덉뿉???곌껐 ?꾨즺 泥섎━

### direct connect ?깃났 ??next step

- start node
  - `auth -> mode`
- end node
  - `auth -> confirm`

利??ъ슜?먮뒗 `Canvas LMS`瑜??좏깮?섍퀬 ?곌껐 ?쒖옉???꾨Ⅸ ??
釉뚮씪?곗? ?대룞 ?놁씠 諛붾줈 ?ㅼ쓬 ?④퀎濡?媛꾨떎.

## 5.3.2 Account page

Account page??connect 踰꾪듉???숈씪??normalized result瑜??ъ슜?쒕떎.

- `redirect`硫??몃? ?대룞
- `direct`硫??좏겙 refetch ??badge ?곹깭瑜?`CONNECTED`濡??꾪솚

## 5.4 connect support matrix ?ㅺ퀎

?꾩옱 FE support matrix??backend verified connector 踰붿쐞??留욎떠 ?뺤옣?쒕떎.

```ts
const OAUTH_CONNECT_SUPPORTED_SERVICES = [
  "slack",
  "google_drive",
  "notion",
  "github",
  "canvas_lms",
] as const;
```

??媛믪? "OAuth only"媛 ?꾨땲??"FE connect action supported" ?섎?濡??댁꽍?쒕떎.
?대쫫???ㅽ빐瑜?留뚮뱺?ㅻ㈃ ?꾩냽 由ы뙥?곕쭅?먯꽌 `CONNECT_SUPPORTED_SERVICES`濡??쇰컲?뷀븳??
?먰븳 backend媛 connect capability metadata瑜?蹂꾨룄濡??쒓났?섍린 ?꾧퉴吏??
FE媛 吏곸젒 ?좎??섎뒗 ?꾩떆 allowlist濡??붾떎.

## 5.5 workflow node mapping ?ㅺ퀎

## 5.5.1 persisted service key -> visual node type

`workflow-node-adapter`???ㅼ쓬 mapping??異붽??쒕떎.

```ts
canvas_lms -> web-scraping
```

?섎룄:

- backend persisted type? 怨꾩냽 `canvas_lms`
- FE visual node??湲곗〈 `web-scraping` node shell ?ъ궗??

## 5.5.2 persisted start/end node ???洹쒖튃

?꾩옱 援ъ“? ?숈씪?섍쾶:

- persisted `type`? service key
- visual node??FE媛 hydrate ??mapping

利?`canvas_lms`???ㅻⅨ source/sink service? ?숈씪 洹쒖튃???곕Ⅸ??

## 5.5.3 config shape 蹂닿컯

`web-scraping` visual node媛 `canvas_lms`瑜??댁쓣 ???덈룄濡?
service-backed source config ?꾨뱶瑜??덉슜?쒕떎.

理쒖냼 ?꾩슂 ?꾨뱶:

- `service`
- `source_mode`
- `target`
- `canonical_input_type`

援ъ껜?곸쑝濡쒕뒗 `entities/node/model/types.ts`??`WebScrapingNodeConfig`??
?꾨옒 optional ?꾨뱶瑜?異붽??섎뒗 諛⑹떇?쇰줈 ?뺤옣?쒕떎.

```ts
service?: "canvas_lms" | "coupang" | "github" | "naver_news" | "youtube" | null;
source_mode?: string | null;
target?: string | null;
canonical_input_type?: string | null;
```

利??대쾲 蹂寃쎌? `web-scraping`????node taxonomy濡?諛붽씀??寃껋씠 ?꾨땲??
湲곗〈 visual carrier媛 service-backed source???댁쓣 ???덇쾶 typed config瑜?蹂닿컯?섎뒗 ?묒뾽?대떎.

湲곗〈 `targetUrl` ?꾩슜 媛?뺤? presentation layer?먯꽌 fallback?쇰줈留??④릿??

## 5.5.4 hydrate ??service backfill 洹쒖튃

?꾩옱 FE???쇰? start/end service node留?hydrate ??`config.service = node.type`??蹂댁젙?쒕떎.

?대쾲 ?댁뒋?먯꽌??`web-scraping` carrier?먮룄 媛숈? 洹쒖튃???뺤옣?쒕떎.

- 議곌굔:
  - `node.role`??`start` ?먮뒗 `end`
  - frontend visual node type??`web-scraping`
  - `config.service`媛 鍮꾩뼱 ?덉쓬
- ?숈옉:
  - `config.service = node.type`

??洹쒖튃???덉뼱??backend persisted `type = canvas_lms` node瑜?reload???ㅼ뿉??
title / badge / summary媛 ?덉젙?곸쑝濡?蹂듭썝?쒕떎.

## 5.6 node presentation ?ㅺ퀎

## 5.6.1 ?쒕ぉ

`web-scraping` node presentation?먯꽌:

1. `config.service`媛 `canvas_lms`硫?`Canvas LMS`
2. 洹???service-backed source硫?service label
3. ?????놁쑝硫?湲곗〈 `targetUrl`

?쒖꽌濡??쒕ぉ???뺥븳??

## 5.6.2 helper text / summary

`canvas_lms` node??URL scraping helper瑜??곗? ?딅뒗??

????ㅼ쓬 ?곗꽑?쒖쐞濡?summary瑜?蹂댁뿬以??

1. source mode label
2. target 媛?
3. 湲곗〈 generic helper

??

- `?뱀젙 怨쇰ぉ 媛뺤쓽?먮즺 ?꾩껜`
- `怨쇰ぉ ID: 12345`

## 5.6.3 custom node surface

`WebScrapingNode`媛 `targetUrl ?? "URL 誘몄꽕??`留?蹂댁뿬二쇱? ?딅룄濡??섏젙 諛⑺뼢???〓뒗??

`config.service`媛 ?덈뒗 寃쎌슦:

- service label
- source mode / target 以묒떖 summary

瑜??곗꽑 ?뚮뜑?쒕떎.

## 5.7 badge / icon ?ㅺ퀎

## 5.7.1 service picker / account icon

`canvas_lms` ?꾩슜 ?꾩씠肄섏쓣 異붽??쒕떎.

?대쾲 ?댁뒋?먯꽌????asset ?쒖옉蹂대떎 湲곗〈 icon set???숆탳/?숈뒿 怨꾩뿴 ?꾩씠肄섏쓣 ?곗꽑 ?ъ슜?쒕떎.

## 5.7.2 service badge surfaces

workflow list / dashboard / template icon surfaces??service badge key瑜??ъ슜?쒕떎.

?ш린?먮뒗 `canvas-lms` ?꾩슜 badge key瑜?異붽??섎뒗 履쎌쓣 ?곗꽑?쒕떎.

?댁쑀:

- visual node type? `web-scraping` carrier?????덉뼱??
- ?쒕퉬??諛곗???`Canvas LMS`?쇰뒗 ?ㅼ젣 integration identity瑜?蹂댁뿬以섏빞 ?섍린 ?뚮Ц?대떎.

利?

- node shell: `web-scraping`
- backend service key: `canvas_lms`
- FE badge key: `canvas-lms`

濡???븷??遺꾨━?쒕떎.

`getServiceBadgeKeyFromService()`??backend service key `canvas_lms`瑜?諛쏆븘
FE ?쒗쁽 ??`canvas-lms`濡?蹂?섑븳??

## 5.8 sink 諛?runtime guard ?ㅺ퀎

?대쾲 ?댁뒋?먯꽌 FE??`canvas_lms -> google_drive` 寃쎈줈瑜?editor ?섏??먯꽌 留됱? ?딅뒗??

?? ?꾨옒瑜?遺꾨챸???좎??쒕떎.

- sink accepted input type 湲곗? filtering
- backend `nodeStatuses` / save / execute guard 湲곗? ?숈옉
- runtime file handoff ?섎???FE媛 蹂댁젙?섏? ?딆쓬

利?FE??"?곌껐 媛?ν븳 graph瑜?留뚮뱾 ???덈뒗媛"源뚯?留?梨낆엫吏꾨떎.

---

## 6. 援ы쁽 ?④퀎 ?쒖븞

援ы쁽? ?꾨옒 4?④퀎濡??딅뒗??
媛??④퀎??**?묎쾶 癒몄? 媛?ν븳 ?⑥쐞**濡??좎??섍퀬, ?④퀎 醫낅즺 ??而ㅻ컠???④릿??

而ㅻ컠 ?ㅽ??쇱? ?꾩옱 釉뚮옖移??덉뒪?좊━??留욎떠 ?ㅼ쓬 prefix瑜??ъ슜?쒕떎.

- 湲곕뒫 異붽?/吏??踰붿쐞 ?뺤옣: `feat:`
- ?숈옉 蹂댁젙/?뚭? ?섏젙: `fix:`
- 援ъ“ ?뺣━/?섎? ?뺣━: `refactor:`
- 臾몄꽌: `docs:`

## ?④퀎 1. OAuth connect contract ?뺢퇋??

### 紐⑺몴

- backend raw connect ?묐떟??FE domain model濡??덉쟾?섍쾶 ?뺢퇋?뷀븳??
- direct-connect? redirect-connect瑜?媛숈? action ?먮쫫 ?덉뿉???ㅻ０ 以鍮꾨? ?앸궦??

### 沅뚯옣 而ㅻ컠 ?ㅽ???

- `feat: OAuth connect ?묐떟 ?뺢퇋??諛?吏??踰붿쐞 ?뺤옣`

### 泥댄겕由ъ뒪??

- [ ] `entities/oauth-token/api/types.ts`??raw connect ?묐떟 union 異붽?
- [ ] FE ?대??먯꽌 ?ъ슜??normalized `OAuthConnectResult` union ?뺤쓽
- [ ] API layer ?먮뒗 entity adapter?먯꽌 raw -> normalized 蹂??援ы쁽
- [ ] `authUrl`留?媛?뺥븳 ?몄텧遺媛 ??normalized 寃곌낵瑜?諛쏅룄濡?API surface ?뺣━
- [ ] connect support matrix瑜?`slack`, `google_drive`, `notion`, `github`, `canvas_lms`濡??뺤옣
- [ ] `gmail`, `google_sheets`, `google_calendar`??怨꾩냽 unsupported濡??⑤뒗?ㅻ뒗 ???좎?
- [ ] barrel export媛 源⑥?吏 ?딅룄濡?`index.ts` 怨듦컻 API ?뺣━

### 鍮좎?硫????섎뒗 ?뺤씤 ?ъ씤??

- [ ] backend raw ?묐떟??`kind` discriminator媛 ?녿떎???꾩젣瑜?肄붾뱶??諛섏쁺?덈뒗媛
- [ ] direct-connect ?묐떟??`connected: "true"`瑜?boolean `true`濡??뺢퇋?뷀뻽?붽?
- [ ] UI layer媛 raw map shape瑜?吏곸젒 ?댁꽍?섏? ?딄쾶 留됱븯?붽?

## ?④퀎 2. Canvas LMS source rollout + direct-connect UX

### 紐⑺몴

- ?쒖옉 ?몃뱶 picker?먯꽌 `canvas_lms`瑜??ㅼ젣 ?좏깮 媛?ν븯寃??곕떎.
- direct-connect ?쒕퉬?ㅻ? 釉뚮씪?곗? ?대룞 ?놁씠 泥섎━?쒕떎.

### 沅뚯옣 而ㅻ컠 ?ㅽ???

- `feat: canvas_lms source rollout 諛?direct-connect UX 諛섏쁺`

### 泥댄겕由ъ뒪??

- [ ] `source-rollout.ts`??`canvas_lms` 3媛?mode 異붽?
- [ ] source picker icon map??`canvas_lms` 異붽?
- [ ] ServiceSelectionPanel??direct/redirect 寃곌낵瑜?遺꾧린 泥섎━?섎룄濡??섏젙
- [ ] start node auth step?먯꽌 direct-connect ?깃났 ??`auth -> mode`濡?吏꾪뻾
- [ ] end node auth step?먯꽌 direct-connect ?깃났 ??`auth -> confirm`濡?吏꾪뻾
- [ ] Account page connect 踰꾪듉??媛숈? normalized connect 寃곌낵 ?ъ슜
- [ ] direct-connect ?깃났 ??`useOAuthTokensQuery` refetch濡?connected ?곹깭 ?щ룞湲고솕
- [ ] auth error UX媛 redirect/direct ??寃쎌슦 紐⑤몢 ?좎??섎뒗吏 ?뺤씤

### 鍮좎?硫????섎뒗 ?뺤씤 ?ъ씤??

- [ ] `canvas_lms` target step? 湲곗〈 `text_input`??洹몃?濡??ъ궗?⑺븯?붽?
- [ ] direct-connect ?깃났 ??`window.location.assign()`媛 ?몄텧?섏? ?딅뒗媛
- [ ] redirect-connect ?쒕퉬??`slack`, `google_drive`) ?뚭?媛 ?녿뒗媛

## ?④퀎 3. Node mapping / restore / presentation ?뺥빀

### 紐⑺몴

- persisted `type = canvas_lms`? FE visual `web-scraping` carrier瑜??뺣젹?쒕떎.
- reload ?댄썑?먮룄 service identity媛 title/badge/summary???덉젙?곸쑝濡??④쾶 ?쒕떎.

### 沅뚯옣 而ㅻ컠 ?ㅽ???

- `feat: canvas_lms node mapping 諛?presentation ?뺣젹`

### 泥댄겕由ъ뒪??

- [ ] `workflow-node-adapter`??`canvas_lms -> web-scraping` mapping 異붽?
- [ ] `WebScrapingNodeConfig`??service-backed source optional ?꾨뱶 異붽?
- [ ] hydrate ??`web-scraping` carrier?먮룄 `config.service = node.type` backfill 洹쒖튃 異붽?
- [ ] start node ?앹꽦 ??persisted `type = canvas_lms` ????뺤씤
- [ ] `nodePresentation`?먯꽌 `canvas_lms` title / helper / summary 洹쒖튃 諛섏쁺
- [ ] `WebScrapingNode`媛 `targetUrl` ?꾩슜 UI??臾띠씠吏 ?딅룄濡?蹂닿컯
- [ ] picker / account / workflow list / dashboard???쒕퉬???꾩씠肄?諛섏쁺
- [ ] `ServiceBadgeKey`??`canvas-lms` 異붽?
- [ ] `getServiceBadgeKeyFromService()`媛 `canvas_lms -> canvas-lms` 蹂?섑븯?꾨줉 蹂닿컯

### 鍮좎?硫????섎뒗 ?뺤씤 ?ъ씤??

- [ ] ??`NodeType`瑜?留뚮뱾吏 ?딄퀬 湲곗〈 `web-scraping` shell留??ъ궗?⑺븯?붽?
- [ ] reload ??`canvas_lms` node媛 fallback title?대굹 generic web label濡?臾대꼫吏吏 ?딅뒗媛
- [ ] service badge key? backend service key瑜??쇰룞?섏? ?딅룄濡?遺꾨━?덈뒗媛

## ?④퀎 4. Smoke test 諛??뚭? 蹂댁젙

### 紐⑺몴

- editor 湲곗? 二쇱슂 ?먮쫫???ㅼ젣濡??듦낵?쒗궎怨? 諛쒓껄???뚭?瑜??묒? ?섏젙?쇰줈 ?ル뒗??

### 沅뚯옣 而ㅻ컠 ?ㅽ???

- ?뚭?/蹂댁젙 諛쒖깮 ??`fix:` prefix ?ъ슜
- 肄붾뱶 蹂寃쎌씠 ?녿떎硫?鍮?而ㅻ컠? 留뚮뱾吏 ?딅뒗??

### 泥댄겕由ъ뒪??

- [ ] `Canvas LMS`媛 ?쒖옉 ?몃뱶 picker???몄텧?섎뒗吏 ?뺤씤
- [ ] `Canvas LMS` direct-connect ?깃났 ?щ? ?뺤씤
- [ ] start node ?앹꽦 ??persisted `type = canvas_lms` ????뺤씤
- [ ] reload ??`canvas_lms` node title / badge / summary 蹂듭썝 ?뺤씤
- [ ] `google_drive` sink? ?곌껐 媛?ν븳 graph 援ъ꽦 ?뺤씤
- [ ] save ??`nodeStatuses` ?щ룞湲고솕 ?뺤씤
- [ ] execute guard媛 湲곗〈 洹쒖튃?濡??숈옉?섎뒗吏 ?뺤씤
- [ ] `slack`, `google_drive` redirect-connect ?뚭? ?뺤씤
- [ ] `pnpm build` ?듦낵 ?뺤씤

### 理쒖냼 ?뺤씤 寃쎈줈

1. `Canvas LMS` source picker ?몄텧
2. direct connect ?깃났
3. start node ?앹꽦 / ???
4. reload ??`canvas_lms` node 蹂듭썝
5. `google_drive` sink ?곌껐
6. save / execute guard ?숈옉 ?뺤씤

---

## 7. 踰붿쐞 ?쒖쇅

- `canvas_lms` ?꾩슜 ??visual node type ?ㅺ퀎
- runtime?먯꽌 Canvas URL???ㅼ젣 諛붿씠?덈━ ?뚯씪濡?蹂?섑븯??濡쒖쭅
- Gmail / Google Sheets / Google Calendar connector 異붽?
- capability endpoint 湲곕컲 ?숈쟻 connectability 怨꾩궛

---

## 8. ?꾨즺 議곌굔

- FE source picker?먯꽌 `canvas_lms`媛 ?몄텧?쒕떎
- `canvas_lms`??direct-connect ?쒕퉬?ㅻ줈 FE?먯꽌 ?뺤긽 ?곌껐?쒕떎
- start node ?앹꽦 ??`type = canvas_lms`濡???λ맂??
- reload ??`canvas_lms` node媛 ?섎룄??visual node? title濡?蹂듭썝?쒕떎
- account / workflow list / dashboard?먯꽌 `canvas_lms` service identity媛 ?쇨??섍쾶 蹂댁씤??
- FE媛 direct-connect? redirect-connect瑜?紐⑤몢 吏?먰븳??
- runtime file handoff ?섎???FE?먯꽌 怨쇰?異붾줎?섏? ?딅뒗??

---

## 9. ??以??붿빟

?대쾲 ?댁뒋??FE ?ㅺ퀎??
`canvas_lms`瑜???editor 援ъ“濡??ㅼ떆 留뚮뱶??寃껋씠 ?꾨땲??
**湲곗〈 source/sink editor ?꾩뿉 `canvas_lms` source? direct-connect contract瑜??뺥솗???밴퀬, service key 湲곕컲 restore/presentation源뚯? ?뺣젹?섎뒗 ?묒뾽**?대떎.

---

## 10. `course_new_file` 실제 런타임 동작과 후속 수정

### 10.1 현재 실제 동작

현재 `canvas_lms`의 `course_new_file`은 이름과 달리 "새 자료 업로드 이벤트"를 직접 감지하지 않는다.
FastAPI runtime은 실행 시마다 대상 과목의 최신 파일 1개를 다시 조회한다.

현재 코드 기준 동작은 아래와 같다.

1. `InputNodeStrategy._fetch_canvas_lms()`가 `course_new_file` 모드에서 `CanvasLmsService.get_course_latest_file(token, course_id)`를 호출한다.
2. `CanvasLmsService.get_course_latest_file()`는 아래 Canvas API를 호출한다.

```http
GET /courses/{course_id}/files?sort=created_at&order=desc&per_page=1
```

3. 응답에서 가장 최근 파일 1개만 골라 `SINGLE_FILE` payload로 반환한다.
4. 반환 payload에는 파일 본문이 아니라 `filename`, `mime_type`, `url` 중심 메타데이터가 들어간다.
5. 이전 실행에서 이미 처리한 파일인지 비교하는 checkpoint가 없기 때문에, 같은 최신 파일이 반복 실행마다 다시 반환될 수 있다.

정리하면, 현재 `course_new_file`의 실제 의미는 다음에 가깝다.

- 문서상 기대: `과목에 새 자료가 올라올 때`
- 현재 런타임 실제 의미: `해당 과목의 최신 파일 1개 조회`

즉 현재 FE에서 이 mode를 노출할 수는 있지만, 사용자가 기대하는 "새 자료가 생겼을 때만 반응"하는 이벤트형 semantics와는 차이가 있다.

### 10.2 현재 구조의 한계

현재 구조에서는 아래 문제가 남아 있다.

- 새 파일 여부를 판단하는 `last_seen_file_id` 또는 `last_seen_created_at` 저장이 없다.
- 같은 최신 파일을 여러 번 실행해도 중복 감지가 없다.
- Canvas webhook 또는 Live Events 기반 push trigger가 없다.
- downstream이 실제 파일 본문을 기대할 경우 `url only` payload 한계가 있다.

따라서 지금 상태에서 `course_new_file`은 엄밀한 의미의 event trigger가 아니라, polling 없이 수동 실행 시 최신 파일을 가져오는 source에 가깝다.

### 10.3 FE 관점 권장 대응

백엔드 구조가 바뀌기 전까지 FE는 아래 기준으로 안내하는 것이 안전하다.

1. mode label은 유지하더라도, 도움말이나 설명 문구에서 현재는 최신 파일 1개 조회 방식임을 명시한다.
2. 실행 결과가 중복될 수 있음을 사용자에게 안내한다.
3. 템플릿이나 시나리오 설명에서 "실시간 업로드 감지"처럼 과장된 표현은 피한다.

예시 문구:

- `현재는 과목의 최신 강의자료 1개를 조회하는 방식으로 동작합니다.`
- `동일한 최신 파일이 다음 실행에도 다시 처리될 수 있습니다.`

### 10.4 백엔드에서 수정되어야 할 방향

`course_new_file`을 실제 이름에 맞는 기능으로 만들려면, 백엔드에서 아래 중 하나가 필요하다.

#### 1. Polling + checkpoint 방식

가장 현실적인 1차 수정안이다.

- workflow/source별 `last_seen_file_id` 또는 `last_seen_created_at` 저장
- 실행 시 최신 파일 1개 조회
- 이전 checkpoint와 같으면 no-op
- 다르면 처리 후 checkpoint 갱신

이 방식이면 FE 표현을 유지하면서도 실제로는 "새 파일일 때만 처리"에 가까운 동작을 만들 수 있다.

#### 2. Canvas webhook / Live Events 방식

더 이상적인 2차 수정안이다.

- Canvas의 파일/첨부 생성 이벤트 수신
- workflow target course와 매칭
- event id 또는 attachment id 기준 dedupe
- 해당 파일만 downstream으로 전달

이 방식은 진짜 event-driven semantics를 제공하지만, 인프라와 연동 비용이 더 크다.

### 10.5 최종 권장안

단기적으로는 아래 조합이 가장 현실적이다.

- FE: 현재 semantics를 분명히 안내
- FastAPI/Spring: polling + checkpoint 방식 도입

장기적으로는 아래 방향이 가장 이상적이다.

- FE: `새 자료 감지` UX 유지
- 백엔드: Canvas event 기반 trigger 또는 stateful polling runtime 도입

현재 문서 기준으로 `course_new_file`은 FE direct-connect와 picker 연결은 완료되었지만, runtime semantics는 아직 후속 백엔드 보완이 필요한 상태로 본다.
