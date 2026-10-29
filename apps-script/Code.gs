/**
 * 手作攤收銀 —— Google 試算表／Drive 後端
 *
 * 一、先準備兩樣東西
 *   1. 一份空白 Google 試算表。網址 /d/ 後面那一長串就是 SHEET_ID
 *   2. Google Drive 裡一個資料夾放照片。打開資料夾，網址最後那一段就是 FOLDER_ID
 *
 * 二、貼上這份程式碼
 *   script.google.com -> 新增專案 -> 把這整份貼進 Code.gs -> 存檔
 *
 * 三、填指令碼屬性（左邊齒輪「專案設定」-> 指令碼屬性 -> 新增）
 *   TOKEN      自己想一串長一點的英數字，App 的設定頁要填一樣的
 *   SHEET_ID   上面第 1 點那串
 *   FOLDER_ID  上面第 2 點那串
 *
 * 四、部署
 *   右上「部署」-> 新增部署作業 -> 類型選「網頁應用程式」
 *   說明：隨便寫；執行身分：我；誰可以存取：任何人
 *   按部署，第一次會要你授權（因為它要寫你的試算表和 Drive）
 *   複製 /exec 結尾的網址，貼進 App 的「設定 -> Google 雲端同步」
 *
 * 五、之後每次改這份程式碼，都要再「部署 -> 管理部署作業 -> 編輯 -> 新版本」，
 *     不然線上跑的還是舊的。網址不會變。
 */

var SHEET_NAME = "sales";
var HEADERS = ["id", "日期時間", "品項", "金額", "收款方式", "備註", "payKey", "照片"];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var props = PropertiesService.getScriptProperties();
    var want = props.getProperty("TOKEN");
    if (!want) return json({ ok: false, error: "後端還沒設 TOKEN（指令碼屬性）" });
    if (body.token !== want) return json({ ok: false, error: "金鑰不對" });

    if (body.action === "ping")  return json({ ok: true, msg: "連上了，後端設定正常" });
    if (body.action === "push")  return json(push(body.sales || [], props));
    if (body.action === "photo") return json(photo(body, props));
    if (body.action === "pull")  return json(pull(props));
    return json({ ok: false, error: "不認識的動作：" + body.action });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/** 直接用瀏覽器打開 /exec 時給一句話，方便確認部署成功。 */
function doGet() {
  return json({ ok: true, msg: "後端活著。請回 App 的設定頁按「測試連線」。" });
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
}

function sheet(props) {
  var id = props.getProperty("SHEET_ID");
  if (!id) throw new Error("後端還沒設 SHEET_ID");
  var ss = SpreadsheetApp.openById(id);
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange("B:B").setNumberFormat("yyyy/mm/dd hh:mm");
    sh.getRange("D:D").setNumberFormat("#,##0");
  }
  return sh;
}

/** id -> 列號，用來判斷是新增還是更新。 */
function rowMap(sh) {
  var map = {};
  var n = sh.getLastRow();
  if (n < 2) return map;
  var ids = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] !== "") map[String(ids[i][0])] = i + 2;
  }
  return map;
}

function push(list, props) {
  var sh = sheet(props);
  var map = rowMap(sh);
  var appends = [], updated = 0;
  for (var i = 0; i < list.length; i++) {
    var s = list[i];
    if (!s || !s.id) continue;
    var row = [
      String(s.id),
      new Date(Number(s.ts)),
      String(s.cat || ""),
      Number(s.amount) || 0,
      String(s.pay || ""),
      String(s.note || ""),
      String(s.payKey || ""),
      s.hasPhoto ? "有" : ""
    ];
    if (map[String(s.id)]) {
      var r = map[String(s.id)];
      var had = String(sh.getRange(r, 8).getValue() || "");
      if (had.indexOf("http") === 0) row[7] = had;      // 別把已經寫好的 Drive 連結蓋掉
      sh.getRange(r, 1, 1, HEADERS.length).setValues([row]);
      updated++;
    } else {
      appends.push(row);
    }
  }
  if (appends.length) {
    sh.getRange(sh.getLastRow() + 1, 1, appends.length, HEADERS.length).setValues(appends);
  }
  return { ok: true, added: appends.length, updated: updated };
}

function photo(body, props) {
  var fid = props.getProperty("FOLDER_ID");
  if (!fid) throw new Error("後端還沒設 FOLDER_ID");
  var folder = DriveApp.getFolderById(fid);
  var parts = String(body.dataUrl || "").split(",");
  if (parts.length < 2) throw new Error("照片資料不完整");
  var name = String(body.id) + ".jpg";
  var old = folder.getFilesByName(name);
  while (old.hasNext()) old.next().setTrashed(true);   // 重傳就換掉舊的
  var blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), "image/jpeg", name);
  var f = folder.createFile(blob);

  // 把連結寫回試算表的「照片」欄，這樣別台裝置拉回紀錄時點得開
  try {
    var sh = sheet(props);
    var r = rowMap(sh)[String(body.id)];
    if (r) sh.getRange(r, 8).setValue(f.getUrl());
  } catch (err) { /* 寫不進去不影響照片本身已經存好 */ }

  return { ok: true, fileId: f.getId(), url: f.getUrl() };
}

function pull(props) {
  var sh = sheet(props);
  var n = sh.getLastRow();
  if (n < 2) return { ok: true, sales: [] };
  var v = sh.getRange(2, 1, n - 1, HEADERS.length).getValues();
  var out = [];
  for (var i = 0; i < v.length; i++) {
    if (v[i][0] === "") continue;
    var pic = String(v[i][7] || "");
    out.push({
      id: String(v[i][0]),
      ts: new Date(v[i][1]).getTime(),
      cat: String(v[i][2]),
      amount: Number(v[i][3]) || 0,
      note: String(v[i][5] || ""),
      payKey: String(v[i][6] || "cash"),
      photoUrl: pic.indexOf("http") === 0 ? pic : ""
    });
  }
  return { ok: true, sales: out };
}
